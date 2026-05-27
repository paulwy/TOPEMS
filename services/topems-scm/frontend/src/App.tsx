import React from 'react';
import SupplierList from './pages/SupplierList';
import PurchaseOrderList from './pages/PurchaseOrderList';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = React.useState('suppliers');

  const renderContent = () => {
    switch (activeTab) {
      case 'suppliers':
        return <SupplierList />;
      case 'purchase-orders':
        return <PurchaseOrderList />;
      default:
        return <SupplierList />;
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
                  TOPEMS-SCM 供应链管理
                </h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <button
                  onClick={() => setActiveTab('suppliers')}
                  className={`${
                    activeTab === 'suppliers'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  供应商管理
                </button>
                <button
                  onClick={() => setActiveTab('purchase-orders')}
                  className={`${
                    activeTab === 'purchase-orders'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  采购订单
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
