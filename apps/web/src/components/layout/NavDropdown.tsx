import React, { useState, useCallback, useEffect, createContext, useContext } from "react";
import {
  Box,
  Typography,
  Popover,
  Fade,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  type NavItem,
} from "../../config/navigation";

interface DropdownContextType {
  anchorEl: HTMLElement | null;
  openMenu: NavItem | null;
  setAnchorEl: (el: HTMLElement | null) => void;
  setOpenMenu: (menu: NavItem | null) => void;
}

const DropdownContext = createContext<DropdownContextType | null>(null);

export const useDropdown = () => {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error("useDropdown must be used within a DropdownProvider");
  }
  return context;
};

export const DropdownProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [openMenu, setOpenMenu] = useState<NavItem | null>(null);

  return (
    <DropdownContext.Provider value={{ anchorEl, openMenu, setAnchorEl, setOpenMenu }}>
      {children}
    </DropdownContext.Provider>
  );
};

export const NavDropdown: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const { anchorEl, openMenu, setAnchorEl, setOpenMenu } = useDropdown();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (anchorEl && !anchorEl.contains(event.target as Node)) {
        const popoverElement = document.querySelector(".MuiPopover-paper");
        if (popoverElement && !popoverElement.contains(event.target as Node)) {
          handleCloseMenu();
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [anchorEl]);

  const handleCloseMenu = useCallback(() => {
    setAnchorEl(null);
    setOpenMenu(null);
  }, [setAnchorEl, setOpenMenu]);

  const handleMenuItemClick = useCallback(
    (item: NavItem) => {
      if (item.path) {
        navigate(item.path);
      }
      handleCloseMenu();
    },
    [navigate, handleCloseMenu],
  );

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
            flexWrap: "wrap",
            minWidth: 500,
            maxWidth: { lg: 800, md: 600, sm: 450 },
            p: 2,
            gap: 2,
            maxHeight: isMobile ? "70vh" : "80vh",
            overflowY: "auto",
          }}
          onMouseEnter={() => {
            if (anchorEl) setAnchorEl(anchorEl);
          }}
          onMouseLeave={handleCloseMenu}
        >
          {groups.map((group, idx) => (
            <Box key={idx} sx={{ minWidth: 140, flex: 1 }}>
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
                      width: 28,
                      height: 28,
                      borderRadius: 1,
                      backgroundColor: "primary.light",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: 0.8,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: "primary.main", fontWeight: 600 }}
                    >
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
          minWidth: 200,
          maxWidth: 320,
          p: 1,
          maxHeight: isMobile ? "60vh" : "70vh",
          overflowY: "auto",
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
                width: 28,
                height: 28,
                borderRadius: 1,
                backgroundColor: "primary.light",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: 0.8,
              }}
            >
              <Typography
                variant="caption"
                sx={{ color: "primary.main", fontWeight: 600 }}
              >
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

  return (
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
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.15)",
          },
        },
      }}
    >
      {openMenu && (
        <Fade in={isMenuOpen}>
          {renderDropdownContent(openMenu) || <Box />}
        </Fade>
      )}
    </Popover>
  );
};

export default NavDropdown;