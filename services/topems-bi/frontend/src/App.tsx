import { useState } from 'react';
import { Layout } from './components/Layout';
import Dashboard from './components/Dashboard';
import AnalyticsOverview from './pages/AnalyticsOverview';
import DashboardList from './pages/DashboardList';
import ReportList from './pages/ReportList';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

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
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

export default App;