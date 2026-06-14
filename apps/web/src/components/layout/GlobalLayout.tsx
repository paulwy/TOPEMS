import React, { useState, useCallback } from "react";
import {
  Box,
  Button,
  IconButton,
  Typography,
  Tabs,
  Tab,
  Popover,
  Avatar,
  Badge,
  Tooltip,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Home,
  Users,
  Building2,
  Briefcase,
  BarChart3,
  Settings,
  Bell,
  ChevronDown,
  ChevronRight,
  Menu as MenuIcon,
  X,
  Sparkles,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { topNavItems, getModuleFromPath, getModuleTabs, type NavItem, type TabItem } from "../../config/navigation";
import { ModeToggle } from "../ModeToggle";
import { FloatingAIHelper } from "../ai/FloatingAIHelper";

// 模块图标映射
const moduleIcons: Record<string, React.ReactNode> = {
  hrm: <Users style={{ width: 20, height: 20 }} />,
  crm: <Building2 style={{ width: 20, height: 20 }} />,
  pm: <Briefcase style={{ width: 20, height: 20 }} />,
  bi: <BarChart3 style={{ width: 20, height: 20 }} />,
};

interface GlobalLayoutProps {
  children: React.ReactNode;
}

export const GlobalLayout: React.FC<GlobalLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("lg"));

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [openMenu, setOpenMenu] = useState<NavItem | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 获取当前模块和Tab
  const currentModule = getModuleFromPath(location.pathname);
  const moduleTabs = currentModule ? getModuleTabs(currentModule) : [];

  const handleNavHover = useCallback((event: React.MouseEvent<HTMLElement>, item: NavItem) => {
    if (item.children) {
      setAnchorEl(event.currentTarget);
      setOpenMenu(item);
    } else if (item.path) {
      navigate(item.path);
    }
  }, [navigate]);

  const handleNavLeave = useCallback(() => {
    // 延迟关闭，允许进入下拉菜单
    setTimeout(() => {
      if (!anchorEl) return;
      // 检查鼠标是否在popover内
    }, 100);
  }, [anchorEl]);

  const handleCloseMenu = useCallback(() => {
    setAnchorEl(null);
    setOpenMenu(null);
  }, []);

  const handleMenuItemClick = useCallback((item: NavItem) => {
    if (item.path) {
      navigate(item.path);
    }
    handleCloseMenu();
  }, [navigate, handleCloseMenu]);

  const isMenuOpen = Boolean(anchorEl) && Boolean(openMenu?.children);

  // 渲染下拉菜单内容
  const renderDropdownContent = (item: NavItem) => {
    if (!item.children) return null;

    // 如果是分组模式（isGroup: true），children 是分组列表
    if (item.isGroup) {
      const groups = item.children as NavItem[];
      return (
        <Box
          sx={{
            display: "flex",
            minWidth: 600,
            maxWidth: 800,
            p: 2,
            gap: 2,
          }}
          onMouseEnter={() => {
            if (anchorEl) setAnchorEl(anchorEl);
          }}
          onMouseLeave={handleCloseMenu}
        >
          {groups.map((group, idx) => (
            <Box key={idx} sx={{ minWidth: 160, flex: 1 }}>
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  color: "text.secondary",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  mb: 1,
                  px: 1,
                }}
              >
                {group.label}
              </Typography>
              {group.children?.map((child: NavItem) => (
                <Box
                  key={child.label}
                  onClick={() => handleMenuItemClick(child)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    p: 1,
                    borderRadius: 1,
                    cursor: "pointer",
                    "&:hover": {
                      backgroundColor: "action.hover",
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 1,
                      backgroundColor: "primary.light",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: 0.8,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 600 }}>
                      {child.label.charAt(0)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {child.label}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      );
    }

    // 非分组模式，children 直接是菜单项列表
    const menuItems = item.children as NavItem[];
    return (
      <Box
        sx={{
          display: "flex",
          minWidth: 200,
          p: 1,
        }}
        onMouseEnter={() => {
          if (anchorEl) setAnchorEl(anchorEl);
        }}
        onMouseLeave={handleCloseMenu}
      >
        {menuItems.map((child, idx) => (
          <Box
            key={child.label + idx}
            onClick={() => handleMenuItemClick(child)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              p: 1,
              borderRadius: 1,
              cursor: "pointer",
              "&:hover": {
                backgroundColor: "action.hover",
              },
            }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1,
                backgroundColor: "primary.light",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: 0.8,
              }}
            >
              <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 600 }}>
                {child.label.charAt(0)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {child.label}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    );
  };

  // 渲染顶部导航项
  const renderNavItem = (item: NavItem, index: number) => {
    const isActive = item.path === location.pathname || location.pathname.startsWith(item.path + "/");

    return (
      <Box
        key={item.label + index}
        onMouseEnter={(e) => handleNavHover(e, item)}
        onMouseLeave={handleNavLeave}
        sx={{
          position: "relative",
        }}
      >
        <Button
          endIcon={item.children ? <ChevronDown style={{ width: 14, height: 14 }} /> : null}
          sx={{
            color: isActive ? "primary.main" : "text.primary",
            fontWeight: isActive ? 600 : 400,
            px: 1.5,
            py: 1,
            minWidth: "auto",
            textTransform: "none",
            borderRadius: 1,
            backgroundColor: isActive ? "primary.light" : "transparent",
            "&:hover": {
              backgroundColor: isActive ? "primary.light" : "action.hover",
            },
          }}
        >
          {item.label}
        </Button>
      </Box>
    );
  };

  // 渲染Tab
  const renderTabs = () => {
    if (moduleTabs.length === 0) return null;

    return (
      <Box
        sx={{
          backgroundColor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
          px: 2,
        }}
      >
        <Tabs
          value={location.pathname}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 44,
            "& .MuiTabs-indicator": {
              height: 2,
            },
          }}
        >
          {moduleTabs.map((tab) => (
            <Tab
              key={tab.path}
              value={tab.path}
              label={tab.label}
              onClick={() => navigate(tab.path)}
              sx={{
                minHeight: 44,
                textTransform: "none",
                fontWeight: location.pathname === tab.path ? 600 : 400,
                color: location.pathname === tab.path ? "primary.main" : "text.secondary",
                "&.Mui-selected": {
                  color: "primary.main",
                },
              }}
            />
          ))}
        </Tabs>
      </Box>
    );
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* 顶部导航栏 */}
      <Box
        component="header"
        sx={{
          backgroundColor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
          position: "sticky",
          top: 0,
          zIndex: 1100,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            height: 56,
            px: 2,
            maxWidth: 1600,
            mx: "auto",
            width: "100%",
          }}
        >
          {/* Logo */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              mr: 3,
              cursor: "pointer",
            }}
            onClick={() => navigate("/dashboard")}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1.5,
                background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography sx={{ color: "white", fontWeight: 700, fontSize: 16 }}>
                T
              </Typography>
            </Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                display: { xs: "none", sm: "block" },
              }}
            >
              TOPEMS
            </Typography>
          </Box>

          {/* 导航菜单 */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              flex: 1,
              overflow: "auto",
            }}
          >
            {topNavItems.map((item, index) => renderNavItem(item, index))}
          </Box>

          {/* 右侧工具 */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Tooltip title="通知">
              <IconButton size="small">
                <Badge badgeContent={3} color="error">
                  <Bell style={{ width: 20, height: 20 }} />
                </Badge>
              </IconButton>
            </Tooltip>
            <ModeToggle />
            <Tooltip title="用户">
              <IconButton size="small">
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    fontSize: 14,
                    background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                  }}
                >
                  陈
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* 下拉菜单 Popover */}
        <Popover
          open={isMenuOpen}
          anchorEl={anchorEl}
          onClose={handleCloseMenu}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "left",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "left",
          }}
          slotProps={{
            paper: {
              elevation: 3,
              sx: {
                borderRadius: 2,
                mt: 0.5,
                overflow: "hidden",
              },
            },
          }}
        >
          {openMenu && renderDropdownContent(openMenu)}
        </Popover>
      </Box>

      {/* 模块Tab */}
      {renderTabs()}

      {/* 主内容区 */}
      <Box
        component="main"
        sx={{
          flex: 1,
          backgroundColor: "grey.50",
          p: 3,
        }}
      >
        {children}
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          backgroundColor: "background.paper",
          borderTop: 1,
          borderColor: "divider",
          py: 2,
          px: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
          © 2024 TOPEMS 化工新材料数字化平台
        </Typography>
        <Box sx={{ display: "flex", gap: 3 }}>
          <Button size="small" variant="text" sx={{ fontSize: 12 }}>
            帮助中心
          </Button>
          <Button size="small" variant="text" sx={{ fontSize: 12 }}>
            使用文档
          </Button>
          <Button size="small" variant="text" sx={{ fontSize: 12 }}>
            联系支持
          </Button>
        </Box>
      </Box>

      {/* AI浮动助手 */}
      <FloatingAIHelper />
    </Box>
  );
};

export default GlobalLayout;
