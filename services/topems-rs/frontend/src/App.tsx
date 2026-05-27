import React from 'react';
import ProjectList from './pages/ProjectList';
import FormulaList from './pages/FormulaList';
import ExperimentList from './pages/ExperimentList';
import PatentList from './pages/PatentList';
import MaterialTestList from './pages/MaterialTestList';
import { ToastContainer } from './components';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = React.useState('projects');

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

export default App;
