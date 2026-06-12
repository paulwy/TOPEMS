import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase,
  Calendar,
  DollarSign,
  User,
  BookOpen,
  FileText,
  BarChart3,
  Users,
  Home,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Building2,
  Users2,
  ClipboardList,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HrmLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showSidebar?: boolean;
}

const hrmMenuItems = [
  { path: "/hrm/companies", label: "公司管理", icon: Building2 },
  { path: "/hrm/departments", label: "部门管理", icon: Users2 },
  { path: "/hrm/positions", label: "岗位管理", icon: Briefcase },
  { path: "/hrm/employees", label: "员工管理", icon: Users },
  { path: "/hrm/attendance", label: "考勤管理", icon: Calendar },
  { path: "/hrm/leave", label: "请假管理", icon: ClipboardList },
  { path: "/hrm/payroll", label: "薪酬管理", icon: DollarSign },
  { path: "/hrm/performance", label: "绩效管理", icon: User },
  { path: "/hrm/recruitment", label: "招聘管理", icon: FileText },
  { path: "/hrm/contracts", label: "合同管理", icon: FileText },
  { path: "/hrm/training", label: "培训管理", icon: BookOpen },
  { path: "/hrm/reports", label: "报表统计", icon: BarChart3 },
];

const getBreadcrumbs = (
  pathname: string,
): { label: string; path: string }[] => {
  const crumbs: { label: string; path: string }[] = [
    { label: "首页", path: "/" },
    { label: "人力资源", path: "/hrm" },
  ];

  const pathMap: Record<string, string> = {
    "/hrm/companies": "公司管理",
    "/hrm/departments": "部门管理",
    "/hrm/positions": "岗位管理",
    "/hrm/employees": "员工管理",
    "/hrm/attendance": "考勤管理",
    "/hrm/leave": "请假管理",
    "/hrm/payroll": "薪酬管理",
    "/hrm/performance": "绩效管理",
    "/hrm/recruitment": "招聘管理",
    "/hrm/contracts": "合同管理",
    "/hrm/training": "培训管理",
    "/hrm/reports": "报表统计",
  };

  const currentLabel = pathMap[pathname];
  if (currentLabel) {
    crumbs.push({ label: currentLabel, path: pathname });
  }

  return crumbs;
};

export const HrmLayout: React.FC<HrmLayoutProps> = ({
  children,
  title = "人力资源管理",
  subtitle = "全面管理企业人力资源",
  showSidebar = true,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const breadcrumbs = getBreadcrumbs(location.pathname);

  const handleBreadcrumbClick = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  aria-label={mobileMenuOpen ? "关闭菜单" : "打开菜单"}
                >
                  {mobileMenuOpen ? (
                    <X className="w-5 h-5" />
                  ) : (
                    <Menu className="w-5 h-5" />
                  )}
                </Button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-slate-900">
                      {title}
                    </h1>
                    <p className="text-xs text-slate-500 hidden sm:block">
                      {subtitle}
                    </p>
                  </div>
                </div>
              </div>

              {/* Breadcrumbs */}
              <nav className="hidden md:flex items-center gap-2 text-sm">
                {breadcrumbs.map((crumb, index) => (
                  <div key={crumb.path} className="flex items-center">
                    {index > 0 && (
                      <ChevronRight className="w-4 h-4 text-slate-400 mx-1" />
                    )}
                    <button
                      onClick={() => handleBreadcrumbClick(crumb.path)}
                      className={`transition-colors ${
                        index === breadcrumbs.length - 1
                          ? "text-slate-900 font-medium"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                      aria-label={`导航到${crumb.label}`}
                    >
                      {crumb.label}
                    </button>
                  </div>
                ))}
              </nav>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/")}
                  className="gap-2"
                  aria-label="返回首页"
                >
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline">返回首页</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Mobile Sidebar */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={() => setMobileMenuOpen(false)}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "tween", duration: 0.2 }}
                className="fixed left-0 top-16 bottom-0 w-64 bg-white shadow-lg z-50 lg:hidden overflow-y-auto"
              >
                <Card className="m-4">
                  <CardContent className="p-4">
                    <h3 className="text-sm font-semibold text-slate-700 mb-4 px-3">
                      HRM 模块
                    </h3>
                    <nav className="space-y-1">
                      {hrmMenuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                          <button
                            key={item.path}
                            onClick={() => {
                              navigate(item.path);
                              setMobileMenuOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                              isActive
                                ? "bg-blue-50 text-blue-700 font-medium"
                                : "text-slate-600 hover:bg-slate-100"
                            }`}
                            aria-current={isActive ? "page" : undefined}
                          >
                            <Icon className="w-5 h-5 flex-shrink-0" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </nav>
                  </CardContent>
                </Card>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Desktop Sidebar */}
          {showSidebar && (
            <motion.aside
              initial={false}
              animate={{ width: sidebarCollapsed ? 64 : 200 }}
              className="hidden lg:flex flex-col bg-white border-r border-slate-200 flex-shrink-0"
            >
              <div className="flex-1 p-4">
                <div className="mb-4">
                  <h3
                    className={`text-sm font-semibold text-slate-700 mb-4 transition-opacity overflow-hidden ${
                      sidebarCollapsed ? "opacity-0 h-0" : "opacity-100 h-auto"
                    }`}
                  >
                    HRM 模块
                  </h3>
                </div>
                <nav className="space-y-1">
                  {hrmMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Tooltip key={item.path}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                              isActive
                                ? "bg-blue-50 text-blue-700 font-medium"
                                : "text-slate-600 hover:bg-slate-100"
                            }`}
                            aria-label={
                              sidebarCollapsed ? item.label : undefined
                            }
                            aria-current={isActive ? "page" : undefined}
                          >
                            <Icon className="w-5 h-5 flex-shrink-0" />
                            <span
                              className={`transition-opacity overflow-hidden whitespace-nowrap ${
                                sidebarCollapsed
                                  ? "opacity-0 w-0"
                                  : "opacity-100 w-auto"
                              }`}
                            >
                              {item.label}
                            </span>
                          </button>
                        </TooltipTrigger>
                        {sidebarCollapsed && (
                          <TooltipContent side="right">
                            <p>{item.label}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    );
                  })}
                </nav>
              </div>

              {/* Collapse Button */}
              <div className="p-2 border-t border-slate-200">
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  aria-label={sidebarCollapsed ? "展开侧边栏" : "折叠侧边栏"}
                >
                  {sidebarCollapsed ? (
                    <ChevronRight className="w-4 h-4" />
                  ) : (
                    <ChevronLeft className="w-4 h-4" />
                  )}
                  <span
                    className={`transition-opacity overflow-hidden whitespace-nowrap ${
                      sidebarCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
                    }`}
                  >
                    {sidebarCollapsed ? "展开" : "折叠"}
                  </span>
                </button>
              </div>
            </motion.aside>
          )}

          {/* Content Area */}
          <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-auto">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default HrmLayout;
