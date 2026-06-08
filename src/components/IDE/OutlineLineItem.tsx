import React, { useState, useRef, useEffect } from 'react';
import type { OutlineNode, ReviewComment } from '../../db/indexedDB';
import { ChevronRight, ChevronLeft, ChevronDown, Trash2, PlusCircle, HelpCircle, CheckCircle2, ArrowUp, ArrowDown, MessageSquare, Check } from 'lucide-react';

interface OutlineLineItemProps {
  node: OutlineNode;
  index: number;
  isActive: boolean;
  canIndent: boolean;
  canOutdent: boolean;
  colorTaggingEnabled: boolean;
  keywordColors: { [word: string]: string };
  onTextChange: (id: string, text: string) => void;
  onIndent: (index: number) => void;
  onOutdent: (index: number) => void;
  onDelete: (index: number) => void;
  onAddSiblingNode: (index: number, type: 'section' | 'topic' | 'question' | 'answer') => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  isFirstLine: boolean;
  isLastLine: boolean;
  onFocus: (index: number) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>, index: number) => void;
  editorLineSpacing?: number;
  editorLineHeight?: number;
  editorIndentSpacing?: number;
  showStructureLine?: boolean;
  isCollapsible?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: (id: string) => void;
  // Review comment props
  lineComments?: ReviewComment[];
  onSolveComment?: (commentId: string) => void;
}

