import React from 'react';
import { UserInfo } from '../api/portal';

interface HeaderProps {
  user: UserInfo | null;
}

const Header: React.FC<HeaderProps> = ({ user }) => {
  return (
    <header className="bg-gradient-to-r from-primary-800 to-primary-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="text-2xl font-bold">
              <span className="text-yellow-400">TOPEMS</span>
            </div>
            <span className="text-sm text-primary-200">统一门户</span>
          </div>

          {user && (
            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <div className="font-medium">{user.name}</div>
                <div className="text-sm text-primary-200">{user.department}</div>
              </div>
              <div className="relative">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-10 h-10 rounded-full border-2 border-white shadow-md"
                />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
