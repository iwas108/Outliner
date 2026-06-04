import React, { useEffect, useState, useCallback } from 'react';
import { getProject, saveProject, getConfig, saveConfig } from '../../db/indexedDB';
import type { Project, ProjectMetadata, OutlineNode } from '../../db/indexedDB';
import { MetadataEditor } from './MetadataEditor';
import { OutlineEditor } from './OutlineEditor';
import { AnalysisSidebar } from './AnalysisSidebar';
import { ExportView } from './ExportView';
import { ReviewView } from './ReviewView';
import { getKeywordColors } from '../../utils/analyzer';
import { useTheme } from '../../context/ThemeContext';
import { ArrowLeft, CheckCircle2, RefreshCw } from 'lucide-react';

interface OutlineIDEProps {
  projectId: string;
  onBackToDashboard: () => void;
}

type TabType = 'metadata' | 'editing' | 'export' | 'review';

export const OutlineIDE: React.FC<OutlineIDEProps> = ({ projectId, onBackToDashboard }) => {
  const { resolvedTheme } = useTheme();
  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('editing');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [debounceTimeout, setDebounceTimeout] = useState<any | null>(null);
  const [colorTaggingEnabled, setColorTaggingEnabled] = useState(false);
  const [showStructureLine, setShowStructureLine] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  // Load project and config on mount
  useEffect(() => {
    const loadProjectData = async () => {
      try {
        const data = await getProject(projectId);
        if (data) {
          setProject(data);

          // Force user to Metadata tab first if the writing goal is completely empty
          if (!data.metadata.writingGoal && data.nodes.length === 0) {
            setActiveTab('metadata');
          }
        }

        // Load color tagging and structure line configs
        const savedColorConfig = await getConfig('colorTagging');
        if (typeof savedColorConfig === 'boolean') {
          setColorTaggingEnabled(savedColorConfig);
        }
        const savedShowStructureLine = await getConfig('showStructureLine');
        if (typeof savedShowStructureLine === 'boolean') {
          setShowStructureLine(savedShowStructureLine);
        }
      } catch (err) {
        console.error('Failed to load project details:', err);
      }
    };
    loadProjectData();
  }, [projectId]);

  // Debounced save utility
  const triggerAutosave = useCallback((updatedProject: Project) => {
    setSaveStatus('saving');

    // Clear existing timeout
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(async () => {
      try {
        await saveProject(updatedProject);
        setSaveStatus('saved');
      } catch (err) {
        console.error('Autosave failed:', err);
        setSaveStatus('error');
      }
    }, 800); // 800ms debounce

    setDebounceTimeout(timeout);
  }, [debounceTimeout]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout) clearTimeout(debounceTimeout);
    };
  }, [debounceTimeout]);

  const handleMetadataSave = (updatedMetadata: ProjectMetadata, updatedTitle: string) => {
    if (!project) return;

    const updatedProject: Project = {
      ...project,
      title: updatedTitle,
      metadata: updatedMetadata,
      updatedAt: new Date().toISOString(),
    };

    setProject(updatedProject);
    triggerAutosave(updatedProject);
    setActiveTab('editing'); // Shift to editor upon completing details
  };

  const handleNodesChange = (updatedNodes: OutlineNode[]) => {
    if (!project) return;

    const updatedProject: Project = {
      ...project,
      nodes: updatedNodes,
      updatedAt: new Date().toISOString(),
    };

    setProject(updatedProject);
    triggerAutosave(updatedProject);
  };

  const handleColorTaggingToggle = async (enabled: boolean) => {
    setColorTaggingEnabled(enabled);
    try {
      await saveConfig('colorTagging', enabled);
    } catch (err) {
      console.error('Failed to save color tagging preference:', err);
    }
  };

  const handleShowStructureLineToggle = async (enabled: boolean) => {
    setShowStructureLine(enabled);
    try {
      await saveConfig('showStructureLine', enabled);
    } catch (err) {
      console.error('Failed to save show structure line preference:', err);
    }
  };

  const handleFocusLine = (id: string) => {
    if (!project) return;
    const idx = project.nodes.findIndex((n) => n.id === id);
    if (idx !== -1) {
      setFocusedIndex(idx);
    }
  };

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-500 mb-2" />
        <p className="text-xs font-semibold">Loading editor configurations...</p>
      </div>
    );
  }

  // Calculate repeat keywords color palette
  const keywordColors = getKeywordColors(project.nodes, resolvedTheme === 'dark');

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 flex flex-col gap-6 min-h-screen">

      {/* Header bar */}
      <header className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center border-b border-slate-200 dark:border-slate-800 pb-5 gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-2 px-3 py-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
          </button>
          <div>
            <h1 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              {project.title}
            </h1>
            <p className="text-[10px] text-slate-400 dark:text-slate-400 font-mono mt-0.5">
              Commit: {project.commits && project.commits.length > 0
                ? `"${project.commits[0].comment}" (${new Date(project.commits[0].timestamp).toLocaleDateString()})`
                : 'No snapshots committed yet'}
            </p>
          </div>
        </div>

        {/* Status Indicators & Workflow Navigation */}
        <div className="flex items-center justify-between sm:justify-end gap-4 self-stretch sm:self-auto">
          {/* Autosave Pill */}
          <div className="flex items-center">
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-100 dark:border-emerald-900/20">
                <CheckCircle2 className="w-3 h-3" />
                Work Safe
              </span>
            )}
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 font-bold border border-blue-100 dark:border-blue-900/20">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Autosaving...
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 font-bold border border-rose-100 dark:border-rose-900/20">
                Save Error
              </span>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="flex bg-slate-200/50 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200 dark:border-slate-800/80">
            {(['metadata', 'editing', 'export', 'review'] as TabType[]).map((tab) => {
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === tab
                      ? 'bg-white dark:bg-slate-800 shadow-sm text-purple-600 dark:text-purple-300'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                  <span className="capitalize">{tab}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Workspace Render */}
      <main className="flex-grow flex flex-col justify-start">
        {activeTab === 'metadata' && (
          <MetadataEditor
            initialMetadata={project.metadata}
            initialTitle={project.title}
            onSave={handleMetadataSave}
          />
        )}

        {activeTab === 'editing' && (
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="flex-grow w-full md:w-auto">
              <OutlineEditor
                nodes={project.nodes}
                colorTaggingEnabled={colorTaggingEnabled}
                onColorTaggingToggle={handleColorTaggingToggle}
                showStructureLine={showStructureLine}
                onShowStructureLineToggle={handleShowStructureLineToggle}
                keywordColors={keywordColors}
                focusedIndex={focusedIndex}
                setFocusedIndex={setFocusedIndex}
                onNodesChange={handleNodesChange}
                maxLevel={project.metadata.maxLevel || 12}
                editorLineSpacing={project.metadata.editorLineSpacing}
                editorLineHeight={project.metadata.editorLineHeight}
                editorIndentSpacing={project.metadata.editorIndentSpacing}
                editorLevelLineSpacing={project.metadata.editorLevelLineSpacing}
                editorLevelLineHeight={project.metadata.editorLevelLineHeight}
                editorLevelIndentSpacing={project.metadata.editorLevelIndentSpacing}
              />
            </div>
            <AnalysisSidebar
              nodes={project.nodes}
              colorTaggingEnabled={colorTaggingEnabled}
              onColorTaggingToggle={handleColorTaggingToggle}
              showStructureLine={showStructureLine}
              onShowStructureLineToggle={handleShowStructureLineToggle}
              onFocusLine={handleFocusLine}
              maxLevel={project.metadata.maxLevel || 12}
            />
          </div>
        )}

        {activeTab === 'export' && (
          <ExportView
            project={project}
            onSaveProject={(updatedProject) => {
              setProject(updatedProject);
              triggerAutosave(updatedProject);
            }}
          />
        )}

        {activeTab === 'review' && (
          <ReviewView
            project={project}
            onUpdateProject={(updatedProject) => {
              setProject(updatedProject);
              triggerAutosave(updatedProject);
            }}
            onBackToDashboard={onBackToDashboard}
          />
        )}
      </main>

    </div>
  );
};