export const OutlineLineItem: React.FC<OutlineLineItemProps> = ({
  node,
  index,
  isActive,
  canIndent,
  canOutdent,
  colorTaggingEnabled,
  keywordColors,
  onTextChange,
  onIndent,
  onOutdent,
  onDelete,
  onAddSiblingNode,
  onMoveUp,
  onMoveDown,
  isFirstLine,
  isLastLine,
  onFocus,
  onKeyDown,
  editorLineSpacing = 1.0,
  editorLineHeight = 1.4,
  editorIndentSpacing,
  showStructureLine,
  isCollapsible,
  isCollapsed,
  onToggleCollapse,
  lineComments = [],
  onSolveComment,
}) => {
  const [showCommentPopover, setShowCommentPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click or Escape
  useEffect(() => {
    if (!showCommentPopover) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowCommentPopover(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowCommentPopover(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showCommentPopover]);

  const hasComments = lineComments.length > 0;

  // Whether this node should show color highlights (exclude section/topic)
  const shouldHighlight = colorTaggingEnabled && node.depth >= 2;

  // Split and render keywords with background highlights
  const renderHighlightText = (text: string) => {
    if (!text) {
      const placeholder =
        node.type === 'section'
          ? 'Enter Section title...'
          : node.type === 'topic'
            ? 'Enter Topic title...'
            : node.type === 'question'
              ? 'Enter Question formulation...'
              : 'Enter Answer details...';
      return <span className="text-slate-350 dark:text-slate-650 italic font-normal">{placeholder}</span>;
    }

    const tokens = text.split(/(\s+|[.,\/#!$%\^&\*;:{}=\-_`~()?])/);

    return tokens.map((token, idx) => {
      const cleanWord = token.toLowerCase();
      if (keywordColors && keywordColors[cleanWord]) {
        const [bg, fg] = keywordColors[cleanWord].split('|');
        return (
          <span
            key={idx}
            style={{ backgroundColor: bg, color: fg }}
            className="inline px-0.5 py-0 rounded-sm font-semibold transition-all mx-px"
          >
            {token}
          </span>
        );
      }
      return <span key={idx}>{token}</span>;
    });
  };

  // Styling based on depth and type
  const getLineStyles = () => {
    switch (node.type) {
      case 'section':
        return 'font-extrabold text-base text-slate-900 dark:text-slate-50 tracking-tight';
      case 'topic':
        return 'font-bold text-sm text-slate-800 dark:text-slate-200';
      case 'question':
        return 'italic text-sm text-purple-700 dark:text-purple-400 font-medium';
      case 'answer':
        return 'text-sm text-slate-600 dark:text-slate-200';
      default:
        return 'text-sm';
    }
  };

  // Node Prefix visualizer
  const getPrefixLabel = () => {
    switch (node.type) {
      case 'section':
        return '§';
      case 'topic':
        return 'Topic:';
      case 'question':
        return 'Q:';
      case 'answer':
        return 'A:';
      default:
        return '';
    }
  };

  // Compute dynamic indentation
  const computedIndent = editorIndentSpacing !== undefined
    ? Math.max(12, node.depth * editorIndentSpacing + 12)
    : Math.max(12, node.depth * 24 + 12);

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      className={`group relative flex items-start w-full px-3 rounded-lg border transition-all duration-150 ${isActive
        ? 'bg-slate-100/75 dark:bg-slate-900/60 border-purple-500/35 dark:border-purple-550/25 shadow-sm'
        : hasComments
          ? 'bg-purple-50/20 dark:bg-purple-950/5 border-purple-200/40 dark:border-purple-900/20 hover:bg-purple-50/40 dark:hover:bg-purple-950/10'
          : 'bg-transparent border-transparent hover:bg-slate-50/50 dark:hover:bg-slate-900/30'
        }`}
      style={{
        paddingLeft: `${computedIndent}px`,
        paddingTop: `${editorLineSpacing * 4}px`,
        paddingBottom: `${editorLineSpacing * 4}px`,
        lineHeight: `${editorLineHeight}`
      }}
    >
      {/* Visual Nesting Guide Lines */}
      {showStructureLine &&
        Array.from({ length: node.depth }).map((_, i) => {
          const spacing = editorIndentSpacing !== undefined ? editorIndentSpacing : 24;
          const leftOffset = 12 + i * spacing + spacing / 2;
          return (
            <div
              key={i}
              className="absolute top-0 bottom-0 border-l border-slate-200/60 dark:border-slate-800/50 pointer-events-none transition-colors"
              style={{ left: `${leftOffset}px` }}
            />
          );
        })}

      {/* Node Type Indicator */}
      <div className="flex items-center gap-1.5 flex-grow min-w-0">
        {isCollapsible ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse?.(node.id);
            }}
            className="flex-shrink-0 p-0.5 rounded hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 transition-colors cursor-pointer mr-0.5"
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        ) : (
          <div className="w-4.5 h-3.5 flex-shrink-0 mr-0.5" />
        )}

        <span
          className={`flex-shrink-0 select-none text-[11px] uppercase tracking-wider font-bold min-w-12 w-auto pr-2 text-slate-400 dark:text-slate-555`}
        >
          {getPrefixLabel()}
        </span>

        {/* Input Surface */}
        {!isActive && shouldHighlight ? (
          <div
            onClick={() => onFocus(index)}
            className={`flex-grow py-1 cursor-text select-none min-h-[28px] whitespace-pre-wrap break-words ${getLineStyles()}`}
            style={{ lineHeight: `${editorLineHeight}` }}
          >
            {renderHighlightText(node.text)}
          </div>
        ) : isActive ? (
          <textarea
            id={`line-${node.id}`}
            value={node.text}
            onChange={(e) => onTextChange(node.id, e.target.value)}
            onFocus={() => onFocus(index)}
            onKeyDown={(e) => onKeyDown(e, index)}
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
            placeholder={
              node.type === 'section'
                ? 'Enter Section title...'
                : node.type === 'topic'
                  ? 'Enter Topic title...'
                  : node.type === 'question'
                    ? 'Enter Question formulation...'
                    : 'Enter Answer details...'
            }
            className={`flex-grow bg-transparent border-none outline-none focus:ring-0 w-full resize-none overflow-hidden placeholder-slate-350 dark:placeholder-slate-650 ${getLineStyles()}`}
            style={{ lineHeight: `${editorLineHeight}` }}
          />
        ) : (
          <div
            onClick={() => onFocus(index)}
            className={`flex-grow py-1 cursor-text select-none min-h-[28px] whitespace-pre-wrap break-words ${getLineStyles()}`}
            style={{ lineHeight: `${editorLineHeight}` }}
          >
            {node.text || (
              <span className="text-slate-350 dark:text-slate-650 italic font-normal">
                {node.type === 'section'
                  ? 'Enter Section title...'
                  : node.type === 'topic'
                    ? 'Enter Topic title...'
                    : node.type === 'question'
                      ? 'Enter Question formulation...'
                      : 'Enter Answer details...'}
              </span>
            )}
          </div>
        )}

        {/* Comment Badge */}
        {hasComments && (
          <div className="relative flex-shrink-0 ml-2" ref={popoverRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowCommentPopover(!showCommentPopover);
              }}
              className="flex items-center justify-center gap-1 p-1.5 bg-purple-500/10 hover:bg-purple-500/25 border border-purple-500/30 text-purple-600 dark:text-purple-400 rounded-lg transition-colors cursor-pointer"
              title={`${lineComments.length} unresolved comment(s) — click to view`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="text-[9px] font-bold">{lineComments.length}</span>
            </button>

            {/* Comment Popover */}
            {showCommentPopover && (
              <div
                className="absolute right-0 top-full mt-2 z-40 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-150"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <MessageSquare className="w-3 h-3 text-purple-500" />
                    Line Feedback
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    {lineComments.length} comment{lineComments.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="flex flex-col gap-2.5 max-h-48 overflow-y-auto pr-1">
                  {lineComments.map((comment) => (
                    <div
                      key={comment.id}
                      className="p-2.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col gap-2"
                    >
                      <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                        {comment.commentText}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSolveComment?.(comment.id);
                        }}
                        className="self-end flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-[9px] font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer"
                      >
                        <Check className="w-2.5 h-2.5" />
                        Solve
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Toolbar Controls */}
      {isActive && (
        <div
          className="absolute bottom-full right-6 mb-1 flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg rounded-xl p-1 gap-1 transition-all duration-150 z-20 animate-in fade-in slide-in-from-bottom-2"
        >
          {/* Indent Actions */}
          <button
            type="button"
            disabled={!canOutdent}
            onClick={() => onOutdent(index)}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Outdent (Shift+Tab)"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={!canIndent}
            onClick={() => onIndent(index)}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Indent (Tab)"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Move Actions */}
          <button
            type="button"
            disabled={isFirstLine}
            onClick={() => onMoveUp(index)}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Move Up"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={isLastLine}
            onClick={() => onMoveDown(index)}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Move Down"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>

          {/* Node Append Siblings */}
          <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-800 mx-0.5" />

          {node.type === 'section' && (
            <button
              type="button"
              onClick={() => onAddSiblingNode(index, 'topic')}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-purple-650 dark:hover:text-purple-400 transition-colors flex items-center gap-0.5 text-[9px] font-bold"
              title="Append Topic"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Topic</span>
            </button>
          )}

          {node.type === 'topic' && (
            <button
              type="button"
              onClick={() => onAddSiblingNode(index, 'question')}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-purple-650 dark:hover:text-purple-400 transition-colors flex items-center gap-0.5 text-[9px] font-bold"
              title="Append Question"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Q</span>
            </button>
          )}

          {node.type === 'question' && (
            <button
              type="button"
              onClick={() => onAddSiblingNode(index, 'answer')}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-purple-650 dark:hover:text-purple-400 transition-colors flex items-center gap-0.5 text-[9px] font-bold"
              title="Append Answer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>A</span>
            </button>
          )}

          {node.type === 'answer' && (
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => onAddSiblingNode(index, 'question')}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-purple-650 dark:hover:text-purple-400 transition-colors flex items-center gap-0.5 text-[9px] font-bold"
                title="Append Sub-Question"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Sub Q</span>
              </button>
              <button
                type="button"
                onClick={() => onAddSiblingNode(index, 'answer')}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-purple-650 dark:hover:text-purple-400 transition-colors flex items-center gap-0.5 text-[9px] font-bold"
                title="Append Sibling Answer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>A</span>
              </button>
            </div>
          )}

          <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-800 mx-0.5" />

          {/* Delete */}
          <button
            type="button"
            onClick={() => onDelete(index)}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
            title="Delete Line"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

    </div>
  );
};
