import React from "react";
import {
  X,
  Activity,
  FolderKanban,
  Book,
  FileText,
  Bot,
  GitBranch,
  Settings,
  Building,
  Folder,
  Users,
  BookOpen,
  BarChart3,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: string;
  onNavigate: (path: string) => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  currentPage,
  onNavigate,
}) => {
  const { user, hasPermission } = useAuth();

  const menuItems = [
    { id: "dashboard", label: "首页", icon: Activity },
    { id: "pm", label: "项目管理", icon: FolderKanban, path: "/pm/projects" },
    { id: "addressbook", label: "通讯录", icon: Book },
    { id: "documents", label: "文档管理", icon: FileText },
    { id: "ai", label: "AI 知识库", icon: Bot },
    { id: "workflows", label: "工作流", icon: GitBranch },
    { id: "system", label: "系统管理", icon: Settings, adminOnly: true },
    { id: "companies", label: "公司管理", icon: Building, adminOnly: true },
    { id: "departments", label: "部门管理", icon: Folder, adminOnly: true },
    { id: "employees", label: "员工管理", icon: Users, adminOnly: true },
    { id: "documents", label: "文档中心", icon: BookOpen },
    { id: "bi", label: "商业智能", icon: BarChart3, path: "/bi/dashboard" },
    { id: "help", label: "帮助中心", icon: HelpCircle },
  ];

  const handleNavigate = (item: (typeof menuItems)[0]) => {
    if (item.path) {
      onNavigate(item.path);
    } else {
      const pathMap: Record<string, string> = {
        dashboard: "/dashboard",
        addressbook: "/addressbook",
        documents: "/documents",
        ai: "/ai",
        workflows: "/workflows",
        system: "/system",
        companies: "/hrm/companies",
        departments: "/hrm/departments",
        employees: "/hrm/employees",
        help: "/help",
      };
      onNavigate(pathMap[item.id] || `/${item.id}`);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-40 mobile-only"
      onClick={onClose}
    >
      <div
        className="absolute top-14 left-0 right-0 bg-white max-h-[70vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">菜单</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
          <div className="space-y-2">
            {menuItems
              .filter(
                (item) =>
                  !item.adminOnly ||
                  user?.is_superuser ||
                  hasPermission("iam:admin"),
              )
              .map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item)}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-100 transition-colors ${
                      currentPage === item.id
                        ? "bg-blue-50 text-blue-600"
                        : "text-slate-700"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};
