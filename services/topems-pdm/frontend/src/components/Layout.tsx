import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const navItems = [
    { path: '/', label: '仪表盘', icon: '📊' },
    { path: '/products', label: '产品管理', icon: '📦' },
    { path: '/documents', label: '文档管理', icon: '📄' },
    { path: '/materials', label: '物料管理', icon: '🧱' },
    { path: '/versions', label: '版本管理', icon: '🔄' },
    { path: '/configs', label: '配置管理', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">🏭</span>
            <div>
              <h1 className="text-2xl font-bold">TOPEMS PDM</h1>
              <p className="text-purple-100 text-sm">产品数据管理系统</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-purple-100">👤 管理员</span>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="w-64 bg-white shadow-lg min-h-screen">
          <nav className="p-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? 'bg-purple-100 text-purple-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
