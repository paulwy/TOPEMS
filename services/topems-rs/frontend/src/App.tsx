import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProjectList from './pages/ProjectList';
import FormulaList from './pages/FormulaList';
import ExperimentList from './pages/ExperimentList';
import PatentList from './pages/PatentList';
import MaterialTestList from './pages/MaterialTestList';
import LoginPage from './pages/LoginPage';
import { ToastContainer } from './components';
import { authApi } from './api';
import './index.css';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!authApi.isAuthenticated()) {
    return <Navigate to="/login" />;
  }
  return <>{children}</>;
};

function Dashboard() {
  const [activeTab, setActiveTab] = React.useState('projects');

  const handleLogout = () => {
    authApi.removeToken();
    window.location.href = '/login';
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'projects':
        return <ProjectList />;
      case 'formulas':
        return <FormulaList />;
      case 'experiments':
        return <ExperimentList />;
      case 'patents':
        return <PatentList />;
      case 'material-tests':
        return <MaterialTestList />;
      default:
        return <ProjectList />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">
                  TOPEMS-RS 科研研发
                </h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <button
                  onClick={() => setActiveTab('projects')}
                  className={`${
                    activeTab === 'projects'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  项目管理
                </button>
                <button
                  onClick={() => setActiveTab('formulas')}
                  className={`${
                    activeTab === 'formulas'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  配方管理
                </button>
                <button
                  onClick={() => setActiveTab('experiments')}
                  className={`${
                    activeTab === 'experiments'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  试验管理
                </button>
                <button
                  onClick={() => setActiveTab('patents')}
                  className={`${
                    activeTab === 'patents'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  专利管理
                </button>
                <button
                  onClick={() => setActiveTab('material-tests')}
                  className={`${
                    activeTab === 'material-tests'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  原料试验
                </button>
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium"
              >
                退出登录
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {renderContent()}
      </main>
      <ToastContainer />
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
