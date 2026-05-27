import { useState } from 'react'
import CustomerList from './pages/CustomerList'
import ContactList from './pages/ContactList'
import OpportunityList from './pages/OpportunityList'
import InteractionList from './pages/InteractionList'

function App() {
  const [activeTab, setActiveTab] = useState('customer')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-slate-900">TOPEMS-CRM 客户关系管理系统</h1>
          <p className="text-slate-600 mt-2">客户、联系人、商机与交互记录管理</p>
        </div>
      </header>

      <nav className="bg-white shadow-sm border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8">
            {[
              { key: 'customer', label: '客户管理' },
              { key: 'contact', label: '联系人管理' },
              { key: 'opportunity', label: '销售机会' },
              { key: 'interaction', label: '交互记录' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'customer' && <CustomerList />}
        {activeTab === 'contact' && <ContactList />}
        {activeTab === 'opportunity' && <OpportunityList />}
        {activeTab === 'interaction' && <InteractionList />}
      </main>
    </div>
  )
}

export default App
