import React from "react";
import { Clock, LogOut, Zap } from "lucide-react";
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
    <header className="bg-[#1e293b]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  TOPEMS
                </h1>
                <span className="text-xs text-slate-400 hidden md:inline">
                  化工新材料数字化平台
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden md:flex items-center space-x-2 text-sm text-slate-400">
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

            <div className="flex items-center space-x-3 pl-4 border-l border-white/10">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-lg">
                {user?.username?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="hidden md:block">
                <div className="text-sm font-medium text-white">
                  {user?.full_name || user?.username}
                </div>
                <div className="text-xs text-slate-400">{getRoleName()}</div>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="p-2.5 hover:bg-white/10 rounded-lg transition-all text-slate-300 hover:text-red-400 hover:bg-red-500/10"
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