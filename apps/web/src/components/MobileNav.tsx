import React from "react";
import {
  Home,
  FileText,
  Bot,
  GitBranch,
  Shield,
  Users,
  Factory,
  BarChart3,
} from "lucide-react";

interface MobileNavProps {
  currentPage: string;
  onNavigate: (_page: string) => void;
}

const navItems = [
  { id: "dashboard", label: "首页", icon: Home },
  { id: "documents", label: "文档", icon: FileText },
  { id: "ai", label: "AI", icon: Bot },
  { id: "qms", label: "质量", icon: Shield },
  { id: "ehs", label: "安全", icon: GitBranch },
  { id: "srm", label: "供应商", icon: Users },
  { id: "pdm", label: "生产", icon: Factory },
  { id: "lims", label: "检测", icon: BarChart3 },
];

const MobileNav: React.FC<MobileNavProps> = ({ currentPage, onNavigate }) => {
  return (
    <div className="mobile-menu mobile-only">
      <div className="grid grid-cols-4 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(`/${item.id}`)}
              className={`mobile-nav-item ${isActive ? "active" : "inactive"}`}
            >
              <Icon size={20} />
              <span className="text-xs mt-0.5">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MobileNav;
