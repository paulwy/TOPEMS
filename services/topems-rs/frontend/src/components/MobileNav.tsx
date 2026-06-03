import React, { useState } from 'react';

interface MobileNavProps {
  title: string;
  subtitle?: string;
  menuItems: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    active?: boolean;
  }[];
  rightContent?: React.ReactNode;
}

const MobileNav: React.FC<MobileNavProps> = ({ 
  title, 
  subtitle, 
  menuItems, 
  rightContent 
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* 移动端菜单按钮 */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            <div>
              <h1 className="text-xl font-bold text-slate-900">{title}</h1>
              {subtitle && (
                <p className="text-xs text-slate-500 hidden sm:block">{subtitle}</p>
              )}
            </div>
          </div>

          {/* 桌面端菜单 */}
          <nav className="hidden lg:flex items-center space-x-1">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={item.onClick}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
                  item.active
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* 右侧内容 */}
          <div className="flex items-center space-x-3">
            {rightContent}
          </div>
        </div>
      </div>

      {/* 移动端下拉菜单 */}
      {isMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white">
          <nav className="max-w-7xl mx-auto px-4 py-3 space-y-1">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  item.onClick();
                  setIsMenuOpen(false);
                }}
                className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center space-x-3 ${
                  item.active
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};

export default MobileNav;
