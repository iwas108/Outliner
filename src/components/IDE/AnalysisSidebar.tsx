import React, { useState } from 'react';
import type { OutlineNode, ReviewComment, ProjectCommit } from '../../db/indexedDB';
import { check5W1H, checkKeywordChaining } from '../../utils/analyzer';
import { validateOutlineTree } from '../../utils/outlineRules';
import { PasteReviewModal } from './PasteReviewModal';
import { CommitModal } from './CommitModal';
import {
  ShieldCheck, AlertCircle, MessageSquareCode, Check, CheckCircle,
  GitCommit, GitBranch, RotateCcw, Activity, MessageSquare, Clock
} from 'lucide-react';

interface AnalysisSidebarProps {
  nodes: OutlineNode[];
  colorTaggingEnabled: boolean;
  onColorTaggingToggle: (enabled: boolean) => void;
  showStructureLine: boolean;
  onShowStructureLineToggle: (enabled: boolean) => void;
  onFocusLine: (id: string) => void;
  maxLevel?: number;
  // Review props
  reviews: ReviewComment[];
  onSolveComment: (commentId: string) => void;
  onSaveReviews: (newComments: ReviewComment[]) => void;
  // Version props
  commits: ProjectCommit[];
  onCreateCommit: (message: string) => void;
  onRevertCommit: (commit: ProjectCommit) => void;
  onForkCommit: (commit: ProjectCommit, forkTitle: string) => void;
}

type SidebarTab = 'diagnostics' | 'critique' | 'timeline';

