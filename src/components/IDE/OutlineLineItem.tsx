import React from 'react';
import type { OutlineNode } from '../../db/indexedDB';
import { ChevronRight, ChevronLeft, Trash2, PlusCircle, HelpCircle, CheckCircle2, ArrowUp, ArrowDown } from 'lucide-react';

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
}) => {

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
            className="inline px-1 py-0.5 rounded-sm font-semibold transition-all mx-px"
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
        return 'text-sm text-slate-600 dark:text-slate-350';
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
      className={`group relative flex items-start w-full px-3 rounded-lg border transition-all duration-150 ${
        isActive
          ? 'bg-slate-100/75 dark:bg-slate-900/60 border-purple-500/35 dark:border-purple-550/25 shadow-sm'
          : 'bg-transparent border-transparent hover:bg-slate-50/50 dark:hover:bg-slate-900/30'
      }`}
      style={{ 
        paddingLeft: `${computedIndent}px`, 
        paddingTop: `${editorLineSpacing * 4}px`, 
        paddingBottom: `${editorLineSpacing * 4}px`, 
        lineHeight: `${editorLineHeight}` 
      }}
    >
      {/* Node Type Indicator */}
      <div className="flex items-center gap-2 flex-grow min-w-0">
        <span
          className={`flex-shrink-0 select-none text-xs uppercase tracking-wider font-bold w-12 text-slate-400 dark:text-slate-550`}
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
