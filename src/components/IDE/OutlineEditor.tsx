import React, { useEffect, useRef, useState } from 'react';
import type { OutlineNode, ReviewComment, ProjectCommit } from '../../db/indexedDB';
import { OutlineLineItem } from './OutlineLineItem';
import { PasteReviewModal } from './PasteReviewModal';
import { CommitModal } from './CommitModal';
import { CookbookModal } from './CookbookModal';
import { canIndent, canOutdent, getNodeTypeForDepth, validateOutlineTree } from '../../utils/outlineRules';
import { check5W1H, checkKeywordChaining } from '../../utils/analyzer';
import { 
  Plus, ListTodo, Maximize2, Minimize2, ShieldCheck, AlertCircle, Eye, EyeOff, 
  ChevronUp, ChevronDown, ListTree, Sparkles, MessageSquare, MessageSquareCode,
  GitCommit, GitBranch, RotateCcw, Check, CheckCircle, Settings2, BookOpen
} from 'lucide-react';

interface OutlineEditorProps {
  nodes: OutlineNode[];
  colorTaggingEnabled: boolean;
  onColorTaggingToggle?: (enabled: boolean) => void;
  showStructureLine?: boolean;
  onShowStructureLineToggle?: (enabled: boolean) => void;
  keywordColors: { [nodeId: string]: { [word: string]: string } };
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
  // Review props
  reviews: ReviewComment[];
  onSolveComment: (commentId: string) => void;
  // Version props
  commits: ProjectCommit[];
  onCreateCommit: (message: string) => void;
  onRevertCommit: (commit: ProjectCommit) => void;
  onForkCommit: (commit: ProjectCommit, forkTitle: string) => void;
  onSaveReviews: (newComments: ReviewComment[]) => void;
}

