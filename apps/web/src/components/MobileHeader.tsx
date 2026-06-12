import React from "react";
import { Menu, Bell, User } from "lucide-react";

interface MobileHeaderProps {
  title: string;
  onMenuClick?: () => void;
  hasNotifications?: boolean;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  onMenuClick,
  hasNotifications = false,
}) => {
  return (
    <header className="mobile-header mobile-only">
      <button
        onClick={onMenuClick}
        className="p-1 -ml-2 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <Menu size={24} />
      </button>
      <h1 className="text-lg font-semibold truncate flex-1 text-center px-4">
        {title}
      </h1>
      <div className="flex items-center gap-2">
        <button className="p-1 hover:bg-slate-100 rounded-lg transition-colors relative">
          <Bell size={20} />
          {hasNotifications && (
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>
        <button className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
          <User size={20} />
        </button>
      </div>
    </header>
  );
};

export default MobileHeader;