export const AnalysisSidebar: React.FC<AnalysisSidebarProps> = ({
  nodes,
  onFocusLine,
  maxLevel = 12,
  reviews,
  onSolveComment,
  onSaveReviews,
  commits,
  onCreateCommit,
  onRevertCommit,
  onForkCommit,
}) => {
  const [activeTab, setActiveTab] = useState<SidebarTab>('diagnostics');

  // Modals
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [showCommitModal, setShowCommitModal] = useState(false);

  // Forking state
  const [forkingCommit, setForkingCommit] = useState<ProjectCommit | null>(null);
  const [forkTitle, setForkTitle] = useState('');

  // ── Diagnostic calculations ──
  const structureErrors = validateOutlineTree(nodes, maxLevel - 1);
  const chainingViolations = checkKeywordChaining(nodes);

  const syntaxErrors: { index: number; nodeId: string; message: string }[] = [];
  nodes.forEach((node, idx) => {
    const check = check5W1H(node.text, node.type);
    if (check && !check.isValid) {
      syntaxErrors.push({ index: idx, nodeId: node.id, message: check.message });
    }
  });

  const totalWarnings = structureErrors.length + syntaxErrors.length + Object.keys(chainingViolations).length;

  // ── Review data ──
  const activeReviews = reviews.filter((r) => !r.solved);

  const handleStartFork = (commit: ProjectCommit) => {
    setForkingCommit(commit);
    setForkTitle('Forked Project');
  };

  const handleCompleteFork = () => {
    if (!forkingCommit || !forkTitle.trim()) return;
    onForkCommit(forkingCommit, forkTitle);
    setForkingCommit(null);
  };

  const tabs: { id: SidebarTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'diagnostics',
      label: 'Diagnostics',
      icon: <Activity className="w-3.5 h-3.5" />,
      badge: totalWarnings > 0 ? totalWarnings : undefined,
    },
    {
      id: 'critique',
      label: 'Critique',
      icon: <MessageSquare className="w-3.5 h-3.5" />,
      badge: activeReviews.length > 0 ? activeReviews.length : undefined,
    },
    {
      id: 'timeline',
      label: 'Timeline',
      icon: <Clock className="w-3.5 h-3.5" />,
      badge: commits.length > 0 ? commits.length : undefined,
    },
  ];

  return (
    <aside className="w-80 flex-shrink-0 flex flex-col sticky top-8 h-fit">

      {/* Single unified tabbed card */}
      <div className="glass rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm overflow-hidden flex flex-col">

        {/* ── Tab bar ── */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex-1 flex items-center justify-center gap-1.5 px-2 py-3 text-[10px] font-bold uppercase tracking-wider transition-all select-none ${
                activeTab === tab.id
                  ? 'text-purple-600 dark:text-purple-400 bg-white dark:bg-slate-900 border-b-2 border-purple-500'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 border-b-2 border-transparent'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.badge !== undefined && (
                <span className={`absolute top-1.5 right-1.5 min-w-[16px] h-4 flex items-center justify-center text-[8px] font-black px-1 rounded-full border ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white border-purple-700'
                    : tab.id === 'diagnostics'
                      ? 'bg-amber-500 text-white border-amber-600'
                      : 'bg-purple-500 text-white border-purple-600'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div className="p-5 flex flex-col gap-4 min-h-[340px]">

          {/* ═══ DIAGNOSTICS TAB ═══ */}
          {activeTab === 'diagnostics' && (
            <div className="flex flex-col gap-3 h-full">
              {/* Summary badge */}
              {totalWarnings === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl px-4 text-center select-none">
                  <ShieldCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mb-1.5" />
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Outline Validated</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-500 mt-0.5 leading-relaxed">
                    No structural errors or keyword violations detected.
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl select-none">
                  <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-500 flex-shrink-0" />
                  <div>
                    <span className="block text-xs font-bold text-amber-800 dark:text-amber-400">
                      {totalWarnings} Warning{totalWarnings > 1 ? 's' : ''} Found
                    </span>
                    <span className="block text-[9px] text-amber-600 dark:text-amber-500/90 mt-0.5 leading-normal">
                      Click any card to focus the line in the editor.
                    </span>
                  </div>
                </div>
              )}

              {/* Warning cards */}
              {totalWarnings > 0 && (
                <div className="flex flex-col gap-2 overflow-y-auto max-h-[380px] pr-1">
                  {structureErrors.map((err, idx) => (
                    <button
                      key={`struct-${idx}`}
                      onClick={() => onFocusLine(err.nodeId)}
                      className="w-full text-left p-3 rounded-xl bg-rose-50/30 dark:bg-rose-950/10 border border-rose-100/60 dark:border-rose-900/25 hover:border-rose-300 dark:hover:border-rose-800/60 shadow-sm flex flex-col gap-1 transition-all"
                    >
                      <div className="flex justify-between items-center text-[9px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide">
                        <span>Line #{err.index + 1}</span>
                        <span className="bg-rose-100 dark:bg-rose-950/50 px-1.5 py-0.5 rounded">Structure</span>
                      </div>
                      <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed mt-0.5 font-medium">{err.message}</p>
                    </button>
                  ))}

                  {syntaxErrors.map((err, idx) => (
                    <button
                      key={`syntax-${idx}`}
                      onClick={() => onFocusLine(err.nodeId)}
                      className="w-full text-left p-3 rounded-xl bg-amber-50/30 dark:bg-amber-950/10 border border-amber-100/60 dark:border-amber-900/25 hover:border-amber-300 dark:hover:border-amber-800/60 shadow-sm flex flex-col gap-1 transition-all"
                    >
                      <div className="flex justify-between items-center text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                        <span>Line #{err.index + 1}</span>
                        <span className="bg-amber-100 dark:bg-amber-950/50 px-1.5 py-0.5 rounded">Formulation</span>
                      </div>
                      <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed mt-0.5 font-medium">{err.message}</p>
                    </button>
                  ))}

                  {Object.keys(chainingViolations).map((id, idx) => {
                    const nodeIdx = nodes.findIndex((n) => n.id === id);
                    return (
                      <button
                        key={`chain-${idx}`}
                        onClick={() => onFocusLine(id)}
                        className="w-full text-left p-3 rounded-xl bg-orange-50/30 dark:bg-orange-950/10 border border-orange-100/60 dark:border-orange-900/25 hover:border-orange-300 dark:hover:border-orange-850/60 shadow-sm flex flex-col gap-1 transition-all"
                      >
                        <div className="flex justify-between items-center text-[9px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wide">
                          <span>Line #{nodeIdx + 1}</span>
                          <span className="bg-orange-100 dark:bg-orange-950/50 px-1.5 py-0.5 rounded">Chaining</span>
                        </div>
                        <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed mt-0.5 font-medium">{chainingViolations[id]}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══ CRITIQUE FEED TAB ═══ */}
          {activeTab === 'critique' && (
            <div className="flex flex-col gap-3 h-full">
              {/* Action bar */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                  {activeReviews.length} unresolved · {reviews.filter(r => r.solved).length} solved
                </span>
                <button
                  onClick={() => setShowPasteModal(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-xl text-[10px] font-black shadow-sm transition-colors"
                >
                  <MessageSquareCode className="w-3 h-3" />
                  Import
                </button>
              </div>

              {/* Comments list */}
              <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[360px] pr-1">
                {activeReviews.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-xs italic flex flex-col items-center gap-2">
                    <CheckCircle className="w-7 h-7 text-slate-300 dark:text-slate-700" />
                    <span>No unresolved comments.</span>
                    <span className="text-[9px] font-mono not-italic text-slate-400 dark:text-slate-500">
                      Import a critique JSON to begin
                    </span>
                  </div>
                ) : (
                  activeReviews.map((comment) => {
                    const nodeText = nodes.find((n) => n.id === comment.lineId)?.text || '(Deleted Line)';
                    return (
                      <div
                        key={comment.id}
                        onClick={() => onFocusLine(comment.lineId)}
                        className="p-3 bg-slate-50 dark:bg-slate-950/50 hover:bg-purple-50/30 dark:hover:bg-purple-950/10 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col gap-2 cursor-pointer transition-all hover:shadow-sm hover:border-purple-200 dark:hover:border-purple-900/40"
                      >
                        <div className="text-[9px] text-slate-400 font-mono truncate border-b border-slate-200/50 dark:border-slate-800/60 pb-1">
                          ↳ &quot;{nodeText}&quot;
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{comment.commentText}</p>
                        <button
                          onClick={(e) => { e.stopPropagation(); onSolveComment(comment.id); }}
                          className="self-end flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-[9px] font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          Mark Solved
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ═══ VERSION TIMELINE TAB ═══ */}
          {activeTab === 'timeline' && (
            <div className="flex flex-col gap-3 h-full">
              {/* Action bar */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                  {commits.length} snapshot{commits.length !== 1 ? 's' : ''} saved
                </span>
                <button
                  onClick={() => setShowCommitModal(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-[10px] font-bold transition-all shadow-sm group"
                >
                  <GitBranch className="w-3.5 h-3.5 text-purple-500 group-hover:scale-110 transition-transform" />
                  Commit
                </button>
              </div>

              {/* Timeline */}
              <div className="flex flex-col gap-4 overflow-y-auto max-h-[360px] pr-1">
                {commits.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-xs italic flex flex-col items-center gap-2">
                    <GitCommit className="w-7 h-7 text-slate-300 dark:text-slate-700" />
                    <span>No checkpoints committed yet.</span>
                    <span className="text-[9px] font-mono not-italic text-slate-400 dark:text-slate-500">
                      Use Commit to save a snapshot
                    </span>
                  </div>
                ) : (
                  commits.map((commit) => {
                    const date = new Date(commit.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const fullDate = new Date(commit.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
                    return (
                      <div key={commit.id} className="relative pl-6 flex flex-col gap-1.5 group">
                        <div className="absolute left-1.5 top-2 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-800 group-last:hidden" />
                        <div className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full bg-purple-500 border-2 border-white dark:border-slate-900 shadow-sm" />

                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono">
                            {fullDate} @ {date}
                          </span>
                          <span className="text-[8px] font-mono px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-400">
                            {commit.nodesSnapshot.length} lines
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-normal">
                          {commit.comment}
                        </p>

                        <div className="flex gap-3 mt-0.5 border-t border-dashed border-slate-200 dark:border-slate-800/80 pt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onRevertCommit(commit)}
                            className="flex items-center gap-1 text-[9px] font-bold text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer transition-colors"
                            title="Revert to this snapshot"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Revert
                          </button>
                          <button
                            onClick={() => handleStartFork(commit)}
                            className="flex items-center gap-1 text-[9px] font-bold text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer transition-colors"
                            title="Fork into new project"
                          >
                            <GitBranch className="w-3 h-3" />
                            Fork Project
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Modals ── */}
      {showPasteModal && (
        <PasteReviewModal
          nodes={nodes}
          onClose={() => setShowPasteModal(false)}
          onSaveReviews={onSaveReviews}
        />
      )}

      {showCommitModal && (
        <CommitModal
          onClose={() => setShowCommitModal(false)}
          onCommit={onCreateCommit}
        />
      )}

      {/* Fork Modal */}
      {forkingCommit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-emerald-500" />
                Fork New Project
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-400 font-mono mt-0.5">
                Create a duplicate project copy from this snapshot
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                New Project Title *
              </label>
              <input
                type="text"
                autoFocus
                value={forkTitle}
                onChange={(e) => setForkTitle(e.target.value)}
                placeholder="Enter copied outline title"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setForkingCommit(null)}
                className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-200 rounded-lg transition-all shadow-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompleteFork}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-colors shadow-md"
              >
                Create Fork
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
