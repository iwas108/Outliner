import React, { useRef, useState } from 'react';
import { X, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Project, ReviewComment } from '../../db/indexedDB';

interface ImportModalProps {
  isOpen: boolean;
  mode: 'project' | 'review';
  targetProjectId?: string; // Required when mode === 'review'
  onImportProject: (project: Project) => void;
  onImportReview: (projectId: string, comments: ReviewComment[]) => void;
  onClose: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  mode,
  targetProjectId,
  onImportProject,
  onImportReview,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = (selectedFile: File) => {
    // Limit file size to 5MB
    if (selectedFile.size > 5 * 1024 * 1024) {
      setStatus('error');
      setErrorMessage('File size exceeds the 5MB limit.');
      return;
    }

    setFile(selectedFile);
    setStatus('idle');
    setErrorMessage('');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleImport = () => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonContent = JSON.parse(e.target?.result as string);

        if (mode === 'project') {
          // Validate .otln-project schema
          if (
            !jsonContent.id ||
            !jsonContent.title ||
            !jsonContent.metadata ||
            !Array.isArray(jsonContent.nodes)
          ) {
            throw new Error('Invalid project file structure. Missing title, metadata, or outline nodes.');
          }

          const parsedProject: Project = {
            id: jsonContent.id,
            title: jsonContent.title.replace(/<\/?[^>]+(>|$)/g, ''), // Sanitize HTML tags
            createdAt: jsonContent.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            metadata: {
              writingGoal: jsonContent.metadata.writingGoal || '',
              targetAudience: jsonContent.metadata.targetAudience || '',
              researchObjective: jsonContent.metadata.researchObjective || '',
              researchQuestion: jsonContent.metadata.researchQuestion || '',
              subResearchQuestions: Array.isArray(jsonContent.metadata.subResearchQuestions)
                ? jsonContent.metadata.subResearchQuestions
                : [],
              pageSize: jsonContent.metadata.pageSize || 'A4',
              orientation: jsonContent.metadata.orientation || 'portrait',
              margins: jsonContent.metadata.margins || { top: 20, bottom: 20, left: 20, right: 20 },
            },
            nodes: jsonContent.nodes,
            commits: Array.isArray(jsonContent.commits) ? jsonContent.commits : [],
            reviews: Array.isArray(jsonContent.reviews) ? jsonContent.reviews : [],
          };

          onImportProject(parsedProject);
          setStatus('success');
        } else {
          // Validate .json review schema
          if (!targetProjectId) {
            throw new Error('Target project not specified.');
          }

          // Can contain comments directly, or comments array
          const rawComments = Array.isArray(jsonContent.comments)
            ? jsonContent.comments
            : Array.isArray(jsonContent.reviews)
            ? jsonContent.reviews
            : null;

          if (!rawComments) {
            throw new Error('Invalid review file structure. Must contain a comments array.');
          }

          const parsedComments: ReviewComment[] = rawComments.map((c: any) => ({
            id: c.id || crypto.randomUUID(),
            lineId: c.lineId || '',
            commentText: (c.commentText || c.comment || '').replace(/<\/?[^>]+(>|$)/g, ''),
            solved: !!c.solved,
          })).filter((c: ReviewComment) => c.lineId);

          if (parsedComments.length === 0) {
            throw new Error('No valid comments mapping to outline lines found in review file.');
          }

          onImportReview(targetProjectId, parsedComments);
          setStatus('success');
        }

        setTimeout(() => {
          handleClose();
        }, 1500);
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err.message || 'Malformed JSON content.');
      }
    };

    reader.onerror = () => {
      setStatus('error');
      setErrorMessage('Failed to read file.');
    };

    reader.readAsText(file);
  };

  const handleClose = () => {
    setFile(null);
    setStatus('idle');
    setErrorMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden transform scale-100 transition-all duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">
            {mode === 'project' ? 'Import Backup Project' : 'Import Review File'}
          </h3>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {mode === 'project'
              ? 'Select a compiled backup .otln-project file to restore your work.'
              : 'Select an LLM review comments .json file (JSON format) containing comments matched by outline IDs.'}
          </p>

          {/* Drag & Drop Area */}
          {status === 'idle' && (
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerFileSelect}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                dragActive
                  ? 'border-purple-500 bg-purple-50/20 dark:bg-purple-950/10'
                  : 'border-slate-300 dark:border-slate-700 hover:border-purple-400 hover:bg-slate-50 dark:hover:bg-slate-950/20'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                accept={mode === 'project' ? '.otln-project,application/json' : '.json,application/json'}
                className="hidden"
              />
              <Upload className="w-8 h-8 text-slate-400 mb-2 stroke-1" />
              {file ? (
                <div className="text-sm font-semibold text-purple-600 dark:text-purple-400 break-all px-2">
                  {file.name}
                  <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-normal">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              ) : (
                <>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Click to upload or drag & drop
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium">
                    JSON files up to 5MB
                  </p>
                </>
              )}
            </div>
          )}

          {/* Success Status */}
          {status === 'success' && (
            <div className="flex flex-col items-center justify-center py-6 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-12 h-12 mb-2" />
              <span className="text-sm font-bold">Import Successful!</span>
              <span className="text-xs text-slate-450 dark:text-slate-500 mt-1">Applying changes...</span>
            </div>
          )}

          {/* Error Status */}
          {status === 'error' && (
            <div className="flex flex-col items-center justify-center py-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl px-4 text-center">
              <AlertCircle className="w-6 h-6 text-rose-500 mb-1.5" />
              <span className="text-xs font-bold text-rose-700 dark:text-rose-400">Import Error</span>
              <span className="text-[11px] text-rose-600 dark:text-rose-350/90 mt-1 leading-relaxed">
                {errorMessage}
              </span>
              <button
                onClick={() => {
                  setStatus('idle');
                  setFile(null);
                }}
                className="mt-3 text-[10px] font-bold text-purple-650 dark:text-purple-400 hover:underline"
              >
                Try Another File
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200/80 dark:border-slate-800/80">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-850 border border-slate-350 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Close
          </button>
          {status === 'idle' && (
            <button
              type="button"
              onClick={handleImport}
              disabled={!file}
              className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow transition-colors"
            >
              Import Data
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
