import React from 'react';
import type { OutlineNode } from '../../db/indexedDB';
import { check5W1H, checkKeywordChaining } from '../../utils/analyzer';
import { validateOutlineTree } from '../../utils/outlineRules';
import { ShieldCheck, AlertCircle, Eye, EyeOff, Sparkles, Hash } from 'lucide-react';

interface AnalysisSidebarProps {
  nodes: OutlineNode[];
  colorTaggingEnabled: boolean;
  onColorTaggingToggle: (enabled: boolean) => void;
  showStructureLine: boolean;
  onShowStructureLineToggle: (enabled: boolean) => void;
  onFocusLine: (id: string) => void;
  maxLevel?: number;
}

export const AnalysisSidebar: React.FC<AnalysisSidebarProps> = ({
  nodes,
  colorTaggingEnabled,
  onColorTaggingToggle,
  showStructureLine,
  onShowStructureLineToggle,
  onFocusLine,
  maxLevel = 12,
}) => {
  // 1. Gather all violations
  const structureErrors = validateOutlineTree(nodes, maxLevel - 1);
  const chainingViolations = checkKeywordChaining(nodes);
  
  const syntaxErrors: { index: number; nodeId: string; message: string }[] = [];
  nodes.forEach((node, idx) => {
    const check = check5W1H(node.text, node.type);
    if (check && !check.isValid) {
      syntaxErrors.push({
        index: idx,
        nodeId: node.id,
        message: check.message,
      });
    }
  });

  const totalWarnings = structureErrors.length + syntaxErrors.length + Object.keys(chainingViolations).length;

  return (
    <aside className="w-80 flex-shrink-0 flex flex-col gap-5 sticky top-8 h-fit">
      
      {/* Configuration Option */}
      <div className="glass rounded-2xl p-5 border border-slate-200 dark:border-slate-850 flex flex-col gap-3.5 shadow-sm">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5 select-none">
          <Sparkles className="w-4 h-4 text-purple-500" />
          Editor Options
        </h3>
        
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-3">
          <div className="flex flex-col gap-0.5 select-none">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Color Tagging
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-550">
              Highlight matching keywords
            </span>
          </div>
          <button
            type="button"
            onClick={() => onColorTaggingToggle(!colorTaggingEnabled)}
            className={`p-1.5 rounded-lg border transition-all ${
              colorTaggingEnabled
                ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/40 text-purple-600 dark:text-purple-400'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-650'
            }`}
            title={colorTaggingEnabled ? 'Disable Color Tagging' : 'Enable Color Tagging'}
          >
            {colorTaggingEnabled ? <Eye className="w-4.5 h-4.5" /> : <EyeOff className="w-4.5 h-4.5" />}
          </button>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-3">
          <div className="flex flex-col gap-0.5 select-none">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Show Structure Line
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-550">
              Show connection between hierarchy
            </span>
          </div>
          <button
            type="button"
            onClick={() => onShowStructureLineToggle(!showStructureLine)}
            className={`p-1.5 rounded-lg border transition-all ${
              showStructureLine
                ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/40 text-purple-600 dark:text-purple-400'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-650'
            }`}
            title={showStructureLine ? 'Disable Structure Line' : 'Enable Structure Line'}
          >
            {showStructureLine ? <Eye className="w-4.5 h-4.5" /> : <EyeOff className="w-4.5 h-4.5" />}
          </button>
        </div>
      </div>

      {/* Diagnostics Panel */}
      <div className="glass rounded-2xl p-5 border border-slate-200 dark:border-slate-850 flex-grow flex flex-col gap-4 shadow-sm min-h-[300px]">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5 select-none">
          <Hash className="w-4 h-4 text-purple-500" />
          Real-time diagnostics
        </h3>

        {/* Global Summary Badge */}
        {totalWarnings === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl px-4 text-center select-none">
            <ShieldCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mb-1.5" />
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Outline Validated</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-500 mt-0.5 leading-relaxed">
              No structural errors or keyword violations detected in your outline.
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl select-none">
            <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-500 flex-shrink-0" />
            <div>
              <span className="block text-xs font-bold text-amber-800 dark:text-amber-400">
                {totalWarnings} Warnings Found
              </span>
              <span className="block text-[9px] text-amber-600 dark:text-amber-500/90 mt-0.5 leading-normal">
                Click any card to focus the corresponding element in the outline sheet.
              </span>
            </div>
          </div>
        )}

        {/* Warnings list container */}
        {totalWarnings > 0 && (
          <div className="flex-grow overflow-y-auto pr-1 flex flex-col gap-2 max-h-[320px]">
            
            {/* Structural Errors */}
            {structureErrors.map((err, idx) => (
              <button
                key={`struct-${idx}`}
                onClick={() => onFocusLine(err.nodeId)}
                className="w-full text-left p-3 rounded-xl bg-rose-50/25 dark:bg-rose-950/10 border border-rose-100/50 dark:border-rose-900/25 hover:border-rose-300 dark:hover:border-rose-800/60 shadow-sm flex flex-col gap-1 transition-all"
              >
                <div className="flex justify-between items-center text-[9px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide">
                  <span>Line #{err.index + 1}</span>
                  <span className="bg-rose-100 dark:bg-rose-950/50 px-1.5 py-0.5 rounded">Structure</span>
                </div>
                <p className="text-[11px] text-slate-655 dark:text-slate-350 leading-relaxed mt-0.5 font-medium">
                  {err.message}
                </p>
              </button>
            ))}

            {/* Syntax Errors (5W1H) */}
            {syntaxErrors.map((err, idx) => (
              <button
                key={`syntax-${idx}`}
                onClick={() => onFocusLine(err.nodeId)}
                className="w-full text-left p-3 rounded-xl bg-amber-50/25 dark:bg-amber-950/10 border border-amber-100/50 dark:border-amber-900/25 hover:border-amber-300 dark:hover:border-amber-800/60 shadow-sm flex flex-col gap-1 transition-all"
              >
                <div className="flex justify-between items-center text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                  <span>Line #{err.index + 1}</span>
                  <span className="bg-amber-100 dark:bg-amber-950/50 px-1.5 py-0.5 rounded">Formulation</span>
                </div>
                <p className="text-[11px] text-slate-655 dark:text-slate-350 leading-relaxed mt-0.5 font-medium">
                  {err.message}
                </p>
              </button>
            ))}

            {/* Chaining Errors */}
            {Object.keys(chainingViolations).map((id, idx) => {
              const nodeIdx = nodes.findIndex((n) => n.id === id);
              return (
                <button
                  key={`chain-${idx}`}
                  onClick={() => onFocusLine(id)}
                  className="w-full text-left p-3 rounded-xl bg-orange-50/25 dark:bg-orange-950/10 border border-orange-100/50 dark:border-orange-900/25 hover:border-orange-300 dark:hover:border-orange-850/60 shadow-sm flex flex-col gap-1 transition-all"
                >
                  <div className="flex justify-between items-center text-[9px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wide">
                    <span>Line #{nodeIdx + 1}</span>
                    <span className="bg-orange-100 dark:bg-orange-950/50 px-1.5 py-0.5 rounded">Chaining</span>
                  </div>
                  <p className="text-[11px] text-slate-655 dark:text-slate-350 leading-relaxed mt-0.5 font-medium">
                    {chainingViolations[id]}
                  </p>
                </button>
              );
            })}

          </div>
        )}
      </div>

    </aside>
  );
};
