import { useState } from 'react';
import { Dashboard } from './components/Dashboard/Dashboard';
import { OutlineIDE } from './components/IDE/OutlineIDE';

function App() {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const handleEditProject = (id: string) => {
    setActiveProjectId(id);
  };

  const handleBackToDashboard = () => {
    setActiveProjectId(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {activeProjectId === null ? (
        <Dashboard onEditProject={handleEditProject} />
      ) : (
        <OutlineIDE projectId={activeProjectId} onBackToDashboard={handleBackToDashboard} />
      )}
    </div>
  );
}

export default App;
