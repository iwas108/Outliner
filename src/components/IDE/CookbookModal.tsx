import React from 'react';
import { X, BookOpen, Layers, CheckCircle2, Link, BookText } from 'lucide-react';

interface CookbookModalProps {
  onClose: () => void;
}

export const CookbookModal: React.FC<CookbookModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <header className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div>
            <h3 className="text-sm font-black text-slate-850 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-500" />
              Outlining Cookbook & Rules
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
              Clear diagnostics & write perfect academic outlines
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Form body / Content */}
        <div className="p-6 flex flex-col gap-6 overflow-y-auto">

          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-500" />
              1. Structural Hierarchy
            </h4>
            <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <p className="mb-2">A valid outline must follow a strict depth progression:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong className="text-slate-800 dark:text-slate-200">Depth 0 (Section):</strong> The root level. Every outline must start here.</li>
                <li><strong className="text-slate-800 dark:text-slate-200">Depth 1 (Topic):</strong> Must be a child of a Section.</li>
                <li><strong className="text-slate-800 dark:text-slate-200">Depth 2+ (Question):</strong> Must be a child of a Topic (or an Answer). Every Question must have at least one indented Answer.</li>
                <li><strong className="text-slate-800 dark:text-slate-200">Depth 3+ (Answer):</strong> Must be a child of a Question. Cannot exist on its own.</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
              2. Syntax Validation (5W1H)
            </h4>
            <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <p className="mb-2">Questions and Answers have strict formulation rules:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong className="text-slate-800 dark:text-slate-200">Questions:</strong> Must contain a "5W1H" word (<span className="italic">Who, What, Where, When, Why, How, Which, Whom</span>) AND must end with a question mark (<span className="font-mono text-purple-500">?</span>).</li>
                <li><strong className="text-slate-800 dark:text-slate-200">Answers:</strong> Must <strong>not</strong> contain any question marks.</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
              <Link className="w-3.5 h-3.5 text-blue-500" />
              3. Keyword Chaining (Semantic Cohesion)
            </h4>
            <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <p className="mb-2">To prevent fragmented arguments, nodes must chain together using shared keywords (excluding common stop words like "the", "and"):</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong className="text-slate-800 dark:text-slate-200">Questions:</strong> Must share at least one keyword with the Answer(s) of the previous sibling question. (The very first question in a topic introduces the thread and has no chaining requirement).</li>
                <li><strong className="text-slate-800 dark:text-slate-200">First Answer:</strong> Must share at least one keyword with its parent Question.</li>
                <li><strong className="text-slate-800 dark:text-slate-200">Subsequent Answers:</strong> Must share a keyword with the preceding sibling Answer OR the parent Question.</li>
              </ul>
              <p className="mt-2 text-[10px] italic text-slate-500 dark:text-slate-400">Note: Sections and Topics are structural headers and do not participate in keyword chaining.</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
              <BookText className="w-3.5 h-3.5 text-rose-500" />
              4. Scientific Paper Best Practices
            </h4>
            <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <ul className="list-disc pl-5 space-y-2">
                <li><strong className="text-slate-800 dark:text-slate-200">Start with a Clear Objective:</strong> Make sure your primary Research Question (MRQ) guides the entire structure.</li>
                <li><strong className="text-slate-800 dark:text-slate-200">Logical Progression:</strong> Ensure each Topic flows naturally into the next. The argument should build cumulatively.</li>
                <li><strong className="text-slate-800 dark:text-slate-200">Concise Phrasing:</strong> Keep Questions direct and Answers substantive but focused. Avoid circular reasoning or repeating the question in the answer.</li>
                <li><strong className="text-slate-800 dark:text-slate-200">MECE Principle:</strong> Make your sub-topics Mutually Exclusive and Collectively Exhaustive to cover the scope without overlap.</li>
              </ul>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
