import React, { useEffect, useRef, useState } from 'react';
import type { OutlineNode } from '../../db/indexedDB';
import { OutlineLineItem } from './OutlineLineItem';
import { canIndent, canOutdent, getNodeTypeForDepth, validateOutlineTree } from '../../utils/outlineRules';
import { check5W1H, checkKeywordChaining } from '../../utils/analyzer';
import { Plus, ListTodo, Maximize2, Minimize2, ShieldCheck, AlertCircle, Eye, EyeOff, ChevronUp, ChevronDown } from 'lucide-react';

interface OutlineEditorProps {
  nodes: OutlineNode[];
  colorTaggingEnabled: boolean;
  onColorTaggingToggle?: (enabled: boolean) => void;
  keywordColors: { [word: string]: string };
  focusedIndex: number | null;
  setFocusedIndex: (index: number | null) => void;
  onNodesChange: (newNodes: OutlineNode[]) => void;
  maxLevel?: number;
  editorLineSpacing?: number;
  editorLineHeight?: number;
  editorIndentSpacing?: number;
  editorLevelLineSpacing?: { [level: number]: number };
  editorLevelLineHeight?: { [level: number]: number };
  editorLevelIndentSpacing?: { [level: number]: number };
}

export const OutlineEditor: React.FC<OutlineEditorProps> = ({
  nodes,
  colorTaggingEnabled,
  onColorTaggingToggle,
  keywordColors,
  focusedIndex,
  setFocusedIndex,
  onNodesChange,
  maxLevel = 12,
  editorLineSpacing = 1.5,
  editorLineHeight = 1.4,
  editorIndentSpacing = 24,
  editorLevelLineSpacing,
  editorLevelLineHeight,
  editorLevelIndentSpacing,
}) => {
  const maxDepth = maxLevel - 1;
  const containerRef = useRef<HTMLDivElement>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [diagnosticsCollapsed, setDiagnosticsCollapsed] = useState<boolean | null>(null);

  // Diagnostics calculations
  const structureErrors = validateOutlineTree(nodes, maxDepth);
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
  const isCollapsed = diagnosticsCollapsed !== null ? diagnosticsCollapsed : (totalWarnings === 0);

  const prevWarningsCountRef = useRef(0);
  useEffect(() => {
    if (totalWarnings > prevWarningsCountRef.current && totalWarnings > 0) {
      setDiagnosticsCollapsed(false);
    }
    prevWarningsCountRef.current = totalWarnings;
  }, [totalWarnings]);

  // Focus utility to programmatically focus the active input element
  useEffect(() => {
    if (focusedIndex !== null && nodes[focusedIndex]) {
      const activeEl = document.getElementById(`line-${nodes[focusedIndex].id}`);
      if (activeEl) {
        (activeEl as HTMLInputElement).focus();
      }
    }
  }, [focusedIndex, nodes]);

  const handleTextChange = (id: string, text: string) => {
    const updated = nodes.map((node) => {
      if (node.id === id) {
        return { ...node, text };
      }
      return node;
    });
    onNodesChange(updated);
  };

  const handleIndent = (index: number) => {
    if (!canIndent(nodes, index, maxDepth)) return;
    
    const updated = [...nodes];
    const node = { ...updated[index] };
    node.depth += 1;
    node.type = getNodeTypeForDepth(node.depth); // Auto map type to depth rules
    updated[index] = node;
    onNodesChange(updated);
  };

  const handleOutdent = (index: number) => {
    if (!canOutdent(nodes, index)) return;

    const updated = [...nodes];
    const node = { ...updated[index] };
    node.depth -= 1;
    node.type = getNodeTypeForDepth(node.depth); // Auto map type to depth rules
    updated[index] = node;
    onNodesChange(updated);
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const updated = [...nodes];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    onNodesChange(updated);
    setFocusedIndex(index - 1);
  };

  const handleMoveDown = (index: number) => {
    if (index >= nodes.length - 1) return;
    const updated = [...nodes];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    onNodesChange(updated);
    setFocusedIndex(index + 1);
  };

  const handleAddSectionAtBottom = () => {
    const newSection: OutlineNode = {
      id: crypto.randomUUID(),
      type: 'section',
      text: '',
      depth: 0,
    };
    onNodesChange([...nodes, newSection]);
    setFocusedIndex(nodes.length);
  };

  const handleDelete = (index: number) => {
    const updated = nodes.filter((_, idx) => idx !== index);
    onNodesChange(updated);

    // Shift focus
    if (updated.length === 0) {
      setFocusedIndex(null);
    } else {
      setFocusedIndex(Math.max(0, index - 1));
    }
  };

  const handleAddSiblingNode = (index: number, type: 'section' | 'topic' | 'question' | 'answer') => {
    const activeNode = nodes[index];
    let targetDepth = activeNode.depth;

    // Adjust target depth based on requested type
    if (type === 'section') targetDepth = 0;
    else if (type === 'topic') targetDepth = 1;
    else if (type === 'question') {
      targetDepth = activeNode.type === 'topic' ? 2 : activeNode.type === 'answer' ? Math.min(maxDepth, activeNode.depth + 1) : activeNode.depth;
    } else if (type === 'answer') {
      targetDepth = activeNode.type === 'question' ? Math.min(maxDepth, activeNode.depth + 1) : activeNode.depth;
    }

    const newNode: OutlineNode = {
      id: crypto.randomUUID(),
      type: getNodeTypeForDepth(targetDepth),
      text: '',
      depth: targetDepth,
    };

    // Find the end of the subtree for the active node
    let insertIndex = index;
    while (insertIndex + 1 < nodes.length && nodes[insertIndex + 1].depth > activeNode.depth) {
      insertIndex++;
    }

    const updated = [...nodes];
    updated.splice(insertIndex + 1, 0, newNode);
    onNodesChange(updated);
    setFocusedIndex(insertIndex + 1);
  };

  const handleAddFirstNode = () => {
    const firstNode: OutlineNode = {
      id: crypto.randomUUID(),
      type: 'section',
      text: '',
      depth: 0,
    };
    onNodesChange([firstNode]);
    setFocusedIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, index: number) => {
    const currentNode = nodes[index];

    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        handleOutdent(index);
      } else {
        handleIndent(index);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Add smart next sibling
      let nextType: 'section' | 'topic' | 'question' | 'answer' = currentNode.type;
      
      // Smart type guessing
      if (currentNode.type === 'section') nextType = 'topic';
      else if (currentNode.type === 'topic') nextType = 'question';
      else if (currentNode.type === 'question') nextType = 'answer';
      
      handleAddSiblingNode(index, nextType);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (e.altKey) {
        handleMoveUp(index);
      } else if (index > 0) {
        setFocusedIndex(index - 1);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (e.altKey) {
        handleMoveDown(index);
      } else if (index < nodes.length - 1) {
        setFocusedIndex(index + 1);
      }
    } else if (e.key === 'Backspace' && currentNode.text === '') {
      e.preventDefault();
      handleDelete(index);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setFocusedIndex(null);
      (e.target as HTMLTextAreaElement).blur();
    }
  };

  const renderFloatingDock = () => {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 select-none">
        {/* Expanded Warning Popup */}
        {!isCollapsed && totalWarnings > 0 && (
          <div
          className="w-80 max-h-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-slate-200/80 dark:border-slate-800/60 rounded-2xl shadow-2xl p-4 flex flex-col gap-2 transition-all animate-in fade-in slide-in-from-bottom-4 duration-200"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-550">
                Real-time warnings
              </span>
              <button
                type="button"
                onClick={() => setDiagnosticsCollapsed(true)}
                className="text-[10px] font-bold text-slate-500 hover:text-slate-750 dark:text-slate-450 dark:hover:text-slate-250 cursor-pointer flex items-center gap-0.5"
              >
                <ChevronDown className="w-3 h-3" />
                Collapse
              </button>
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto pr-1">
              {/* Structural Errors */}
              {structureErrors.map((err, idx) => (
                <button
                  key={`struct-fs-${idx}`}
                  onClick={() => {
                    const el = document.getElementById(`line-${err.nodeId}`);
                    if (el) {
                      el.focus();
                      setFocusedIndex(err.index);
                    }
                  }}
                  className="w-full text-left p-2.5 rounded-lg bg-rose-50/25 dark:bg-rose-950/10 border border-rose-100/50 dark:border-rose-900/25 hover:border-rose-350 dark:hover:border-rose-800/60 shadow-sm flex flex-col gap-0.5 transition-all text-xs cursor-pointer"
                >
                  <div className="flex justify-between items-center text-[9px] font-bold text-rose-600 dark:text-rose-450 uppercase tracking-wide">
                    <span>Line #{err.index + 1}</span>
                    <span className="bg-rose-100 dark:bg-rose-950/50 px-1 rounded">Structure</span>
                  </div>
                  <p className="text-[10px] text-slate-655 dark:text-slate-350 font-medium mt-0.5 leading-relaxed">
                    {err.message}
                  </p>
                </button>
              ))}

              {/* Syntax Errors (5W1H) */}
              {syntaxErrors.map((err, idx) => (
                <button
                  key={`syntax-fs-${idx}`}
                  onClick={() => {
                    const el = document.getElementById(`line-${err.nodeId}`);
                    if (el) {
                      el.focus();
                      setFocusedIndex(err.index);
                    }
                  }}
                  className="w-full text-left p-2.5 rounded-lg bg-amber-50/25 dark:bg-amber-950/10 border border-amber-100/50 dark:border-amber-900/25 hover:border-amber-350 dark:hover:border-amber-800/60 shadow-sm flex flex-col gap-0.5 transition-all text-xs cursor-pointer"
                >
                  <div className="flex justify-between items-center text-[9px] font-bold text-amber-600 dark:text-amber-450 uppercase tracking-wide">
                    <span>Line #{err.index + 1}</span>
                    <span className="bg-amber-100 dark:bg-amber-950/50 px-1 rounded">Formulation</span>
                  </div>
                  <p className="text-[10px] text-slate-655 dark:text-slate-350 font-medium mt-0.5 leading-relaxed">
                    {err.message}
                  </p>
                </button>
              ))}

              {/* Chaining Errors */}
              {Object.keys(chainingViolations).map((id, idx) => {
                const nodeIdx = nodes.findIndex((n) => n.id === id);
                return (
                  <button
                    key={`chain-fs-${idx}`}
                    onClick={() => {
                      const el = document.getElementById(`line-${id}`);
                      if (el) {
                        el.focus();
                        setFocusedIndex(nodeIdx);
                      }
                    }}
                    className="w-full text-left p-2.5 rounded-lg bg-orange-50/25 dark:bg-orange-950/10 border border-orange-100/50 dark:border-orange-900/25 hover:border-orange-305 dark:hover:border-orange-850/60 shadow-sm flex flex-col gap-0.5 transition-all text-xs cursor-pointer"
                  >
                    <div className="flex justify-between items-center text-[9px] font-bold text-orange-600 dark:text-orange-450 uppercase tracking-wide">
                      <span>Line #{nodeIdx + 1}</span>
                      <span className="bg-orange-100 dark:bg-orange-950/50 px-1 rounded">Chaining</span>
                    </div>
                    <p className="text-[10px] text-slate-655 dark:text-slate-350 font-medium mt-0.5 leading-relaxed">
                      {chainingViolations[id]}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Floating Toolbar Controls */}
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-2xl shadow-2xl">
          {/* Highlights toggle */}
          <button
            type="button"
            onClick={() => onColorTaggingToggle?.(!colorTaggingEnabled)}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              colorTaggingEnabled
                ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/40 text-purple-600 dark:text-purple-400'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
            title={colorTaggingEnabled ? 'Disable Color Highlights' : 'Enable Color Highlights'}
          >
            {colorTaggingEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          {/* Diagnostics toggle pill */}
          <button
            type="button"
            onClick={() => {
              if (totalWarnings > 0) {
                setDiagnosticsCollapsed(!isCollapsed);
              }
            }}
            className={`px-3 py-1.5 rounded-xl border font-bold text-xs transition-all flex items-center gap-1.5 ${
              totalWarnings === 0
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 cursor-default'
                : isCollapsed
                ? 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900 text-amber-600 dark:text-amber-400 cursor-pointer shadow-sm'
                : 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500 cursor-pointer shadow-inner'
            }`}
          >
            {totalWarnings === 0 ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Outline Valid</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4" />
                <span>{totalWarnings} Warnings</span>
                {isCollapsed ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
              </>
            )}
          </button>

          {/* Exit Fullscreen */}
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm cursor-pointer"
            title="Exit Fullscreen"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const editorSheetContent = (
    <>
      {/* Editor Sheet header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800 pb-6 mb-8 gap-4 select-none">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-350 dark:text-slate-600">
            Document Outline Sheet
          </span>
          {isFullscreen && nodes.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[11px] text-slate-400 dark:text-slate-555">
              <span>
                Total Outline Elements: <strong className="text-slate-750 dark:text-slate-300 font-bold">{nodes.length}</strong>
              </span>
              <span className="hidden md:inline text-slate-350 dark:text-slate-700">|</span>
              <span>
                Press <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-mono text-slate-500 dark:text-slate-400">Tab</kbd> to indent, <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-mono text-slate-500 dark:text-slate-400">Shift+Tab</kbd> to outdent, <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-mono text-slate-500 dark:text-slate-400">Alt+↑/↓</kbd> to move line
              </span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer self-start sm:self-center"
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {nodes.length === 0 ? (
        <div className="flex-grow flex flex-col items-center justify-center py-20 text-slate-405 dark:text-slate-500 text-center gap-4">
          <ListTodo className="w-16 h-16 stroke-1 text-purple-400 dark:text-purple-500/50" />
          <div>
            <h3 className="font-bold text-slate-700 dark:text-slate-300">Empty Outline Editor</h3>
            <p className="text-xs text-slate-500 dark:text-slate-450 mt-1 max-w-xs">
              Every document outline must start with a Section header at depth level 0.
            </p>
          </div>
          <button
            onClick={handleAddFirstNode}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Initialize First Section
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 flex-grow" onMouseDown={() => setFocusedIndex(null)}>
          {nodes.map((node, index) => (
            <OutlineLineItem
              key={node.id}
              node={node}
              index={index}
              isActive={focusedIndex === index}
              canIndent={canIndent(nodes, index, maxDepth)}
              canOutdent={canOutdent(nodes, index)}
              colorTaggingEnabled={colorTaggingEnabled}
              keywordColors={keywordColors}
              onTextChange={handleTextChange}
              onIndent={handleIndent}
              onOutdent={handleOutdent}
              onDelete={handleDelete}
              onAddSiblingNode={handleAddSiblingNode}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              isFirstLine={index === 0}
              isLastLine={index === nodes.length - 1}
              onFocus={setFocusedIndex}
              onKeyDown={handleKeyDown}
              editorLineSpacing={editorLevelLineSpacing?.[node.depth] ?? editorLineSpacing}
              editorLineHeight={editorLevelLineHeight?.[node.depth] ?? editorLineHeight}
              editorIndentSpacing={editorLevelIndentSpacing?.[node.depth] ?? editorIndentSpacing}
            />
          ))}
          
          <button
            onClick={handleAddSectionAtBottom}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-slate-300 dark:border-slate-700 hover:border-purple-500 hover:text-purple-600 dark:hover:text-purple-400 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 transition-all w-fit mt-3 self-center sm:self-start cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Section at Bottom
          </button>
        </div>
      )}

      {/* Editor details bar */}
      {!isFullscreen && nodes.length > 0 && (
        <div className="sticky bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-t border-slate-100 dark:border-slate-800 -mx-8 sm:-mx-12 -mb-8 sm:-mb-12 px-8 sm:px-12 py-4 mt-8 z-10 flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-550 rounded-b-2xl select-none">
          <span>
            Total Outline Elements: <strong>{nodes.length}</strong>
          </span>
          <span>
            Press <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[9px] font-mono">Tab</kbd> to indent, <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[9px] font-mono">Shift+Tab</kbd> to outdent, <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[9px] font-mono">Alt+↑/↓</kbd> to move line
          </span>
        </div>
      )}
    </>
  );

  if (isFullscreen) {
    return (
      <div onMouseDown={() => setFocusedIndex(null)} className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 overflow-y-auto p-4 sm:p-8">
        <div
          ref={containerRef}
          className="w-full max-w-5xl mx-auto bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/60 rounded-2xl shadow-2xl flex flex-col p-8 sm:p-12 relative min-h-[85vh] h-fit mb-8"
        >
          {editorSheetContent}
        </div>
        {renderFloatingDock()}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={() => setFocusedIndex(null)}
      className="w-full max-w-3xl mx-auto min-h-[500px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/60 rounded-2xl shadow-xl flex flex-col p-8 sm:p-12 relative transition-all"
    >
      {editorSheetContent}
    </div>
  );
};
