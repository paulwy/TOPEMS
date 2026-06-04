import { useState } from 'react';
import { Layout } from './components/Layout';
import Dashboard from './components/Dashboard';
import AnalyticsOverview from './pages/AnalyticsOverview';
import DashboardList from './pages/DashboardList';
import ReportList from './pages/ReportList';
import ModuleAnalysis from './pages/ModuleAnalysis';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'analytics':
        return <AnalyticsOverview />;
      case 'dashboards':
        return <DashboardList />;
      case 'reports':
        return <ReportList />;
      case 'module':
        return selectedModule ? (
          <div>
            <button 
              onClick={() => {
                setCurrentPage('analytics');
                setSelectedModule(null);
              }}
              className="mb-4 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              ← 返回概览
            </button>
            <ModuleAnalysisWrapper moduleId={selectedModule} />
          </div>
        ) : <AnalyticsOverview />;
      default:
        return <Dashboard />;
    }
  };

  const handleModuleSelect = (moduleId: string) => {
    setSelectedModule(moduleId);
    setCurrentPage('module');
  };

  return (
    <Layout 
      currentPage={currentPage} 
      onPageChange={setCurrentPage}
      onModuleSelect={handleModuleSelect}
    >
      {renderPage()}
    </Layout>
  );
}

const ModuleAnalysisWrapper = ({ moduleId }: { moduleId: string }) => {
  const params = { moduleId };
  return ModuleAnalysis({ params });
};

export default App;