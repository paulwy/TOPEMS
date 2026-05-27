import React from 'react';
import SampleList from './pages/SampleList';
import InspectionProcessList from './pages/InspectionProcessList';
import InspectionTaskList from './pages/InspectionTaskList';
import InstrumentList from './pages/InstrumentList';
import AuditLogList from './pages/AuditLogList';
import ReagentList from './pages/ReagentList';
import { ToastContainer } from './components';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = React.useState('samples');

  const renderContent = () => {
    switch (activeTab) {
      case 'samples':
        return <SampleList />;
      case 'processes':
        return <InspectionProcessList />;
      case 'tasks':
        return <InspectionTaskList />;
      case 'instruments':
        return <InstrumentList />;
      case 'audit':
        return <AuditLogList />;
      case 'reagents':
        return <ReagentList />;
      default:
        return <SampleList />;
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
                  TOPEMS-LIMS 实验室管理
                </h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <button
                  onClick={() => setActiveTab('samples')}
                  className={`${
                    activeTab === 'samples'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  样品管理
                </button>
                <button
                  onClick={() => setActiveTab('processes')}
                  className={`${
                    activeTab === 'processes'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  检验流程
                </button>
                <button
                  onClick={() => setActiveTab('tasks')}
                  className={`${
                    activeTab === 'tasks'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  检验任务
                </button>
                <button
                  onClick={() => setActiveTab('instruments')}
                  className={`${
                    activeTab === 'instruments'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  仪器管理
                </button>
                <button
                  onClick={() => setActiveTab('reagents')}
                  className={`${
                    activeTab === 'reagents'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  试剂管理
                </button>
                <button
                  onClick={() => setActiveTab('audit')}
                  className={`${
                    activeTab === 'audit'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  审计追踪
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {renderContent()}
      </main>
      <ToastContainer />
    </div>
  };
}

export default App;
