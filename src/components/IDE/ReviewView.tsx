import React, { useState, useRef } from 'react';
import type { Project, OutlineNode, ReviewComment, ProjectCommit } from '../../db/indexedDB';
import { saveProject } from '../../db/indexedDB';
import { PasteReviewModal } from './PasteReviewModal';
import { CommitModal } from './CommitModal';
import { 
  MessageSquare, 
  Check, 
  GitBranch, 
  RotateCcw, 
  GitCommit, 
  MessageSquareCode,
  Sparkles,
  Edit3,
  CheckCircle
} from 'lucide-react';

interface ReviewViewProps {
  project: Project;
  onUpdateProject: (updatedProject: Project) => void;
  onBackToDashboard: () => void;
}

export const ReviewView: React.FC<ReviewViewProps> = ({
  project,
  onUpdateProject,
  onBackToDashboard,
}) => {
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [showCommitModal, setShowCommitModal] = useState(false);
  
  // Forking state
  const [forkingCommit, setForkingCommit] = useState<ProjectCommit | null>(null);
  const [forkTitle, setForkTitle] = useState('');
  
  // Inline editing state
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  
  // Active focused line ID (from clicking a comment card)
  const [focusedLineId, setFocusedLineId] = useState<string | null>(null);
  
  const lineRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const { nodes, commits = [], reviews = [] } = project;
  const activeReviews = reviews.filter((r) => !r.solved);

  // Group comments by their line ID for visual badges
  const reviewsByLine = reviews.reduce<{ [lineId: string]: ReviewComment[] }>((acc, curr) => {
    if (!curr.solved) {
      if (!acc[curr.lineId]) acc[curr.lineId] = [];
      acc[curr.lineId].push(curr);
    }
    return acc;
  }, {});

  const handleSaveReviews = (newComments: ReviewComment[]) => {
    // Overwrite or append comments? Let's append them
    const updatedReviews = [...reviews, ...newComments];
    const updatedProject: Project = {
      ...project,
      reviews: updatedReviews,
      updatedAt: new Date().toISOString(),
    };
    onUpdateProject(updatedProject);
  };

  const handleSolveComment = (commentId: string) => {
    const updatedReviews = reviews.map((r) =>
      r.id === commentId ? { ...r, solved: true } : r
    );
    const updatedProject: Project = {
      ...project,
      reviews: updatedReviews,
      updatedAt: new Date().toISOString(),
    };
    onUpdateProject(updatedProject);
  };

  const handleCreateCommit = (message: string) => {
    const newCommit: ProjectCommit = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      comment: message,
      nodesSnapshot: JSON.parse(JSON.stringify(nodes)),
      metadataSnapshot: JSON.parse(JSON.stringify(project.metadata)),
    };

    const updatedProject: Project = {
      ...project,
      commits: [newCommit, ...commits],
      updatedAt: new Date().toISOString(),
    };
    onUpdateProject(updatedProject);
  };

  const handleRevertCommit = (commit: ProjectCommit) => {
    // Confirm revert (inline custom prompt or state - we can trigger confirmation state or just revert immediately. Let's revert, but alert is not allowed, so let's do direct revert)
    const updatedProject: Project = {
      ...project,
      nodes: JSON.parse(JSON.stringify(commit.nodesSnapshot)),
      metadata: JSON.parse(JSON.stringify(commit.metadataSnapshot)),
      updatedAt: new Date().toISOString(),
    };
    onUpdateProject(updatedProject);
    // Focus or show message
  };

  const handleStartFork = (commit: ProjectCommit) => {
    setForkingCommit(commit);
    setForkTitle(`${project.title} - Forked`);
  };

  const handleCompleteFork = async () => {
    if (!forkingCommit || !forkTitle.trim()) return;

    const newProject: Project = {
      id: crypto.randomUUID(),
      title: forkTitle.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: JSON.parse(JSON.stringify(forkingCommit.metadataSnapshot)),
      nodes: JSON.parse(JSON.stringify(forkingCommit.nodesSnapshot)),
      commits: [], // Starts with fresh commit history
      reviews: [], // Starts with fresh review comments
    };

    try {
      await saveProject(newProject);
      setForkingCommit(null);
      onBackToDashboard(); // Return to list view
    } catch (err) {
      console.error('Failed to fork project:', err);
    }
  };

  const handleStartEditing = (node: OutlineNode) => {
    setEditingNodeId(node.id);
    setEditingText(node.text);
  };

  const handleSaveInlineEdit = (nodeId: string) => {
    const updatedNodes = nodes.map((n) =>
      n.id === nodeId ? { ...n, text: editingText } : n
    );
    const updatedProject: Project = {
      ...project,
      nodes: updatedNodes,
      updatedAt: new Date().toISOString(),
    };
    onUpdateProject(updatedProject);
    setEditingNodeId(null);
  };

  const handleCommentCardClick = (lineId: string) => {
    setFocusedLineId(lineId);
    const targetElement = lineRefs.current[lineId];
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="w-full flex flex-col md:flex-row gap-6 items-stretch animate-fadeIn">
      
      {/* Left Pane: Critique Reading Surface */}
      <div className="flex-grow min-w-0 flex flex-col gap-4">
        <div className="glass rounded-3xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-4 bg-white dark:bg-slate-950/40 min-h-[500px]">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                Outline Critique Canvas
              </h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-400 font-mono mt-0.5">
                Double-click text to modify outline contents directly in review mode
              </p>
            </div>
            
            {/* Legend */}
            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                  <MessageSquare className="w-1.5 h-1.5 text-purple-600 dark:text-purple-400" />
                </span>
                Active Feedback
              </span>
            </div>
          </div>

          {/* Render nodes list */}
          <div className="flex-grow flex flex-col gap-2.5 overflow-y-auto max-h-[65vh] pr-1">
            {nodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2 italic">
                <MessageSquareCode className="w-8 h-8 text-slate-300 dark:text-slate-750 animate-bounce" />
                No outline nodes available.
              </div>
            ) : (
              nodes.map((node) => {
                const isEditing = editingNodeId === node.id;
                const hasComments = reviewsByLine[node.id] && reviewsByLine[node.id].length > 0;
                const isFocused = focusedLineId === node.id;

                let nodeStyle = 'font-normal text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/40';
                let prefix = '';
                if (node.type === 'section') {
                  nodeStyle = 'font-black text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800/80 pb-1 mt-3 hover:bg-slate-50 dark:hover:bg-slate-900/40';
                } else if (node.type === 'topic') {
                  nodeStyle = 'font-bold text-slate-800 dark:text-slate-200 mt-1.5 hover:bg-slate-50 dark:hover:bg-slate-900/40';
                } else if (node.type === 'question') {
                  nodeStyle = 'font-semibold text-slate-700 dark:text-slate-300';
                  prefix = 'Q: ';
                } else if (node.type === 'answer') {
                  nodeStyle = 'font-normal text-slate-600 dark:text-slate-400';
                  prefix = 'A: ';
                }

                return (
                  <div
                    key={node.id}
                    ref={(el) => { lineRefs.current[node.id] = el; }}
                    onClick={() => {
                      setFocusedLineId(node.id);
                      handleStartEditing(node);
                    }}
                    className={`group relative flex items-center gap-3 px-3 py-2 rounded-xl transition-all border ${
                      isFocused 
                        ? 'bg-purple-50/50 dark:bg-purple-950/10 border-purple-500/40 shadow-sm' 
                        : 'border-transparent'
                    } ${nodeStyle}`}
                    style={{
                      marginLeft: `${node.depth * 20}px`,
                    }}
                  >
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 select-none shrink-0 w-5">
                      {prefix}
                    </span>

                    {isEditing ? (
                      <textarea
                        autoFocus
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={() => handleSaveInlineEdit(node.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSaveInlineEdit(node.id);
                          }
                          if (e.key === 'Escape') setEditingNodeId(null);
                        }}
                        rows={1}
                        onInput={(e) => {
                          const el = e.currentTarget;
                          el.style.height = 'auto';
                          el.style.height = `${el.scrollHeight}px`;
                        }}
                        ref={(el) => {
                          if (el) {
                            el.style.height = 'auto';
                            el.style.height = `${el.scrollHeight}px`;
                          }
                        }}
                        className="flex-grow px-2 py-1 bg-white dark:bg-slate-950 border border-purple-500 rounded text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-900 dark:text-slate-100 resize-none overflow-hidden"
                      />
                    ) : (
                      <div 
                        className="flex-grow text-xs leading-relaxed break-words cursor-pointer"
                      >
                        {node.text || <span className="text-slate-350 dark:text-slate-600 italic select-none">(Click to insert content)</span>}
                      </div>
                    )}

                    {/* Action indicators */}
                    <div className="flex items-center gap-2 shrink-0">
                      {hasComments && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCommentCardClick(node.id);
                          }}
                          className="flex items-center justify-center p-1 bg-purple-500/10 hover:bg-purple-500/25 border border-purple-500/30 text-purple-600 dark:text-purple-400 rounded-lg transition-colors cursor-pointer"
                          title={`${reviewsByLine[node.id].length} unresolved comment(s)`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-bold ml-1">{reviewsByLine[node.id].length}</span>
                        </button>
                      )}
                      
                      {!isEditing && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEditing(node);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-opacity"
                          title="Edit Line"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Right Pane: Gutter Sidebar Feed */}
      <div className="w-full md:w-80 shrink-0 flex flex-col gap-6">
        
        {/* Critique comments card */}
        <div className="glass rounded-3xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col gap-4 bg-white dark:bg-slate-950/40">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              Critique Feed
            </h3>
            
            <button
              onClick={() => setShowPasteModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] font-black shadow-sm transition-colors"
            >
              <MessageSquareCode className="w-3 h-3" />
              Import
            </button>
          </div>

          {/* Comments List */}
          <div className="flex flex-col gap-3 overflow-y-auto max-h-[300px] pr-1">
            {activeReviews.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs italic flex flex-col items-center gap-1.5">
                <CheckCircle className="w-6 h-6 text-slate-300 dark:text-slate-700" />
                No unresolved comments.
                <span className="text-[9px] font-mono not-italic block text-slate-400 dark:text-slate-500 mt-1">Paste a critique JSON above to begin</span>
              </div>
            ) : (
              activeReviews.map((comment) => {
                const nodeText = nodes.find((n) => n.id === comment.lineId)?.text || '(Deleted Line)';
                return (
                  <div
                    key={comment.id}
                    onClick={() => handleCommentCardClick(comment.lineId)}
                    className="p-3 bg-slate-50 dark:bg-slate-950/50 hover:bg-purple-50/20 dark:hover:bg-purple-950/10 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col gap-2 cursor-pointer transition-all hover:shadow-sm"
                  >
                    <div className="text-[9px] text-slate-400 font-mono truncate border-b border-slate-200/50 dark:border-slate-800/60 pb-1">
                      Context: &quot;{nodeText}&quot;
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {comment.commentText}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Avoid triggering click select
                        handleSolveComment(comment.id);
                      }}
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

        {/* Git-like revision snapshots timeline */}
        <div className="glass rounded-3xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col gap-4 bg-white dark:bg-slate-950/40">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
              <GitCommit className="w-4 h-4 text-purple-500" />
              Version Timeline
            </h3>

            <button
              onClick={() => setShowCommitModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-[10px] font-bold transition-all shadow-sm group"
            >
              <GitBranch className="w-3.5 h-3.5 text-purple-550 group-hover:scale-110 transition-transform" />
              Commit
            </button>
          </div>

          {/* Commits feeds */}
          <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-1">
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
                  <div key={commit.id} className="relative pl-6 flex flex-col gap-1.5 group">
                    {/* Visual timeline node */}
                    <div className="absolute left-1.5 top-1 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-800 group-last:hidden" />
                    <div className="absolute left-0 top-1 w-3.5 h-3.5 rounded-full bg-purple-500 border-2 border-white dark:border-slate-900 shadow-sm shrink-0" />

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

                    <div className="flex gap-2.5 mt-1 border-t border-dashed border-slate-200 dark:border-slate-800/80 pt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleRevertCommit(commit)}
                        className="flex items-center gap-1 text-[9px] font-bold text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer"
                        title="Revert project nodes to this revision"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Revert
                      </button>
                      <button
                        onClick={() => handleStartFork(commit)}
                        className="flex items-center gap-1 text-[9px] font-bold text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
                        title="Fork commit snapshot into new outline project"
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

      </div>

      {/* Modals layout toggles */}
      {showPasteModal && (
        <PasteReviewModal
          nodes={nodes}
          onClose={() => setShowPasteModal(false)}
          onSaveReviews={handleSaveReviews}
        />
      )}

      {showCommitModal && (
        <CommitModal
          onClose={() => setShowCommitModal(false)}
          onCommit={handleCreateCommit}
        />
      )}

      {/* Custom Fork Title Modal */}
      {forkingCommit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
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

    </div>
  );
};
