import React, { useEffect, useState } from 'react';
import { ProjectTable } from './ProjectTable';
import { NewProjectModal } from './NewProjectModal';
import { ImportModal } from './ImportModal';
import { ConfirmModal } from '../Common/ConfirmModal';
import { useTheme } from '../../context/ThemeContext';
import type { ThemeOption } from '../../context/ThemeContext';
import {
  saveProject,
  getAllProjects,
  deleteProject,
} from '../../db/indexedDB';
import type {
  Project,
  ReviewComment,
} from '../../db/indexedDB';
import {
  Plus,
  Upload,
  Sun,
  Moon,
  Monitor,
  FolderOpen,
  Settings,
  HelpCircle,
} from 'lucide-react';

interface DashboardProps {
  onEditProject: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onEditProject }) => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [importMode, setImportMode] = useState<'project' | 'review'>('project');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [targetProjectId, setTargetProjectId] = useState<string | undefined>(undefined);

  // Confirm Delete Modal states
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteProjectId, setDeleteProjectId] = useState('');
  const [deleteProjectTitle, setDeleteProjectTitle] = useState('');

  const loadProjects = async () => {
    setLoading(true);
    try {
      const list = await getAllProjects();
      // Sort projects by updated date descending
      list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setProjects(list);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreateProject = async (title: string) => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        writingGoal: '',
        targetAudience: '',
        researchObjective: '',
        researchQuestion: '',
        subResearchQuestions: [],
        pageSize: 'A4',
        orientation: 'portrait',
        margins: { top: 20, bottom: 20, left: 20, right: 20 },
      },
      nodes: [],
      commits: [],
      reviews: [],
    };

    try {
      await saveProject(newProject);
      await loadProjects();
      onEditProject(newProject.id); // Direct navigation to new outline IDE
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  const handleImportProject = async (importedProject: Project) => {
    try {
      // Overwrites existing project with same ID or creates a new one
      await saveProject(importedProject);
      await loadProjects();
    } catch (err) {
      console.error('Failed to import project:', err);
    }
  };

  const handleImportReview = async (projectId: string, comments: ReviewComment[]) => {
    try {
      const projectsList = await getAllProjects();
      const project = projectsList.find((p) => p.id === projectId);
      if (!project) return;

      // Add reviews
      project.reviews = [...project.reviews, ...comments];
      project.updatedAt = new Date().toISOString();

      await saveProject(project);
      await loadProjects();
    } catch (err) {
      console.error('Failed to import review comments:', err);
    }
  };

  const handleExportProject = (project: Project) => {
    try {
      const exportData = {
        ...project,
        exportDate: new Date().toISOString(),
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      // Clean name for safe filename export
      const safeTitle = project.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      link.download = `${safeTitle || 'project'}.otln-project`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export project:', err);
    }
  };

  const handleDeleteRequest = (id: string, title: string) => {
    setDeleteProjectId(id);
    setDeleteProjectTitle(title);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteProject(deleteProjectId);
      await loadProjects();
    } catch (err) {
      console.error('Failed to delete project:', err);
    } finally {
      setDeleteProjectId('');
      setDeleteProjectTitle('');
    }
  };

  const handleImportReviewRequest = (id: string) => {
    setTargetProjectId(id);
    setImportMode('review');
    setIsImportOpen(true);
  };

  const themeOptions: { option: ThemeOption; label: string; icon: React.ReactNode }[] = [
    { option: 'light', label: 'Light', icon: <Sun className="w-3.5 h-3.5" /> },
    { option: 'dark', label: 'Dark', icon: <Moon className="w-3.5 h-3.5" /> },
    { option: 'system', label: 'System', icon: <Monitor className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8 min-h-screen">

      {/* Header bar */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200/80 dark:border-slate-800/80 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
            Outline Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            Build and validate structured research paper outline trees.
          </p>
        </div>

        <div className="flex items-center gap-4 self-stretch md:self-auto justify-between md:justify-end">
          {/* Theme Controls */}
          <div className="flex bg-slate-200/50 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200 dark:border-slate-800/80">
            {themeOptions.map(({ option, label, icon }) => (
              <button
                key={option}
                onClick={() => setTheme(option)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${theme === option
                  ? 'dark:bg-slate-800 shadow-sm text-purple-600 dark:text-purple-300'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200'
                  }`}
              >
                {icon}
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Hero Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass rounded-2xl shadow-sm border border-slate-200 dark:border-slate-850 p-6 flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-450 border border-purple-200/40 dark:border-purple-900/20">
            <FolderOpen className="w-6 h-6 stroke-1.5" />
          </div>
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Total Outlines
            </span>
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {projects.length}
            </span>
          </div>
        </div>

        <div className="glass rounded-2xl shadow-sm border border-slate-200 dark:border-slate-850 p-6 flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-455 border border-indigo-200/40 dark:border-indigo-900/20">
            <Plus className="w-6 h-6 stroke-1.5" />
          </div>
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Theme Mode
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase">
              {resolvedTheme} ({theme})
            </span>
          </div>
        </div>

        <div className="glass rounded-2xl shadow-sm border border-slate-200 dark:border-slate-850 p-6 flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-450 border border-emerald-200/40 dark:border-emerald-900/20">
            <Settings className="w-6 h-6 stroke-1.5" />
          </div>
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Storage Engine
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              IndexedDB (Local)
            </span>
          </div>
        </div>
      </section>

      {/* Projects Controls Bar */}
      <section className="flex justify-between items-center bg-slate-100/50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/65">
        <h2 className="text-md font-bold text-slate-800 dark:text-slate-200 px-1">
          Saved Projects
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setImportMode('project');
              setIsImportOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm transition-all"
          >
            <Upload className="w-3.5 h-3.5" />
            Import Backup
          </button>
          <button
            onClick={() => setIsNewOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-xl text-xs font-bold text-white shadow transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            New Project
          </button>
        </div>
      </section>

      {/* Projects List/Table */}
      <main className="flex-grow">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-550">
            <RefreshCw className="w-8 h-8 animate-spin text-purple-500 mb-2" />
            <p className="text-xs font-medium">Loading outlines...</p>
          </div>
        ) : (
          <ProjectTable
            projects={projects}
            onEdit={onEditProject}
            onExport={handleExportProject}
            onDeleteRequest={handleDeleteRequest}
            onImportReviewRequest={handleImportReviewRequest}
          />
        )}
      </main>

      {/* Modals Container */}
      <NewProjectModal
        isOpen={isNewOpen}
        onCreate={handleCreateProject}
        onClose={() => setIsNewOpen(false)}
      />

      <ImportModal
        isOpen={isImportOpen}
        mode={importMode}
        targetProjectId={targetProjectId}
        onImportProject={handleImportProject}
        onImportReview={handleImportReview}
        onClose={() => {
          setIsImportOpen(false);
          setTargetProjectId(undefined);
        }}
      />

      <ConfirmModal
        isOpen={isDeleteOpen}
        title="Delete Project"
        message={`Are you sure you want to permanently delete the outline project "${deleteProjectTitle}"? This action is destructive and cannot be undone.`}
        confirmLabel="Delete permanently"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onClose={() => setIsDeleteOpen(false)}
      />

      {/* Help info footer */}
      <footer className="flex justify-between items-center border-t border-slate-200 dark:border-slate-800/80 pt-6 text-[10px] text-slate-400 dark:text-slate-500">
        <div className="flex items-center gap-1.5 font-medium">
          <HelpCircle className="w-3.5 h-3.5 stroke-1" />
          Offline-first: Data remains on your device.
        </div>
        <div>
          Version 1.0.0
        </div>
      </footer>

    </div>
  );
};

// Help helper for spinning refresh icons
const RefreshCw: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M16 3h5v5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M8 21H3v-5" />
  </svg>
);
