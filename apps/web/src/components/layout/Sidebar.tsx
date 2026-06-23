import React, { useState, useEffect } from "react";
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  Typography,
  Divider,
  Chip,
} from "@mui/material";
import {
  ChevronRight,
  ChevronDown,
  Home,
  Package,
  Settings,
  Activity,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { usePlugins } from "../../context/PluginContext";
import {
  coreNavigation,
  suiteNavigation,
  adminNavigation,
  getNavigationForPlugin,
  type NavigationItem,
} from "../../config/navigation-v2";
import { usePermission } from "../../hooks/usePermission";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  pluginCode?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const { installedPlugins, pluginHealth, isPluginInstalled, isPluginActive } =
    usePlugins();
  const { checkPermission, isSuperuser } = usePermission();

  const hasPermission = (permissions?: string[]): boolean => {
    if (isSuperuser) return true;
    if (!permissions || permissions.length === 0) return true;
    return permissions.some((p) => checkPermission(p));
  };

  const toggleExpand = (code: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const isActive = (path?: string) => {
    if (!path) return false;
    return location.pathname.startsWith(path);
  };

  const getPluginStatus = (pluginCode: string) => {
    const health = pluginHealth[pluginCode];
    const installed = isPluginInstalled(pluginCode);
    const active = isPluginActive(pluginCode);

    if (!installed) {
      return { status: "not-installed", label: "未安装" };
    }
    if (!active) {
      return { status: "disabled", label: "已禁用" };
    }
    if (!health?.healthy) {
      return { status: "unhealthy", label: "异常" };
    }
    return { status: "healthy", label: "运行中" };
  };

  const renderNavItem = (item: NavigationItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const active = isActive(item.path);
    const status = item.pluginCode ? getPluginStatus(item.pluginCode) : null;

    if (!hasPermission(item.permissions)) {
      return null;
    }

    if (item.pluginCode && !isPluginInstalled(item.pluginCode)) {
      return null;
    }

    return (
      <div key={item.id}>
        <ListItem
          onClick={() => {
            if (hasChildren) {
              toggleExpand(item.id);
            } else if (item.path) {
              navigate(item.path);
              onClose();
            }
          }}
          sx={{
            color: active ? "primary.main" : "text.secondary",
            backgroundColor: active ? "primary.50" : "transparent",
            borderRadius: 1,
            marginY: 0.5,
            marginX: 1,
            cursor: hasChildren || item.path ? "pointer" : "default",
            pl: depth * 2 + 1,
            "&:hover": { backgroundColor: "grey.50" },
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown size={18} />
              ) : (
                <ChevronRight size={18} />
              )
            ) : item.icon ? (
              React.createElement(item.icon, { size: 18 })
            ) : (
              <ChevronRight size={18} />
            )}
          </ListItemIcon>
          <ListItemText primary={item.title} />
          {status && (
            <Chip
              size="small"
              label={status.label}
              sx={{
                backgroundColor:
                  status.status === "healthy"
                    ? "success.light"
                    : status.status === "unhealthy"
                      ? "error.light"
                      : status.status === "disabled"
                        ? "warning.light"
                        : "grey.light",
                color:
                  status.status === "healthy"
                    ? "success"
                    : status.status === "unhealthy"
                      ? "error"
                      : "default",
              }}
            />
          )}
        </ListItem>
        {hasChildren && (
          <Collapse in={isExpanded}>
            <List component="div" disablePadding>
              {(item.children || []).map((child) =>
                renderNavItem(child, depth + 1),
              )}
            </List>
          </Collapse>
        )}
      </div>
    );
  };

  const renderNavigationGroup = (group: (typeof coreNavigation)[0]) => {
    const hasAccessibleItems = group.items.some((item) => {
      if (!hasPermission(item.permissions)) return false;
      if (item.pluginCode && !isPluginInstalled(item.pluginCode)) return false;
      return true;
    });

    if (!hasAccessibleItems) return null;

    const groupHasChildren = group.items.some((item) => item.children?.length);
    const isExpanded = expandedItems.has(group.id);
    const groupActive = group.items.some((item) => isActive(item.path));

    return (
      <div key={group.id}>
        {groupHasChildren ? (
          <>
            <ListItem
              onClick={() => toggleExpand(group.id)}
              sx={{
                color: groupActive ? "primary.main" : "text.secondary",
                borderRadius: 1,
                marginY: 0.5,
                marginX: 1,
                cursor: "pointer",
                "&:hover": { backgroundColor: "grey.50" },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                {isExpanded ? (
                  <ChevronDown size={18} />
                ) : (
                  <ChevronRight size={18} />
                )}
              </ListItemIcon>
              <ListItemText primary={group.title} />
            </ListItem>
            <Collapse in={isExpanded}>
              <List component="div" disablePadding sx={{ pl: 2 }}>
                {group.items.map((item) => renderNavItem(item, 1))}
              </List>
            </Collapse>
          </>
        ) : (
          group.items.map((item) => renderNavItem(item))
        )}
      </div>
    );
  };

  const renderSuiteNavigation = () => {
    const installedSuiteCodes = new Set(
      installedPlugins
        .map((p) => {
          const suiteCode = Object.entries(suiteNavigation).find(([, suite]) =>
            suite.items.some((item) => item.pluginCode === p.plugin_code),
          )?.[0];
          return suiteCode;
        })
        .filter(Boolean),
    );

    return Array.from(installedSuiteCodes)
      .filter(
        (suiteCode): suiteCode is keyof typeof suiteNavigation =>
          suiteCode !== undefined && suiteCode in suiteNavigation,
      )
      .map((suiteCode) => suiteNavigation[suiteCode])
      .filter(Boolean)
      .map((suite) => {
        const hasAccessiblePlugins = suite.items.some(
          (item: NavigationItem) => {
            if (item.pluginCode && !isPluginActive(item.pluginCode))
              return false;
            return true;
          },
        );

        if (!hasAccessiblePlugins) return null;

        const isExpanded = expandedItems.has(suite.id);
        const suiteActive = suite.items.some((item: NavigationItem) =>
          isActive(item.path),
        );

        return (
          <div key={suite.id}>
            <ListItem
              onClick={() => toggleExpand(suite.id)}
              sx={{
                color: suiteActive ? "primary.main" : "text.secondary",
                borderRadius: 1,
                marginY: 0.5,
                marginX: 1,
                cursor: "pointer",
                "&:hover": { backgroundColor: "grey.50" },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                {isExpanded ? (
                  <ChevronDown size={18} />
                ) : (
                  <ChevronRight size={18} />
                )}
              </ListItemIcon>
              <ListItemText primary={suite.title} />
            </ListItem>
            <Collapse in={isExpanded}>
              <List component="div" disablePadding sx={{ pl: 2 }}>
                {suite.items.map((item: NavigationItem) =>
                  renderNavItem(item, 1),
                )}
              </List>
            </Collapse>
          </div>
        );
      });
  };

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      variant="temporary"
      sx={{
        "& .MuiDrawer-paper": {
          width: { xs: "85vw", sm: 220, md: 240 },
          maxWidth: 280,
          paddingTop: 3,
        },
      }}
    >
      <Box sx={{ px: 3, pb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }} color="primary.main">
          TOPEMS
        </Typography>
        <Typography variant="caption" color="textSecondary">
          插件化平台
        </Typography>
      </Box>
      <Divider />
      <List>
        <ListItem
          onClick={() => {
            navigate("/");
            onClose();
          }}
          sx={{
            color:
              location.pathname === "/" ? "primary.main" : "text.secondary",
            backgroundColor:
              location.pathname === "/" ? "primary.50" : "transparent",
            borderRadius: 1,
            marginY: 0.5,
            marginX: 1,
            cursor: "pointer",
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Home size={18} />
          </ListItemIcon>
          <ListItemText primary="首页" />
        </ListItem>
        <Divider sx={{ my: 1 }} />

        {coreNavigation.map(renderNavigationGroup)}

        <Divider sx={{ my: 2 }} />
        <Typography
          variant="overline"
          sx={{ px: 3, py: 1, color: "textSecondary", fontSize: 11 }}
        >
          已安装套件
        </Typography>
        {renderSuiteNavigation()}

        <Divider sx={{ my: 2 }} />
        {adminNavigation.map(renderNavigationGroup)}
      </List>

      <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0, p: 2 }}>
        <Divider sx={{ mb: 2 }} />
        <Box className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-gray-400" />
            <Typography variant="caption" color="textSecondary">
              服务状态
            </Typography>
          </div>
          <div className="flex items-center gap-1">
            {Object.keys(pluginHealth).length > 0 && (
              <>
                {Object.values(pluginHealth).every((h) => h.healthy) ? (
                  <CheckCircle size={16} className="text-green-500" />
                ) : (
                  <AlertTriangle size={16} className="text-yellow-500" />
                )}
              </>
            )}
          </div>
        </Box>
      </Box>
    </Drawer>
  );
};
