import { useState } from 'react'
import EmployeeList from './pages/EmployeeList'
import DepartmentList from './pages/DepartmentList'
import ContractList from './pages/ContractList'
import AttendanceList from './pages/AttendanceList'

function App() {
  const [activeTab, setActiveTab] = useState('employee')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-slate-900">TOPEMS-HRM 人力资源管理系统</h1>
          <p className="text-slate-600 mt-2">员工、部门、合同与考勤管理</p>
        </div>
      </header>

      <nav className="bg-white shadow-sm border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8">
            {[
              { key: 'employee', label: '员工管理' },
              { key: 'department', label: '部门管理' },
              { key: 'contract', label: '合同管理' },
              { key: 'attendance', label: '考勤管理' }
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
        {activeTab === 'employee' && <EmployeeList />}
        {activeTab === 'department' && <DepartmentList />}
        {activeTab === 'contract' && <ContractList />}
        {activeTab === 'attendance' && <AttendanceList />}
      </main>
    </div>
  )
}

export default App
