import React, { useState } from 'react';
import type { ProjectMetadata } from '../../db/indexedDB';
import { Save, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface MetadataEditorProps {
  initialMetadata: ProjectMetadata;
  initialTitle: string;
  onSave: (metadata: ProjectMetadata, title: string) => void;
  showCancel?: boolean;
  onCancel?: () => void;
}

export const MetadataEditor: React.FC<MetadataEditorProps> = ({
  initialMetadata,
  initialTitle,
  onSave,
  showCancel = false,
  onCancel,
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [goal, setGoal] = useState(initialMetadata.writingGoal);
  const [audience, setAudience] = useState(initialMetadata.targetAudience);
  const [objective, setObjective] = useState(initialMetadata.researchObjective);
  const [question, setQuestion] = useState(initialMetadata.researchQuestion);
  const [subQuestions, setSubQuestions] = useState<string[]>(
    initialMetadata.subResearchQuestions.length > 0 ? initialMetadata.subResearchQuestions : ['']
  );
  
  // Indentation levels
  const [maxLevel, setMaxLevel] = useState<number>(initialMetadata.maxLevel || 12);

  // PDF layout properties
  const [pageSize, setPageSize] = useState(initialMetadata.pageSize || 'A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(
    initialMetadata.orientation || 'portrait'
  );
  const [margins, setMargins] = useState(
    initialMetadata.margins || { top: 20, bottom: 20, left: 20, right: 20 }
  );

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Editor Display Spacing & Line Height
  const [editorLineSpacing, setEditorLineSpacing] = useState<number>(initialMetadata.editorLineSpacing ?? 1.5);
  const [editorLineHeight, setEditorLineHeight] = useState<number>(initialMetadata.editorLineHeight ?? 1.4);
  const [editorIndentSpacing, setEditorIndentSpacing] = useState<number>(initialMetadata.editorIndentSpacing ?? 24);
  const [editorLevelLineSpacing, setEditorLevelLineSpacing] = useState<{ [level: number]: number }>(initialMetadata.editorLevelLineSpacing || {});
  const [editorLevelLineHeight, setEditorLevelLineHeight] = useState<{ [level: number]: number }>(initialMetadata.editorLevelLineHeight || {});
  const [editorLevelIndentSpacing, setEditorLevelIndentSpacing] = useState<{ [level: number]: number }>(initialMetadata.editorLevelIndentSpacing || {});
  const [showPerLevelEditor, setShowPerLevelEditor] = useState(false);

  const handleAddSubQuestion = () => {
    setSubQuestions([...subQuestions, '']);
  };

  const handleRemoveSubQuestion = (index: number) => {
    const updated = subQuestions.filter((_, idx) => idx !== index);
    setSubQuestions(updated.length > 0 ? updated : ['']);
  };

  const handleSubQuestionChange = (index: number, val: string) => {
    const updated = [...subQuestions];
    updated[index] = val;
    setSubQuestions(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    // Validate inputs
    const cleanTitle = title.trim();
    if (!cleanTitle) newErrors.title = 'Project title is required.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const updatedMetadata: ProjectMetadata = {
      writingGoal: goal.trim(),
      targetAudience: audience.trim(),
      researchObjective: objective.trim(),
      researchQuestion: question.trim(),
      subResearchQuestions: subQuestions.map((q) => q.trim()).filter((q) => q !== ''),
      pageSize,
      orientation,
      margins,
      maxLevel,
      editorLineSpacing,
      editorLineHeight,
      editorIndentSpacing,
      editorLevelLineSpacing: Object.keys(editorLevelLineSpacing).length > 0 ? editorLevelLineSpacing : undefined,
      editorLevelLineHeight: Object.keys(editorLevelLineHeight).length > 0 ? editorLevelLineHeight : undefined,
      editorLevelIndentSpacing: Object.keys(editorLevelIndentSpacing).length > 0 ? editorLevelIndentSpacing : undefined,
    };

    onSave(updatedMetadata, cleanTitle);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto flex flex-col gap-6 p-1">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Column: Academic Metadata */}
        <div className="glass rounded-2xl p-6 border border-slate-200 dark:border-slate-850 flex flex-col gap-5">
          <h2 className="text-lg font-bold border-b border-slate-200 dark:border-slate-800 pb-2.5">
            Outline Details
          </h2>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Project Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors({});
              }}
              placeholder="Enter project title"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-350 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all"
            />
            {errors.title && <span className="text-xs text-rose-500 font-semibold">{errors.title}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Writing Goal
            </label>
            <textarea
              rows={2}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="What is the overall goal of this writing project?"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-350 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all resize-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Target Audience
            </label>
            <input
              type="text"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g. Peer reviewers, general public, industry experts"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-350 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Main Research Objective
            </label>
            <input
              type="text"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="State the core objective of this study"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-350 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Outline Indentation Levels (Max Depth)
            </label>
            <select
              value={maxLevel}
              onChange={(e) => setMaxLevel(parseInt(e.target.value) || 12)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-350 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all mt-0.5"
            >
              {[6, 8, 10, 12, 14, 16, 18, 20].map((level) => (
                <option key={level} value={level}>
                  {level} Levels (0 to {level - 1})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Column: Research Questions & Page Options */}
        <div className="flex flex-col gap-6">
          
          {/* Research Questions Card */}
          <div className="glass rounded-2xl p-6 border border-slate-200 dark:border-slate-850 flex flex-col gap-4">
            <h2 className="text-lg font-bold border-b border-slate-200 dark:border-slate-800 pb-2.5">
              Research Formulation
            </h2>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Main Research Question (MRQ)
              </label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. How does X affect Y under Z conditions?"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-350 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Sub Research Questions (SRQs)
                </label>
                <button
                  type="button"
                  onClick={handleAddSubQuestion}
                  className="flex items-center gap-1 text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline"
                >
                  <Plus className="w-3 h-3" /> Add SRQ
                </button>
              </div>

              <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                {subQuestions.map((q, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={q}
                      onChange={(e) => handleSubQuestionChange(idx, e.target.value)}
                      placeholder={`SRQ ${idx + 1}`}
                      className="flex-grow px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveSubQuestion(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-55/20 rounded-lg transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* PDF Layout Configuration Card */}
          <div className="glass rounded-2xl p-6 border border-slate-200 dark:border-slate-850 flex flex-col gap-4">
            <h2 className="text-lg font-bold border-b border-slate-200 dark:border-slate-800 pb-2.5">
              Export formatting
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Paper Size
                </label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-350 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                >
                  <option value="A4">A4 (International)</option>
                  <option value="Letter">Letter (US)</option>
                  <option value="A5">A5 (Compact)</option>
                  <option value="Legal">Legal</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Orientation
                </label>
                <select
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value as 'portrait' | 'landscape')}
                  className="w-full px-3 py-2 rounded-lg border border-slate-350 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Margins (mm)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {Object.keys(margins).map((marginKey) => {
                  const key = marginKey as keyof typeof margins;
                  return (
                    <div key={key} className="flex flex-col gap-1">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase text-center">
                        {key}
                      </span>
                      <input
                        type="number"
                        value={margins[key]}
                        onChange={(e) =>
                          setMargins({
                            ...margins,
                            [key]: Math.max(0, parseInt(e.target.value) || 0),
                          })
                        }
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs text-center focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Editor Display Spacing Card */}
          <div className="glass rounded-2xl p-6 border border-slate-200 dark:border-slate-850 flex flex-col gap-4">
            <h2 className="text-lg font-bold border-b border-slate-200 dark:border-slate-800 pb-2.5">
              Editor Display Spacing & Line Height
            </h2>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 -mt-2">
              Adjust how the Document Outline Sheet renders line spacings, line heights, and indentation widths.
            </p>

            {/* Global Line Spacing */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Global Line Spacing
                </label>
                <span className="text-xs font-mono text-slate-600 dark:text-slate-400">{editorLineSpacing.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="3.0"
                step="0.1"
                value={editorLineSpacing}
                onChange={(e) => setEditorLineSpacing(parseFloat(e.target.value))}
                className="w-full accent-purple-600 animate-pulse-subtle"
              />
              <div className="flex justify-between text-[9px] text-slate-400 dark:text-slate-600">
                <span>Compact (1.0x)</span>
                <span>Spacious (3.0x)</span>
              </div>
            </div>

            {/* Global Line Height */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Global Line Height
                </label>
                <span className="text-xs font-mono text-slate-600 dark:text-slate-400">{editorLineHeight.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="3.0"
                step="0.1"
                value={editorLineHeight}
                onChange={(e) => setEditorLineHeight(parseFloat(e.target.value))}
                className="w-full accent-purple-600 animate-pulse-subtle"
              />
              <div className="flex justify-between text-[9px] text-slate-400 dark:text-slate-600">
                <span>Compact (1.0x)</span>
                <span>Spacious (3.0x)</span>
              </div>
            </div>

            {/* Global Indent Spacing */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Global Indent Width
                </label>
                <span className="text-xs font-mono text-slate-600 dark:text-slate-400">{editorIndentSpacing}px</span>
              </div>
              <input
                type="range"
                min="8"
                max="64"
                step="4"
                value={editorIndentSpacing}
                onChange={(e) => setEditorIndentSpacing(parseInt(e.target.value))}
                className="w-full accent-purple-600 animate-pulse-subtle"
              />
              <div className="flex justify-between text-[9px] text-slate-400 dark:text-slate-600">
                <span>Narrow (8px)</span>
                <span>Wide (64px)</span>
              </div>
            </div>

            {/* Per-Level Toggle */}
            <button
              type="button"
              onClick={() => setShowPerLevelEditor(!showPerLevelEditor)}
              className="flex items-center gap-1.5 text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer self-start mt-1"
            >
              {showPerLevelEditor ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showPerLevelEditor ? 'Hide' : 'Show'} Per-Level Overrides
            </button>

            {showPerLevelEditor && (
              <div className="flex flex-col gap-3 border-t border-slate-100 dark:border-slate-800 pt-3 max-h-[280px] overflow-y-auto pr-1">
                {Array.from({ length: maxLevel }, (_, i) => i).map((level) => {
                  const typeLabel = level === 0 ? 'Section' : level === 1 ? 'Topic' : level % 2 === 0 ? 'Question' : 'Answer';
                  const hasOverride = 
                    editorLevelLineSpacing[level] !== undefined || 
                    editorLevelLineHeight[level] !== undefined ||
                    editorLevelIndentSpacing[level] !== undefined;
                  return (
                    <div key={level} className={`flex flex-col gap-2 p-3 rounded-lg border transition-all ${
                      hasOverride
                        ? 'bg-purple-50/30 dark:bg-purple-950/10 border-purple-200/50 dark:border-purple-900/30'
                        : 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800/50'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          Level {level} — {typeLabel}
                        </span>
                        {hasOverride && (
                          <button
                            type="button"
                            onClick={() => {
                              const newLS = { ...editorLevelLineSpacing };
                              const newLH = { ...editorLevelLineHeight };
                              const newIS = { ...editorLevelIndentSpacing };
                              delete newLS[level];
                              delete newLH[level];
                              delete newIS[level];
                              setEditorLevelLineSpacing(newLS);
                              setEditorLevelLineHeight(newLH);
                              setEditorLevelIndentSpacing(newIS);
                            }}
                            className="text-[9px] font-bold text-rose-500 hover:text-rose-700 cursor-pointer"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {/* Level Line Spacing */}
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between">
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold">Spacing</span>
                            <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400">
                              {(editorLevelLineSpacing[level] ?? editorLineSpacing).toFixed(1)}x
                            </span>
                          </div>
                          <input
                            type="range"
                            min="1.0"
                            max="3.0"
                            step="0.1"
                            value={editorLevelLineSpacing[level] ?? editorLineSpacing}
                            onChange={(e) => setEditorLevelLineSpacing({ ...editorLevelLineSpacing, [level]: parseFloat(e.target.value) })}
                            className="w-full accent-purple-500 h-1"
                          />
                        </div>

                        {/* Level Line Height */}
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between">
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold">Height</span>
                            <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400">
                              {(editorLevelLineHeight[level] ?? editorLineHeight).toFixed(1)}x
                            </span>
                          </div>
                          <input
                            type="range"
                            min="1.0"
                            max="3.0"
                            step="0.1"
                            value={editorLevelLineHeight[level] ?? editorLineHeight}
                            onChange={(e) => setEditorLevelLineHeight({ ...editorLevelLineHeight, [level]: parseFloat(e.target.value) })}
                            className="w-full accent-purple-500 h-1"
                          />
                        </div>

                        {/* Level Indent Width */}
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between">
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold">Indent</span>
                            <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400">
                              {editorLevelIndentSpacing[level] ?? editorIndentSpacing}px
                            </span>
                          </div>
                          <input
                            type="range"
                            min="8"
                            max="64"
                            step="4"
                            value={editorLevelIndentSpacing[level] ?? editorIndentSpacing}
                            onChange={(e) => setEditorLevelIndentSpacing({ ...editorLevelIndentSpacing, [level]: parseInt(e.target.value) })}
                            className="w-full accent-purple-500 h-1"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800 pt-6">
        {showCancel && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-850 border border-slate-350 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="flex items-center justify-center gap-2 px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow focus:ring-2 focus:ring-purple-500 transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          Save Configurations
        </button>
      </div>
    </form>
  );
};
