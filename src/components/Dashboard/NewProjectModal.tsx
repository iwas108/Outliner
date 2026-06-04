import React, { useState } from 'react';
import { X } from 'lucide-react';

interface NewProjectModalProps {
  isOpen: boolean;
  onCreate: (title: string) => void;
  onClose: () => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onCreate, onClose }) => {
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim().replace(/<\/?[^>]+(>|$)/g, ''); // Simple XSS tag strip

    if (!cleanTitle) {
      setError('Project title is required.');
      return;
    }

    if (cleanTitle.length > 100) {
      setError('Project title must be under 100 characters.');
      return;
    }

    onCreate(cleanTitle);
    setTitle('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden transform scale-100 transition-all duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">
            Create New Project
          </h3>
          <button
            onClick={() => {
              setError('');
              setTitle('');
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="project-title"
                className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider"
              >
                Outline Project Title
              </label>
              <input
                id="project-title"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (error) setError('');
                }}
                placeholder="e.g. Impact of AI on Collaborative Outlining"
                maxLength={100}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-350 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                autoFocus
              />
              {error && (
                <span className="text-xs text-rose-500 font-semibold mt-1">
                  {error}
                </span>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200/80 dark:border-slate-800/80">
            <button
              type="button"
              onClick={() => {
                setError('');
                setTitle('');
                onClose();
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-850 border border-slate-350 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow focus:ring-2 focus:ring-purple-500 transition-colors"
            >
              Create Project
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
