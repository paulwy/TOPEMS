import {
  Button,
  Card,
  CardContent,
  Box,
  Typography,
  Tooltip,
} from "@mui/material";
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

  const renderMenuItem = (
    item: (typeof hrmMenuItems)[0],
    isMobile: boolean = false,
  ) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;

    const button = (
      <Button
        key={item.path}
        onClick={() => {
          navigate(item.path);
          if (isMobile) setMobileMenuOpen(false);
        }}
        sx={{
          width: "100%",
          justifyContent: isMobile
            ? "flex-start"
            : sidebarCollapsed
              ? "center"
              : "flex-start",
          gap: 1.5,
          px: isMobile ? 2 : sidebarCollapsed ? 1 : 2,
          py: 1.5,
          borderRadius: 1,
          textTransform: "none",
          backgroundColor: isActive ? "#eff6ff" : "transparent",
          color: isActive ? "#1d4ed8" : "#475569",
          fontWeight: isActive ? 500 : 400,
          "&:hover": {
            backgroundColor: isActive ? "#eff6ff" : "#f1f5f9",
          },
        }}
      >
        <Icon style={{ width: 20, height: 20, flexShrink: 0 }} />
        {(!sidebarCollapsed || isMobile) && (
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              opacity: sidebarCollapsed && !isMobile ? 0 : 1,
              width: sidebarCollapsed && !isMobile ? 0 : "auto",
              transition: "opacity 0.2s, width 0.2s",
            }}
          >
            {item.label}
          </span>
        )}
      </Button>
    );

    if (sidebarCollapsed && !isMobile) {
      return (
        <Tooltip key={item.path} title={item.label} placement="right">
          {button}
        </Tooltip>
      );
    }

    return button;
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
      }}
    >
      {/* Header */}
      <Box
        component="header"
        sx={{
          backgroundColor: "white",
          borderBottom: "1px solid",
          borderColor: "#e2e8f0",
          position: "sticky",
          top: 0,
          zIndex: 50,
          boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        }}
      >
        <Box sx={{ maxWidth: 1280, mx: "auto", px: 2 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              height: 64,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Button
                variant="text"
                size="small"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                sx={{ display: { lg: "none" } }}
              >
                {mobileMenuOpen ? (
                  <X style={{ width: 20, height: 20 }} />
                ) : (
                  <Menu style={{ width: 20, height: 20 }} />
                )}
              </Button>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1.5,
                    background:
                      "linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Users style={{ width: 20, height: 20, color: "white" }} />
                </Box>
                <Box>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 700, fontSize: 18, color: "#0f172a" }}
                  >
                    {title}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      display: { xs: "none", sm: "block" },
                      color: "#64748b",
                    }}
                  >
                    {subtitle}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Breadcrumbs */}
            <Box
              sx={{
                display: { xs: "none", md: "flex" },
                alignItems: "center",
                gap: 0.5,
              }}
            >
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.path}>
                  {index > 0 && (
                    <ChevronRight
                      style={{
                        width: 16,
                        height: 16,
                        color: "#94a3b8",
                        margin: "0 4px",
                      }}
                    />
                  )}
                  <Button
                    onClick={() => handleBreadcrumbClick(crumb.path)}
                    sx={{
                      color:
                        index === breadcrumbs.length - 1
                          ? "#0f172a"
                          : "#64748b",
                      fontWeight: index === breadcrumbs.length - 1 ? 500 : 400,
                      fontSize: 14,
                      textTransform: "none",
                      "&:hover": { color: "#0f172a" },
                    }}
                  >
                    {crumb.label}
                  </Button>
                </React.Fragment>
              ))}
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Button
                variant="text"
                size="small"
                onClick={() => navigate("/")}
                startIcon={<Home style={{ width: 16, height: 16 }} />}
                sx={{ display: { xs: "none", sm: "flex" }, gap: 0.5 }}
              >
                返回首页
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ display: "flex", flex: 1 }}>
        {/* Mobile Sidebar */}
        <AnimatePresence mode="wait">
          {mobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: "fixed",
                  inset: 0,
                  backgroundColor: "rgba(0, 0, 0, 0.5)",
                  zIndex: 40,
                }}
                onClick={() => setMobileMenuOpen(false)}
              />
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "tween", duration: 0.2 }}
                style={{
                  position: "fixed",
                  left: 0,
                  top: 64,
                  bottom: 0,
                  width: 256,
                  backgroundColor: "white",
                  boxShadow: "4px 0 6px -1px rgb(0 0 0 / 0.1)",
                  zIndex: 50,
                  overflowY: "auto",
                  display: { xs: "block", lg: "none" } as any,
                }}
              >
                <Card sx={{ m: 2 }}>
                  <CardContent sx={{ p: 2 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 600, color: "#334155", mb: 2, px: 1 }}
                    >
                      HRM 模块
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.5,
                      }}
                    >
                      {hrmMenuItems.map((item) => renderMenuItem(item, true))}
                    </Box>
                  </CardContent>
                </Card>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Desktop Sidebar */}
        {showSidebar && (
          <Box
            component={motion.aside}
            initial={false}
            animate={{ width: sidebarCollapsed ? 64 : 200 }}
            sx={{
              display: { xs: "none", lg: "flex" },
              flexDirection: "column",
              backgroundColor: "white",
              borderRight: "1px solid",
              borderColor: "#e2e8f0",
              flexShrink: 0,
              transition: "width 0.2s",
            }}
          >
            <Box sx={{ flex: 1, p: 2 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: "#334155",
                  mb: 2,
                  overflow: "hidden",
                  opacity: sidebarCollapsed ? 0 : 1,
                  height: sidebarCollapsed ? 0 : "auto",
                  transition: "opacity 0.2s, height 0.2s",
                }}
              >
                HRM 模块
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                {hrmMenuItems.map((item) => renderMenuItem(item))}
              </Box>
            </Box>

            {/* Collapse Button */}
            <Box sx={{ p: 1, borderTop: "1px solid", borderColor: "#e2e8f0" }}>
              <Button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                sx={{
                  width: "100%",
                  justifyContent: sidebarCollapsed ? "center" : "flex-start",
                  gap: 1,
                  px: 2,
                  py: 1,
                  color: "#64748b",
                  borderRadius: 1,
                  "&:hover": { backgroundColor: "#f1f5f9", color: "#334155" },
                }}
              >
                {sidebarCollapsed ? (
                  <ChevronRight style={{ width: 16, height: 16 }} />
                ) : (
                  <>
                    <ChevronLeft style={{ width: 16, height: 16 }} />
                    <span>折叠</span>
                  </>
                )}
              </Button>
            </Box>
          </Box>
        )}

        {/* Content Area */}
        <Box
          component="main"
          sx={{ flex: 1, minWidth: 0, p: { xs: 2, sm: 3, lg: 4 } }}
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </Box>
      </Box>
    </Box>
  );
};

export default HrmLayout;
