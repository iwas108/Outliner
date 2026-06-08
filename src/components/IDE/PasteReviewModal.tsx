import React, { useState } from 'react';
import type { OutlineNode, ReviewComment } from '../../db/indexedDB';
import { X, AlertCircle } from 'lucide-react';

interface PasteReviewModalProps {
  nodes: OutlineNode[];
  onClose: () => void;
  onSaveReviews: (comments: ReviewComment[]) => void;
}

export const PasteReviewModal: React.FC<PasteReviewModalProps> = ({
  nodes,
  onClose,
  onSaveReviews,
}) => {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleValidateAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const text = jsonText.trim();
    if (!text) {
      setError('Feedback text cannot be empty.');
      return;
    }

    try {
      const parsed = JSON.parse(text);

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Input must be a valid JSON object.');
      }

      if (!Array.isArray(parsed.comments)) {
        throw new Error('JSON must contain a "comments" array.');
      }

      const validComments: ReviewComment[] = [];
      const nodeIds = new Set(nodes.map((n) => n.id));

      for (let i = 0; i < parsed.comments.length; i++) {
        const item = parsed.comments[i];
        if (!item || typeof item !== 'object') {
          throw new Error(`Comment at index ${i} is not a valid object.`);
        }

        const { lineId, commentText } = item;

        if (typeof lineId !== 'string' || !lineId.trim()) {
          throw new Error(`Comment at index ${i} is missing a valid "lineId".`);
        }

        if (typeof commentText !== 'string' || !commentText.trim()) {
          throw new Error(`Comment at index ${i} is missing a valid "commentText".`);
        }

        // Only keep comments that map to existing lines
        if (nodeIds.has(lineId)) {
          // Generate a local comment UUID
          const uuid = crypto.randomUUID();
          validComments.push({
            id: uuid,
            lineId: lineId.trim(),
            commentText: commentText.trim(),
            solved: false,
          });
        }
      }

      if (validComments.length === 0) {
        setError('No comments in the JSON mapped to existing outline line IDs.');
        return;
      }

      onSaveReviews(validComments);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to parse JSON. Please check formatting.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <header className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-black text-slate-850 dark:text-slate-100 uppercase tracking-wide">
              Import LLM Review Feedback
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
              Paste the JSON critique response back from your model
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Form body */}
        <form onSubmit={handleValidateAndSubmit} className="flex-grow flex flex-col p-6 gap-4 overflow-y-auto">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-150 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          <div className="flex flex-col gap-1.5 flex-grow">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              JSON Critique Object
            </label>
            <textarea
              rows={12}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder='{
  "comments": [
    {
      "lineId": "uuid-here",
      "commentText": "Logical link here is missing context."
    }
  ]
}'
              className="w-full flex-grow p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-mono focus:ring-2 focus:ring-purple-500 outline-none text-slate-800 dark:text-slate-100 transition-all resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 rounded-xl transition-all shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-colors shadow-md"
            >
              Validate & Import
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
