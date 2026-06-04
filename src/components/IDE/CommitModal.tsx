import React, { useState } from 'react';
import { X, GitCommit } from 'lucide-react';

interface CommitModalProps {
  onClose: () => void;
  onCommit: (message: string) => void;
}

export const CommitModal: React.FC<CommitModalProps> = ({ onClose, onCommit }) => {
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMsg = message.trim();
    if (!cleanMsg) {
      setError('Commit message cannot be empty.');
      return;
    }
    onCommit(cleanMsg);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <header className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-black text-slate-850 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
              <GitCommit className="w-4 h-4 text-purple-500" />
              Commit Version Snapshot
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
              Take a snapshot of current outline nodes & metadata
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-150 dark:border-rose-900/30 text-rose-600 dark:text-rose-455 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Commit Message / Description *
            </label>
            <input
              type="text"
              autoFocus
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Added Intro Section, Refined Main Questions"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-slate-100 text-xs focus:ring-2 focus:ring-purple-500 outline-none transition-all"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 rounded-xl transition-all shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-colors shadow-md animate-pulse-subtle"
            >
              Create Snapshot
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
