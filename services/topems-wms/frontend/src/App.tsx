import { useState } from 'react'
import WarehouseList from './pages/WarehouseList'
import InventoryList from './pages/InventoryList'
import InboundOrderList from './pages/InboundOrderList'
import OutboundOrderList from './pages/OutboundOrderList'

function App() {
  const [activeTab, setActiveTab] = useState('warehouse')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-slate-900">TOPEMS-WMS 仓库管理系统</h1>
          <p className="text-slate-600 mt-2">仓库、库存与出入库订单管理</p>
        </div>
      </header>

      <nav className="bg-white shadow-sm border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8">
            {[
              { key: 'warehouse', label: '仓库管理' },
              { key: 'inventory', label: '库存管理' },
              { key: 'inbound', label: '入库订单' },
              { key: 'outbound', label: '出库订单' }
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
        {activeTab === 'warehouse' && <WarehouseList />}
        {activeTab === 'inventory' && <InventoryList />}
        {activeTab === 'inbound' && <InboundOrderList />}
        {activeTab === 'outbound' && <OutboundOrderList />}
      </main>
    </div>
  )
}

export default App
