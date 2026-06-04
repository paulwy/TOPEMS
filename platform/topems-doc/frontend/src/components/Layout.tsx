import { Outlet, Link, useLocation } from 'react-router-dom';
import { FileText, Upload, FolderOpen, Template } from 'lucide-react';

export function Layout() {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600" />
              <h1 className="ml-3 text-xl font-bold text-gray-900">
                TOPEMS-DOC
              </h1>
            </div>
            <nav className="flex space-x-1">
              <Link
                to="/"
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive('/')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                文件列表
              </Link>
              <Link
                to="/upload"
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive('/upload')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Upload className="h-4 w-4 mr-2" />
                上传文件
              </Link>
              <Link
                to="/templates"
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive('/templates')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Template className="h-4 w-4 mr-2" />
                模板管理
              </Link>
            </nav>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
