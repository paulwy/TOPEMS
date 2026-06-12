import React from "react";
import { FileText, Brain, GitBranch, Clock, Bell, User } from "lucide-react";

type IconComponent = React.ComponentType<{ className?: string }>;

interface QuickAction {
  label: string;
  icon: IconComponent;
  path: string;
  color: string;
  service?: string | null;
}

interface DashboardQuickActionsProps {
  quickActions: QuickAction[];
  serviceStatuses: Record<string, boolean>;
  onQuickAccess: (path: string) => void;
}

export const DashboardQuickActions: React.FC<DashboardQuickActionsProps> = ({
  quickActions,
  serviceStatuses,
  onQuickAccess,
}) => {
  const shouldShowQuickAction = (action: QuickAction): boolean => {
    if (!action.service) return true;
    return serviceStatuses[action.service];
  };

  return (
    <div className="mb-8 bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">⚡ 快速操作</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {quickActions.filter(shouldShowQuickAction).map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={() => onQuickAccess(action.path)}
              className="flex flex-col items-center space-y-2 p-4 bg-gradient-to-br from-slate-50 to-slate-100 hover:from-blue-50 hover:to-blue-100 rounded-xl transition-all group hover:shadow-md"
            >
              <div
                className={`w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center ${action.color} group-hover:scale-110 transition-transform`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">
                {action.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const defaultQuickActions: QuickAction[] = [
  {
    label: "上传文件",
    icon: FileText,
    path: "/documents",
    color: "text-blue-500",
    service: "doc",
  },
  {
    label: "AI 问答",
    icon: Brain,
    path: "/ai",
    color: "text-purple-500",
    service: "ai",
  },
  {
    label: "发起流程",
    icon: GitBranch,
    path: "/workflows",
    color: "text-green-500",
    service: "flow",
  },
  {
    label: "我的待办",
    icon: Clock,
    path: "/flow/approvals",
    color: "text-orange-500",
    service: "flow",
  },
  {
    label: "通知中心",
    icon: Bell,
    path: "/notifications",
    color: "text-yellow-500",
    service: "notification",
  },
  {
    label: "个人中心",
    icon: User,
    path: "/profile",
    color: "text-indigo-500",
    service: null,
  },
];
