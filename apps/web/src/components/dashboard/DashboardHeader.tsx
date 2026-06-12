import React from "react";
import { Clock, LogOut, Bell } from "lucide-react";
import { NotificationBell } from "../notifications";
import { ModeToggle } from "../ModeToggle";
import { useAuth } from "../../hooks/useAuth";
import { useRole } from "../../hooks/useRole";

interface DashboardHeaderProps {
  onLogout: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  onLogout,
}) => {
  const { user } = useAuth();
  const { getRoleName } = useRole();
  const [currentTime, setCurrentTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              TOPEMS
            </h1>
            <span className="text-sm text-slate-500 hidden md:inline">
              化工新材料数字化平台
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 text-sm text-slate-600">
              <Clock className="w-4 h-4" />
              <span>
                {currentTime.toLocaleTimeString("zh-CN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            <NotificationBell />
            <ModeToggle />

            <div className="flex items-center space-x-2 pl-4 border-l border-slate-200">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {user?.username?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="hidden md:block">
                <div className="text-sm font-medium text-slate-900">
                  {user?.full_name || user?.username}
                </div>
                <div className="text-xs text-slate-500">{getRoleName()}</div>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 hover:text-red-600"
              title="退出登录"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
