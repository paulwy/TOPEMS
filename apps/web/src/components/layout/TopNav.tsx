import React, { useState, useCallback, useMemo } from "react";
import { Box, IconButton, Typography, Avatar, Badge, Tooltip,  } from "@mui/material";
import { Button } from "@/components/ui/Button";
import { Bell, ChevronDown } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { topNavItems, type NavItem } from "../../config/navigation";
import { ModeToggle } from "../ModeToggle";
import { NavDropdown } from "./NavDropdown";
import { MobileNav } from "./MobileNav";
import { useInstalledPlugins } from "../../context/PluginContext";

// 菜单模块到插件代码的映射
const menuModuleMapping: Record<string, string> = {
  "/finance": "erp",
  "/hrm": "hrm",
  "/crm": "crm",
  "/pm": "pm",
  "/scm": "scm",
  "/wms": "wms",
  "/mes": "mes",
  "/qms": "qa",
  "/bi": "bi",
  "/ai": "ai",
  "/mobile": "mobile",
  "/gis": "gis",
  "/integration": "integration",
  "/monitor": "monitor",
  "/portal": "portal",
  "/rs": "rs",
  "/srm": "srm",
};

interface TopNavProps {
  onNavHover?: (event: React.MouseEvent<HTMLElement>, item: NavItem) => void;
  onNavLeave?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onNavHover, onNavLeave }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isPluginInstalled, loading } = useInstalledPlugins();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [openMenu, setOpenMenu] = useState<NavItem | null>(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 过滤后的导航菜单（根据插件安装状态）
  const filteredNavItems = useMemo(() => {
    return topNavItems.filter((item) => {
      // 首页始终显示
      if (item.path === "/dashboard") return true;
      // 检查是否需要插件
      const pluginCode = item.path ? menuModuleMapping[item.path] : null;
      if (!pluginCode) return true; // 没有映射的菜单默认显示
      return isPluginInstalled(pluginCode);
    });
  }, [isPluginInstalled]);

  const handleNavHover = useCallback(
    (event: React.MouseEvent<HTMLElement>, item: NavItem) => {
      if (item.children) {
        setAnchorEl(event.currentTarget);
        setOpenMenu(item);
      } else if (item.path) {
        navigate(item.path);
      }
      if (onNavHover) {
        onNavHover(event, item);
      }
    },
    [navigate, onNavHover],
  );

  const handleNavLeave = useCallback(() => {
    setAnchorEl(null);
    setOpenMenu(null);
    if (onNavLeave) {
      onNavLeave();
    }
  }, [onNavLeave]);

  const handleCloseMenu = useCallback(() => {
    setAnchorEl(null);
    setOpenMenu(null);
  }, []);

  const handleNavClick = useCallback(
    (item: NavItem) => {
      if (item.children) {
        if (openMenu?.label === item.label) {
          setAnchorEl(null);
          setOpenMenu(null);
        } else {
          setOpenMenu(item);
        }
      } else if (item.path) {
        navigate(item.path);
      }
    },
    [navigate, openMenu],
  );

  const renderNavItem = (item: NavItem) => {
    const isActive =
      item.path === location.pathname ||
      (item.path && location.pathname.startsWith(item.path + "/"));
    const isMenuOpen = openMenu?.label === item.label;

    return (
      <Box
        key={item.label}
        onMouseEnter={(e) => handleNavHover(e, item)}
        onMouseLeave={handleNavLeave}
        sx={{
          position: "relative",
        }}
      >
        <Button
          endIcon={
            item.children ? (
              <ChevronDown
                style={{
                  width: 14,
                  height: 14,
                  transform: isMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}
              />
            ) : null
          }
          onClick={() => handleNavClick(item)}
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

  return (
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
            marginRight: 3,
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

        {/* 导航菜单 - 桌面端 */}
        <Box
          sx={{
            display: { xs: "none", md: "flex" },
            alignItems: "center",
            gap: 0.5,
            flex: 1,
            overflow: "auto",
          }}
        >
          {filteredNavItems.map((item) => renderNavItem(item))}
        </Box>

        {/* 右侧工具 */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: { xs: 0.5, sm: 1 },
          }}
        >
          <Tooltip title="通知">
            <IconButton sx={{ width: 32, height: 32 }}>
              <Badge badgeContent={3} color="error">
                <Bell style={{ width: 20, height: 20 }} />
              </Badge>
            </IconButton>
          </Tooltip>
          <ModeToggle />
          <Tooltip title="用户">
            <IconButton sx={{ width: 32, height: 32 }}>
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
          {/* 移动端汉堡菜单 */}
          <MobileNav
            navItems={topNavItems}
            open={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
            onOpen={() => setMobileMenuOpen(true)}
          />
        </Box>
      </Box>

      {/* 下拉菜单 */}
      <NavDropdown
        anchorEl={anchorEl}
        openMenu={openMenu}
        setAnchorEl={setAnchorEl}
        setOpenMenu={setOpenMenu}
      />
    </Box>
  );
};

export default TopNav;
