import React, { useState, useEffect } from "react";
import { Box, Drawer, List, ListItem, ListItemIcon, ListItemText, Collapse, Typography, Divider } from "@mui/material";
import { ChevronRight, ChevronDown, Home } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { navigationRegistry, type NavItem } from "../../lib/NavigationRegistry";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  pluginCode?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ open, onClose, pluginCode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [navItems, setNavItems] = useState<NavItem[]>([]);

  useEffect(() => {
    if (pluginCode) {
      const tabs = navigationRegistry.getModuleTabs(pluginCode);
      setNavItems(tabs || []);
    } else {
      setNavItems(navigationRegistry.getTopNavItems());
    }
  }, [pluginCode]);

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

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  const renderNavItem = (item: NavItem) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.code);
    const active = isActive(item.path);

    return (
      <div key={item.code}>
        <ListItem
          onClick={() => {
            if (hasChildren) {
              toggleExpand(item.code);
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
            cursor: "pointer",
            "&:hover": { backgroundColor: "grey.50" },
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            {hasChildren ? (isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />) : <ChevronRight size={18} />}
          </ListItemIcon>
          <ListItemText primary={item.label} />
        </ListItem>
        {hasChildren && (
          <Collapse in={isExpanded}>
            <List component="div" disablePadding sx={{ pl: 4 }}>
              {(item.children || []).map((child) => renderNavItem(child))}
            </List>
          </Collapse>
        )}
      </div>
    );
  };

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      variant="temporary"
      sx={{
        "& .MuiDrawer-paper": {
          width: 220,
          paddingTop: 3,
        },
      }}
    >
      <Box sx={{ px: 3, pb: 3 }}>
        <Typography variant="h6" fontWeight={600} color="primary.main">
          {pluginCode ? pluginCode.toUpperCase() : "TOPEMS"}
        </Typography>
      </Box>
      <Divider />
      <List>
        <ListItem
          onClick={() => { navigate("/"); onClose(); }}
          sx={{
            color: location.pathname === "/" ? "primary.main" : "text.secondary",
            backgroundColor: location.pathname === "/" ? "primary.50" : "transparent",
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
        {navItems.map(renderNavItem)}
      </List>
    </Drawer>
  );
};