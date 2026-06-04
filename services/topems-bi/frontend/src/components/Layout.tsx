import { LayoutDashboard, BarChart3, PieChart, Settings, Menu, X, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'

interface LayoutProps {
  children: React.ReactNode
  currentPage: string
  onPageChange: (page: string) => void
  onModuleSelect?: (moduleId: string) => void
}

const menuItems = [
  { id: 'dashboard', label: '数据大屏', icon: LayoutDashboard },
  { id: 'analytics', label: '概览分析', icon: BarChart3 },
  { id: 'dashboards', label: '仪表盘管理', icon: PieChart },
  { id: 'reports', label: '报表管理', icon: BarChart3 },
]

const modules = [
  { id: 'development', label: '研发管理', icon: '🔬' },
  { id: 'quality', label: '质量管理', icon: '✅' },
  { id: 'production', label: '生产数据', icon: '🏭' },
  { id: 'laboratory', label: '实验室', icon: '🧪' },
  { id: 'ehs', label: '安全环保', icon: '🛡️' },
  { id: 'srm', label: '供应链', icon: '📦' },
]

export function Layout({ children, currentPage, onPageChange, onModuleSelect }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [modulesOpen, setModulesOpen] = useState(false)

  return (
    <div className="flex h-screen bg-gray-50">
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-16'
        } bg-white border-r border-gray-200 flex flex-col transition-all duration-300`}
      >
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="text-lg font-bold text-gray-800">TOPEMS BI</h1>
                <p className="text-xs text-gray-500">数据大屏报表中台</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPage === item.id
            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </button>
            )
          })}

          {sidebarOpen && (
            <div className="pt-4 border-t border-gray-100">
              <button
                onClick={() => setModulesOpen(!modulesOpen)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">📊</span>
                  <span>模块分析</span>
                </div>
                {modulesOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>

              {modulesOpen && (
                <div className="mt-1 space-y-1 pl-4">
                  {modules.map((module) => (
                    <button
                      key={module.id}
                      onClick={() => onModuleSelect?.(module.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                        currentPage === 'module'
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <span>{module.icon}</span>
                      <span>{module.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="p-3 border-t border-gray-200">
          <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors ${!sidebarOpen ? 'justify-center' : ''}`}>
            <Settings className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="text-sm font-medium">设置</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {new Date().toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })}
            </span>
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-blue-600">U</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}