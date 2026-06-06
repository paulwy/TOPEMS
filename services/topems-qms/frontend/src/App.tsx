import React from 'react';
import QualityStandardList from './pages/QualityStandardList';
import QualityInspectionList from './pages/QualityInspectionList';
import QualityIssueList from './pages/QualityIssueList';
import CorrectiveActionList from './pages/CorrectiveActionList';
import QmsDashboard from './pages/QmsDashboard';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = React.useState('standards');

  const renderContent = () => {
    switch (activeTab) {
      case 'standards':
        return <QualityStandardList />;
      case 'inspections':
        return <QualityInspectionList />;
      case 'issues':
        return <QualityIssueList />;
      case 'actions':
        return <CorrectiveActionList />;
      case 'dashboard':
        return <QmsDashboard />;
      default:
        return <QualityStandardList />;
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
                  TOPEMS-QMS 质量管理
                </h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`${
                    activeTab === 'dashboard'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  看板
                </button>
                <button
                  onClick={() => setActiveTab('standards')}
                  className={`${
                    activeTab === 'standards'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  质量标准
                </button>
                <button
                  onClick={() => setActiveTab('inspections')}
                  className={`${
                    activeTab === 'inspections'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  质量检查
                </button>
                <button
                  onClick={() => setActiveTab('issues')}
                  className={`${
                    activeTab === 'issues'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  质量问题
                </button>
                <button
                  onClick={() => setActiveTab('actions')}
                  className={`${
                    activeTab === 'actions'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  纠正措施
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
