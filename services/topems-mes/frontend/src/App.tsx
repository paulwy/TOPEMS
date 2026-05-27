import React from 'react';
import ProductionOrderList from './pages/ProductionOrderList';
import ProductionProcessList from './pages/ProductionProcessList';
import WorkStationList from './pages/WorkStationList';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = React.useState('orders');

  const renderContent = () => {
    switch (activeTab) {
      case 'orders':
        return <ProductionOrderList />;
      case 'processes':
        return <ProductionProcessList />;
      case 'stations':
        return <WorkStationList />;
      default:
        return <ProductionOrderList />;
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
                  TOPEMS-MES 制造执行
                </h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`${
                    activeTab === 'orders'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  生产工单
                </button>
                <button
                  onClick={() => setActiveTab('processes')}
                  className={`${
                    activeTab === 'processes'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  生产工序
                </button>
                <button
                  onClick={() => setActiveTab('stations')}
                  className={`${
                    activeTab === 'stations'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  工位管理
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
