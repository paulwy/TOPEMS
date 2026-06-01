import React from 'react';
import CompanyList from './pages/CompanyList';
import DepartmentList from './pages/DepartmentList';
import EmployeeList from './pages/EmployeeList';
import AssetList from './pages/AssetList';
import AddressbookPage from './pages/AddressbookPage';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = React.useState('companies');

  const renderContent = () => {
    switch (activeTab) {
      case 'companies':
        return <CompanyList />;
      case 'departments':
        return <DepartmentList />;
      case 'employees':
        return <EmployeeList />;
      case 'assets':
        return <AssetList />;
      case 'addressbook':
        return <AddressbookPage />;
      default:
        return <CompanyList />;
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
                  TOPEMS-ERP 企业资源计划
                </h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <button
                  onClick={() => setActiveTab('companies')}
                  className={`${
                    activeTab === 'companies'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  公司管理
                </button>
                <button
                  onClick={() => setActiveTab('departments')}
                  className={`${
                    activeTab === 'departments'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  部门管理
                </button>
                <button
                  onClick={() => setActiveTab('employees')}
                  className={`${
                    activeTab === 'employees'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  员工管理
                </button>
                <button
                  onClick={() => setActiveTab('assets')}
                  className={`${
                    activeTab === 'assets'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  资产管理
                </button>
                <button
                  onClick={() => setActiveTab('addressbook')}
                  className={`${
                    activeTab === 'addressbook'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  📇 通讯录
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className={activeTab === 'addressbook' ? '' : 'max-w-7xl mx-auto py-6 sm:px-6 lg:px-8'}>
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
