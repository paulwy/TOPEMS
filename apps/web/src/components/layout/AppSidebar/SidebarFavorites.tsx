import React, { useState } from 'react';
import {
  Box,
  Tooltip,
  IconButton,
  Popover,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Bookmark, BookmarkCheck, Star } from 'lucide-react';
import { renderIcon } from '@/lib/iconMapping';
import type { NavItem } from '@/lib/navigation/types';
import { getNavigablePath, getAllNavItems } from './shared';

export interface SidebarFavoritesProps {
  collapsed: boolean;
  favorites: Set<string>;
  onToggleFavorite: (item: NavItem) => void;
}

export const SidebarFavorites: React.FC<SidebarFavoritesProps> = ({
  collapsed,
  favorites,
  onToggleFavorite,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [favoritesAnchorEl, setFavoritesAnchorEl] = useState<HTMLElement | null>(null);

  const allNavItems = getAllNavItems();

  if (collapsed) return null;

  return (
    <>
      <Tooltip title={`收藏 (${favorites.size})`}>
        <IconButton
          size='small'
          onClick={(e) => setFavoritesAnchorEl(e.currentTarget)}
          sx={{
            color: favorites.size > 0 ? 'warning.main' : 'text.secondary',
          }}
          aria-label='收藏'
        >
          {favorites.size > 0 ? (
            <BookmarkCheck style={{ width: 16, height: 16 }} />
          ) : (
            <Bookmark style={{ width: 16, height: 16 }} />
          )}
        </IconButton>
      </Tooltip>

      <Popover
        open={Boolean(favoritesAnchorEl)}
        anchorEl={favoritesAnchorEl}
        onClose={() => setFavoritesAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        sx={{
          '& .MuiPaper-root': {
            width: 260,
            maxHeight: 320,
            mt: -0.5,
          },
        }}
      >
        <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
            我的收藏 ({favorites.size})
          </Typography>
        </Box>
        {favorites.size === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
              暂无收藏，点击导航项上的星标添加
            </Typography>
          </Box>
        ) : (
          <List dense>
            {allNavItems
              .filter((item) => favorites.has(item.path || item.code))
              .slice(0, 10)
              .map((item, index) => (
                <ListItemButton
                  key={item.code || index}
                  onClick={() => {
                    const navigablePath = getNavigablePath(item.path);
                    if (navigablePath) navigate(navigablePath);
                    setFavoritesAnchorEl(null);
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {item.icon ? (
                      renderIcon(item.icon, 16)
                    ) : (
                      <Star style={{ width: 16, height: 16 }} />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    slotProps={{ primary: { sx: { fontSize: '0.875rem' } } }}
                  />
                  <IconButton
                    size='small'
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(item);
                    }}
                    sx={{ ml: 'auto', flexShrink: 0 }}
                    aria-label='收藏'
                  >
                    <BookmarkCheck
                      style={{ width: 14, height: 14, color: theme.palette.warning.main }}
                    />
                  </IconButton>
                </ListItemButton>
              ))}
          </List>
        )}
      </Popover>
    </>
  );
};

export default SidebarFavorites;
