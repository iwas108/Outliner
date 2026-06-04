import React from 'react';
import { Edit2, Download, Trash2, MessageSquarePlus, Calendar, ListTodo } from 'lucide-react';
import type { Project } from '../../db/indexedDB';

interface ProjectTableProps {
  projects: Project[];
  onEdit: (id: string) => void;
  onExport: (project: Project) => void;
  onDeleteRequest: (id: string, title: string) => void;
  onImportReviewRequest: (id: string) => void;
}

export const ProjectTable: React.FC<ProjectTableProps> = ({
  projects,
  onEdit,
  onExport,
  onDeleteRequest,
  onImportReviewRequest,
}) => {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500 bg-white/40 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center">
        <ListTodo className="w-12 h-12 mb-3 stroke-1 text-purple-400" />
        <h4 className="font-semibold text-slate-800 dark:text-slate-200">No Projects Available</h4>
        <p className="text-xs text-slate-500 dark:text-slate-450 mt-1 max-w-sm">
          Get started by creating a new outline project or importing a backup `.otln-project` file.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-55/60 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-550">
              <th className="px-6 py-4">Project Title</th>
              <th className="px-6 py-4 hidden sm:table-cell">Created</th>
              <th className="px-6 py-4">Last Updated</th>
              <th className="px-6 py-4 text-center">Structure Size</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm text-slate-700 dark:text-slate-350">
            {projects.map((project) => (
              <tr
                key={project.id}
                className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors"
              >
                {/* Project Title */}
                <td className="px-6 py-4.5 font-medium text-slate-900 dark:text-slate-100">
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => onEdit(project.id)}
                      className="text-left font-bold text-slate-900 dark:text-slate-100 hover:text-purple-600 dark:hover:text-purple-400 hover:underline transition-colors"
                    >
                      {project.title}
                    </button>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono break-all hidden md:inline">
                      ID: {project.id}
                    </span>
                  </div>
                </td>

                {/* Created Date */}
                <td className="px-6 py-4.5 hidden sm:table-cell text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 stroke-1" />
                    {formatDate(project.createdAt)}
                  </div>
                </td>

                {/* Updated Date */}
                <td className="px-6 py-4.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {formatDate(project.updatedAt)}
                </td>

                {/* Nodes Count */}
                <td className="px-6 py-4.5 text-center">
                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 border border-purple-100 dark:border-purple-900/30">
                    {project.nodes.length} lines
                  </span>
                </td>

                {/* Actions */}
                <td className="px-6 py-4.5 text-right">
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => onEdit(project.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                      title="Edit Outline"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onExport(project)}
                      className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                      title="Export Project (.otln-project)"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onImportReviewRequest(project.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                      title="Import Review (.json)"
                    >
                      <MessageSquarePlus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteRequest(project.id, project.title)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-450 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                      title="Delete Project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
