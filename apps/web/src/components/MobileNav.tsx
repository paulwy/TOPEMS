/**
 * @deprecated 此组件已弃用，请使用 @/components/layout/MobileNav 中的 MobileNav 组件
 * 该组件将保留作为向后兼容，预计在未来的版本中移除
 */
import React from 'react';
import { Home, FileText, Bot, GitBranch, Shield, Users, Factory, BarChart3 } from 'lucide-react';

interface MobileNavProps {
  currentPage: string;
  onNavigate: (_page: string) => void;
}

const navItems = [
  { id: 'dashboard', label: '首页', icon: Home },
  { id: 'documents', label: '文档', icon: FileText },
  { id: 'ai', label: 'AI', icon: Bot },
  { id: 'qms', label: '质量', icon: Shield },
  { id: 'ehs', label: '安全', icon: GitBranch },
  { id: 'srm', label: '供应商', icon: Users },
  { id: 'pdm', label: '生产', icon: Factory },
  { id: 'bi', label: '报表', icon: BarChart3 },
];

const MobileNav: React.FC<MobileNavProps> = ({ currentPage, onNavigate }) => {
  return (
    <nav className='fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden'>
      <div className='flex justify-around items-center h-16'>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={20} />
              <span className='text-xs mt-1'>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNav;
