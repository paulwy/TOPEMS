import React, { useState, useMemo } from 'react';
import {
  TextField,
  InputAdornment,
  IconButton,
  Popover,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Search, X, Star } from 'lucide-react';
import { renderIcon } from '@/lib/iconMapping';
import { getNavigablePath, getAllNavItems } from './shared';

export interface SidebarSearchProps {
  collapsed: boolean;
}

export const SidebarSearch: React.FC<SidebarSearchProps> = ({ collapsed }) => {
  const theme = useTheme();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchAnchorEl, setSearchAnchorEl] = useState<HTMLElement | null>(null);

  const allNavItems = useMemo(() => getAllNavItems(), []);

  const filteredNavItems = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return allNavItems.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        (item.path && item.path.toLowerCase().includes(query))
    );
  }, [searchQuery, allNavItems]);

  if (collapsed) return null;

  return (
    <>
      <TextField
        size='small'
        placeholder='搜索菜单...'
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onFocus={(e) => setSearchAnchorEl(e.currentTarget)}
        sx={{
          flex: 1,
          '& .MuiOutlinedInput-root': {
            borderRadius: 1.5,
            fontSize: '0.8125rem',
            bgcolor: 'background.default',
          },
        }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position='start'>
                <Search style={{ width: 14, height: 14, color: theme.palette.text.secondary }} />
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position='end'>
                <IconButton
                  size='small'
                  onClick={() => setSearchQuery('')}
                  edge='end'
                  aria-label='关闭'
                >
                  <X style={{ width: 12, height: 12 }} />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />

      <Popover
        open={Boolean(searchAnchorEl) && filteredNavItems.length > 0}
        anchorEl={searchAnchorEl}
        onClose={() => {
          setSearchAnchorEl(null);
          setSearchQuery('');
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        sx={{
          '& .MuiPaper-root': {
            width: 280,
            maxHeight: 320,
            mt: -0.5,
          },
        }}
      >
        <List dense>
          {filteredNavItems.slice(0, 8).map((item, index) => (
            <ListItemButton
              key={item.code || index}
              onClick={() => {
                const navigablePath = getNavigablePath(item.path);
                if (navigablePath) navigate(navigablePath);
                setSearchAnchorEl(null);
                setSearchQuery('');
              }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                {item.icon ? renderIcon(item.icon, 16) : <Star style={{ width: 16, height: 16 }} />}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                secondary={item.path}
                slotProps={{
                  primary: { sx: { fontSize: '0.875rem' } },
                  secondary: { sx: { fontSize: '0.75rem' } },
                }}
              />
            </ListItemButton>
          ))}
        </List>
      </Popover>
    </>
  );
};

export default SidebarSearch;
