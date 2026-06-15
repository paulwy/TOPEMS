import React, { useState, useCallback } from "react";
import {
  Box,
  Button,
  IconButton,
  Typography,
  Avatar,
  Badge,
  Tooltip,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Bell,
  ChevronDown,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  topNavItems,
  type NavItem,
} from "../../config/navigation";
import { ModeToggle } from "../ModeToggle";
import { NavDropdown, useDropdown } from "./NavDropdown";
import { MobileNav } from "./MobileNav";

interface TopNavProps {
  onNavHover?: (event: React.MouseEvent<HTMLElement>, item: NavItem) => void;
  onNavLeave?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  onNavHover,
  onNavLeave,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { setAnchorEl, setOpenMenu } = useDropdown();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    [navigate, onNavHover, setAnchorEl, setOpenMenu],
  );

  const handleNavLeave = useCallback(() => {
    if (onNavLeave) {
      onNavLeave();
    }
  }, [onNavLeave]);

  const renderNavItem = (item: NavItem, index: number) => {
    const isActive =
      item.path === location.pathname ||
      location.pathname.startsWith(item.path + "/");

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
          endIcon={
            item.children ? (
              <ChevronDown style={{ width: 14, height: 14 }} />
            ) : null
          }
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
            <Typography
              sx={{ color: "white", fontWeight: 700, fontSize: 16 }}
            >
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
            display: { xs: "none", lg: "flex" },
            alignItems: "center",
            gap: 0.5,
            flex: 1,
            overflow: "auto",
          }}
        >
          {topNavItems.map((item, index) => renderNavItem(item, index))}
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
      <NavDropdown />
    </Box>
  );
};

export default TopNav;