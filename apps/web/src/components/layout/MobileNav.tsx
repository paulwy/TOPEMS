import React, { useState, useCallback } from "react";
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Divider,
  IconButton,
  Typography,
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
  ChevronLeft,
  Menu,
  X,
  FolderOpen,
  Workflow,
  MessageSquare,
  Mail,
  FileText,
  Map,
  Shield,
  Lightbulb,
  HelpCircle,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import type { NavItem } from "../../config/navigation";

// 模块图标映射
const moduleIconMap: Record<string, React.ReactNode> = {
  首页: <Home style={{ width: 20, height: 20 }} />,
  人力: <Users style={{ width: 20, height: 20 }} />,
  客户: <Building2 style={{ width: 20, height: 20 }} />,
  项目: <Briefcase style={{ width: 20, height: 20 }} />,
  数据: <BarChart3 style={{ width: 20, height: 20 }} />,
  财务: <BarChart3 style={{ width: 20, height: 20 }} />,
  运营: <Settings style={{ width: 20, height: 20 }} />,
  工作流: <Workflow style={{ width: 20, height: 20 }} />,
  协作: <MessageSquare style={{ width: 20, height: 20 }} />,
  更多: <ChevronRight style={{ width: 20, height: 20 }} />,
};

interface MobileNavProps {
  navItems: NavItem[];
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  navItems,
  open,
  onClose,
  onOpen,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  // 切换展开状态
  const toggleExpand = useCallback((label: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }, []);

  // 处理菜单项点击
  const handleItemClick = useCallback(
    (item: NavItem) => {
      if (item.children && !item.path) {
        // 有子菜单但没有路径，展开子菜单
        toggleExpand(item.label);
        setActiveGroup(item.label);
      } else if (item.path) {
        // 有路径，跳转并关闭菜单
        navigate(item.path);
        onClose();
      }
    },
    [navigate, onClose, toggleExpand],
  );

  // 渲染菜单项
  const renderMenuItem = (item: NavItem, depth: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.label);
    const isActive = item.path === location.pathname;
    const icon = moduleIconMap[item.label] || (
      <FolderOpen style={{ width: 20, height: 20 }} />
    );

    return (
      <React.Fragment key={item.label + depth}>
        <ListItem disablePadding sx={{ display: "block" }}>
          <ListItemButton
            onClick={() => handleItemClick(item)}
            sx={{
              pl: 2 + depth * 2,
              py: 1.5,
              backgroundColor: isActive ? "primary.light" : "transparent",
              borderLeft: isActive ? "3px solid" : "3px solid transparent",
              borderColor: isActive ? "primary.main" : "transparent",
              "&:hover": {
                backgroundColor: isActive ? "primary.light" : "action.hover",
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{icon}</ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "primary.main" : "text.primary",
              }}
            />
            {hasChildren && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}
              >
                <ChevronRight style={{ width: 18, height: 18 }} />
              </Box>
            )}
          </ListItemButton>
        </ListItem>

        {/* 子菜单 */}
        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {(item.children as NavItem[]).map((child) =>
                renderMenuItem(child, depth + 1),
              )}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  // 渲染分组模式的内容
  const renderGroupContent = (item: NavItem) => {
    if (!item.children || !item.isGroup) return null;

    const groups = item.children as NavItem[];
    const isExpanded =
      expandedItems.has(item.label) || activeGroup === item.label;

    return (
      <React.Fragment key={item.label}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => toggleExpand(item.label)}
            sx={{
              py: 1.5,
              backgroundColor: isExpanded ? "primary.light" : "transparent",
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              {moduleIconMap[item.label] || (
                <FolderOpen style={{ width: 20, height: 20 }} />
              )}
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{
                fontWeight: 500,
              }}
            />
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            >
              <ChevronDown style={{ width: 18, height: 18 }} />
            </Box>
          </ListItemButton>
        </ListItem>

        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <Box sx={{ py: 1 }}>
            {groups.map((group) => (
              <Box key={group.label} sx={{ mb: 1.5 }}>
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    px: 3,
                    py: 0.5,
                    color: "text.secondary",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    fontSize: "0.7rem",
                  }}
                >
                  {group.label}
                </Typography>
                <List component="div" disablePadding>
                  {(group.children as NavItem[]).map((child) => (
                    <ListItem key={child.label} disablePadding>
                      <ListItemButton
                        onClick={() => {
                          if (child.path) {
                            navigate(child.path);
                            onClose();
                          }
                        }}
                        sx={{
                          pl: 4,
                          py: 1,
                          backgroundColor:
                            child.path === location.pathname
                              ? "primary.light"
                              : "transparent",
                        }}
                      >
                        <ListItemText
                          primary={child.label}
                          primaryTypographyProps={{
                            fontWeight:
                              child.path === location.pathname ? 600 : 400,
                            fontSize: "0.9rem",
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Box>
            ))}
          </Box>
        </Collapse>
      </React.Fragment>
    );
  };

  return (
    <>
      {/* 汉堡菜单按钮 */}
      <IconButton
        onClick={onOpen}
        sx={{
          display: { xs: "flex", lg: "none" },
          ml: 1,
        }}
      >
        <Menu style={{ width: 24, height: 24 }} />
      </IconButton>

      {/* 抽屉导航 */}
      <Drawer
        anchor="left"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            width: 300,
            maxWidth: "85vw",
          },
        }}
      >
        {/* 头部 */}
        <Box
          sx={{
            p: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: 1,
            borderColor: "divider",
            background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
            color: "white",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1,
                backgroundColor: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: 14 }}>T</Typography>
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              TOPEMS
            </Typography>
          </Box>
          <IconButton onClick={onClose} sx={{ color: "white" }}>
            <X style={{ width: 20, height: 20 }} />
          </IconButton>
        </Box>

        {/* 导航菜单 */}
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          <List component="nav">
            {navItems.map((item) => renderGroupContent(item))}
          </List>
        </Box>

        {/* 底部快捷入口 */}
        <Box
          sx={{
            p: 2,
            borderTop: 1,
            borderColor: "divider",
          }}
        >
          <Divider sx={{ mb: 1.5 }} />
          <Box sx={{ display: "flex", justifyContent: "space-around" }}>
            <IconButton
              size="small"
              onClick={() => {
                navigate("/notifications");
                onClose();
              }}
            >
              <Bell style={{ width: 20, height: 20 }} />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => {
                navigate("/ai");
                onClose();
              }}
            >
              <Lightbulb style={{ width: 20, height: 20 }} />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => {
                navigate("/help");
                onClose();
              }}
            >
              <HelpCircle style={{ width: 20, height: 20 }} />
            </IconButton>
          </Box>
        </Box>
      </Drawer>
    </>
  );
};

export default MobileNav;