export const OutlineEditor: React.FC<OutlineEditorProps> = ({
  nodes,
  colorTaggingEnabled,
  onColorTaggingToggle,
  showStructureLine = false,
  onShowStructureLineToggle,
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
  reviews,
  onSolveComment,
  commits,
  onCreateCommit,
  onRevertCommit,
  onForkCommit,
  onSaveReviews,
}) => {
  const maxDepth = maxLevel - 1;
  const containerRef = useRef<HTMLDivElement>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);

  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(new Set());

  // Fullscreen panel states — mutually exclusive
  type DockPanel = 'none' | 'diagnostics' | 'critique' | 'timeline';
  const [activeDockPanel, setActiveDockPanel] = useState<DockPanel>('none');

  // Fullscreen modals
  const [showFullscreenPasteModal, setShowFullscreenPasteModal] = useState(false);
  const [showFullscreenCommitModal, setShowFullscreenCommitModal] = useState(false);
  const [showCookbookModal, setShowCookbookModal] = useState(false);

  // Fullscreen fork state
  const [fsForkingCommit, setFsForkingCommit] = useState<ProjectCommit | null>(null);
  const [fsForkTitle, setFsForkTitle] = useState('');

  const handleToggleCollapse = (nodeId: string) => {
    setCollapsedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  // Compute visibility mapping
  let currentSectionCollapsed = false;
  let currentTopicCollapsed = false;
  const visibleNodeIds = new Set<string>();

  nodes.forEach((node) => {
    if (node.type === 'section') {
      currentSectionCollapsed = collapsedNodeIds.has(node.id);
      currentTopicCollapsed = false;
      visibleNodeIds.add(node.id);
    } else if (currentSectionCollapsed) {
      // Hidden because Section is collapsed
    } else if (node.type === 'topic') {
      currentTopicCollapsed = collapsedNodeIds.has(node.id);
      visibleNodeIds.add(node.id);
    } else if (currentTopicCollapsed) {
      // Hidden because Topic is collapsed
    } else {
      visibleNodeIds.add(node.id);
    }
  });


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

  // Review data
  const activeReviews = reviews.filter((r) => !r.solved);
  const reviewsByLine = reviews.reduce<{ [lineId: string]: ReviewComment[] }>((acc, curr) => {
    if (!curr.solved) {
      if (!acc[curr.lineId]) acc[curr.lineId] = [];
      acc[curr.lineId].push(curr);
    }
    return acc;
  }, {});

  // Focus and visibility utility to programmatically expand parents and focus/scroll the active input element
  useEffect(() => {
    if (focusedIndex !== null && nodes[focusedIndex]) {
      const targetNode = nodes[focusedIndex];

      // 1. Check if any parent needs to be expanded
      let parentTopicId: string | null = null;
      let parentSectionId: string | null = null;

      for (let i = focusedIndex - 1; i >= 0; i--) {
        const node = nodes[i];
        if (node.type === 'section' && !parentSectionId) {
          parentSectionId = node.id;
        }
        if (node.type === 'topic' && !parentTopicId && !parentSectionId) {
          parentTopicId = node.id;
        }
      }

      const needsExpandTopic = parentTopicId && collapsedNodeIds.has(parentTopicId);
      const needsExpandSection = parentSectionId && collapsedNodeIds.has(parentSectionId);

      if (needsExpandTopic || needsExpandSection) {
        setCollapsedNodeIds((prev) => {
          const next = new Set(prev);
          if (needsExpandTopic && parentTopicId) {
            next.delete(parentTopicId);
          }
          if (needsExpandSection && parentSectionId) {
            next.delete(parentSectionId);
          }
          return next;
        });
        return;
      }

      // 2. Focus and Scroll into view
      const timer = setTimeout(() => {
        const activeEl = document.getElementById(`line-${targetNode.id}`);
        if (activeEl) {
          (activeEl as HTMLTextAreaElement | HTMLInputElement).focus();
          activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [focusedIndex, nodes, collapsedNodeIds]);

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

  const toggleDockPanel = (panel: DockPanel) => {
    setActiveDockPanel((prev) => (prev === panel ? 'none' : panel));
  };

  const handleFsStartFork = (commit: ProjectCommit) => {
    setFsForkingCommit(commit);
    setFsForkTitle('Forked Project');
  };

  const handleFsCompleteFork = () => {
    if (!fsForkingCommit || !fsForkTitle.trim()) return;
    onForkCommit(fsForkingCommit, fsForkTitle);
    setFsForkingCommit(null);
  };

  const renderFloatingDock = () => {
    return (
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 select-none"
      >
        {/* Expanded Diagnostics Popup */}
        {activeDockPanel === 'diagnostics' && totalWarnings > 0 && (
          <div
            className="w-80 max-h-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-slate-200/80 dark:border-slate-800/60 rounded-2xl shadow-2xl p-4 flex flex-col gap-2 transition-all animate-in fade-in slide-in-from-bottom-4 duration-200"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-550">
                Real-time warnings
              </span>
              <button
                type="button"
                onClick={() => setActiveDockPanel('none')}
                className="text-[10px] font-bold text-slate-500 hover:text-slate-750 dark:text-slate-450 dark:hover:text-slate-250 cursor-pointer flex items-center gap-0.5"
              >
                <ChevronDown className="w-3 h-3" />
                Close
              </button>
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto pr-1">
              {/* Structural Errors */}
              {structureErrors.map((err, idx) => (
                <button
                  key={`struct-fs-${idx}`}
                  onClick={() => {
                    setFocusedIndex(err.index);
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
                    setFocusedIndex(err.index);
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
                      if (nodeIdx !== -1) {
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

        {/* Expanded Critique Feed Popup */}
        {activeDockPanel === 'critique' && (
          <div
            className="w-80 max-h-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-slate-200/80 dark:border-slate-800/60 rounded-2xl shadow-2xl p-4 flex flex-col gap-3 transition-all animate-in fade-in slide-in-from-bottom-4 duration-200"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-550 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-purple-500" />
                Critique Feed
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFullscreenPasteModal(true)}
                  className="flex items-center gap-1 px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[9px] font-black transition-colors"
                >
                  <MessageSquareCode className="w-2.5 h-2.5" />
                  Import
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDockPanel('none')}
                  className="text-[10px] font-bold text-slate-500 hover:text-slate-750 dark:text-slate-450 dark:hover:text-slate-250 cursor-pointer flex items-center gap-0.5"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 overflow-y-auto pr-1">
              {activeReviews.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs italic flex flex-col items-center gap-1.5">
                  <CheckCircle className="w-5 h-5 text-slate-300 dark:text-slate-700" />
                  No unresolved comments.
                  <span className="text-[9px] font-mono not-italic block text-slate-400 dark:text-slate-500 mt-0.5">Import a critique JSON to begin</span>
                </div>
              ) : (
                activeReviews.map((comment) => {
                  const nodeText = nodes.find((n) => n.id === comment.lineId)?.text || '(Deleted Line)';
                  const nodeIdx = nodes.findIndex((n) => n.id === comment.lineId);
                  return (
                    <div
                      key={comment.id}
                      onClick={() => {
                        if (nodeIdx !== -1) setFocusedIndex(nodeIdx);
                      }}
                      className="p-2.5 bg-slate-50 dark:bg-slate-950/50 hover:bg-purple-50/20 dark:hover:bg-purple-950/10 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col gap-1.5 cursor-pointer transition-all hover:shadow-sm"
                    >
                      <div className="text-[9px] text-slate-400 font-mono truncate border-b border-slate-200/50 dark:border-slate-800/60 pb-1">
                        &quot;{nodeText}&quot;
                      </div>
                      <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                        {comment.commentText}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSolveComment(comment.id);
                        }}
                        className="self-end flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-[9px] font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer"
                      >
                        <Check className="w-2.5 h-2.5" />
                        Solve
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Expanded Version Timeline Popup */}
        {activeDockPanel === 'timeline' && (
          <div
            className="w-80 max-h-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-slate-200/80 dark:border-slate-800/60 rounded-2xl shadow-2xl p-4 flex flex-col gap-3 transition-all animate-in fade-in slide-in-from-bottom-4 duration-200"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-550 flex items-center gap-1.5">
                <GitCommit className="w-3 h-3 text-purple-500" />
                Version Timeline
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFullscreenCommitModal(true)}
                  className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[9px] font-bold transition-all"
                >
                  <GitBranch className="w-2.5 h-2.5 text-purple-500" />
                  Commit
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDockPanel('none')}
                  className="text-[10px] font-bold text-slate-500 hover:text-slate-750 dark:text-slate-450 dark:hover:text-slate-250 cursor-pointer flex items-center gap-0.5"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto pr-1">
              {commits.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs italic">
                  No checkpoints committed yet.
                </div>
              ) : (
                commits.map((commit) => {
                  const date = new Date(commit.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const fullDate = new Date(commit.timestamp).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                  });
                  return (
                    <div key={commit.id} className="relative pl-5 flex flex-col gap-1 group">
                      <div className="absolute left-1 top-1 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-800 group-last:hidden" />
                      <div className="absolute left-0 top-1 w-2.5 h-2.5 rounded-full bg-purple-500 border-2 border-white dark:border-slate-900 shadow-sm shrink-0" />

                      <div className="flex justify-between items-start">
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 font-mono">
                          {fullDate} @ {date}
                        </span>
                        <span className="text-[8px] font-mono px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-400">
                          {commit.nodesSnapshot.length} lines
                        </span>
                      </div>

                      <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 leading-normal">
                        {commit.comment}
                      </p>

                      <div className="flex gap-2 mt-0.5 border-t border-dashed border-slate-200 dark:border-slate-800/80 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onRevertCommit(commit)}
                          className="flex items-center gap-1 text-[9px] font-bold text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          Revert
                        </button>
                        <button
                          onClick={() => handleFsStartFork(commit)}
                          className="flex items-center gap-1 text-[9px] font-bold text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
                        >
                          <GitBranch className="w-2.5 h-2.5" />
                          Fork
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Floating Toolbar Controls */}
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-2xl shadow-2xl">
          {/* Critique Feed toggle */}
          <button
            type="button"
            onClick={() => toggleDockPanel('critique')}
            className={`relative p-2 rounded-xl border transition-all cursor-pointer ${activeDockPanel === 'critique'
                ? 'bg-purple-500 text-white border-purple-500 shadow-inner'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-650'
              }`}
            title="Critique Feed"
          >
            <MessageSquare className="w-4 h-4" />
            {activeReviews.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center text-[8px] font-black bg-purple-600 text-white rounded-full border-2 border-white dark:border-slate-900">
                {activeReviews.length}
              </span>
            )}
          </button>

          {/* Version Timeline toggle */}
          <button
            type="button"
            onClick={() => toggleDockPanel('timeline')}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${activeDockPanel === 'timeline'
                ? 'bg-purple-500 text-white border-purple-500 shadow-inner'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-650'
              }`}
            title="Version Timeline"
          >
            <GitCommit className="w-4 h-4" />
          </button>

          {/* Diagnostics toggle pill */}
          <button
            type="button"
            onClick={() => {
              if (totalWarnings > 0) {
                toggleDockPanel('diagnostics');
              }
            }}
            className={`px-3 py-1.5 rounded-xl border font-bold text-xs transition-all flex items-center gap-1.5 ${totalWarnings === 0
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 cursor-default'
                : activeDockPanel !== 'diagnostics'
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
                {activeDockPanel !== 'diagnostics' ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
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
      <div className="flex flex-col gap-3 border-b border-slate-100 dark:border-slate-800 pb-5 mb-6 select-none">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-200">
              Document Outline Sheet
            </span>
            {isFullscreen && nodes.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-[10px] text-slate-400 dark:text-slate-555">
                <span>
                  <strong className="text-slate-750 dark:text-slate-300 font-bold">{nodes.length}</strong> elements
                </span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span>
                  <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[9px] font-mono text-slate-500">Tab</kbd>{' '}indent
                  {' · '}
                  <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[9px] font-mono text-slate-500">Alt+↑/↓</kbd>{' '}move
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* ── Editor Options Toolbar ── */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest mr-1 select-none">
            <Settings2 className="w-3 h-3" />
            View
          </div>

          {/* Color Tagging Toggle */}
          <button
            type="button"
            onClick={() => onColorTaggingToggle?.(!colorTaggingEnabled)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
              colorTaggingEnabled
                ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/40 text-purple-600 dark:text-purple-400'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
            title={colorTaggingEnabled ? 'Disable Color Tagging' : 'Enable Color Tagging'}
          >
            {colorTaggingEnabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Color Tags</span>
          </button>

          {/* Structure Line Toggle */}
          <button
            type="button"
            onClick={() => onShowStructureLineToggle?.(!showStructureLine)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
              showStructureLine
                ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/40 text-purple-600 dark:text-purple-400'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
            title={showStructureLine ? 'Hide Structure Lines' : 'Show Structure Lines'}
          >
            <ListTree className="w-3.5 h-3.5" />
            <span>Structure Lines</span>
          </button>

          {/* Cookbook Toggle */}
          <button
            type="button"
            onClick={() => setShowCookbookModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
            title="Open Outlining Cookbook"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Cookbook</span>
          </button>
        </div>
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
          {nodes.map((node, index) => {
            const isVisible = visibleNodeIds.has(node.id);
            if (!isVisible) return null;

            return (
              <OutlineLineItem
                key={node.id}
                node={node}
                index={index}
                isActive={focusedIndex === index}
                canIndent={canIndent(nodes, index, maxDepth)}
                canOutdent={canOutdent(nodes, index)}
                colorTaggingEnabled={colorTaggingEnabled}
                keywordColors={keywordColors[node.id] || {}}
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
                showStructureLine={showStructureLine}
                isCollapsible={node.type === 'section' || node.type === 'topic'}
                isCollapsed={collapsedNodeIds.has(node.id)}
                onToggleCollapse={handleToggleCollapse}
                lineComments={reviewsByLine[node.id] || []}
                onSolveComment={onSolveComment}
              />
            );
          })}

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

        {/* Fullscreen Modals */}
        {showFullscreenPasteModal && (
          <PasteReviewModal
            nodes={nodes}
            onClose={() => setShowFullscreenPasteModal(false)}
            onSaveReviews={onSaveReviews}
          />
        )}

        {showFullscreenCommitModal && (
          <CommitModal
            onClose={() => setShowFullscreenCommitModal(false)}
            onCommit={onCreateCommit}
          />
        )}

        {showCookbookModal && (
          <CookbookModal onClose={() => setShowCookbookModal(false)} />
        )}

        {/* Fullscreen Fork Modal */}
        {fsForkingCommit && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
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
                  value={fsForkTitle}
                  onChange={(e) => setFsForkTitle(e.target.value)}
                  placeholder="Enter copied outline title"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFsForkingCommit(null)}
                  className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-200 rounded-lg transition-all shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleFsCompleteFork}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-colors shadow-md"
                >
                  Create Fork
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        onMouseDown={() => setFocusedIndex(null)}
        className="w-full max-w-3xl mx-auto min-h-[500px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/60 rounded-2xl shadow-xl flex flex-col p-8 sm:p-12 relative transition-all"
      >
        {editorSheetContent}
      </div>

      {showCookbookModal && (
        <CookbookModal onClose={() => setShowCookbookModal(false)} />
      )}
    </>
  );
};
