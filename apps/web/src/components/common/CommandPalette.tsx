import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Box,
  Dialog,
  Typography,
  InputBase,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  InputAdornment,
} from '@mui/material';
import {
  Search,
  ArrowRight,
  FileText,
  Settings,
  Home,
  Users,
  LayoutDashboard,
  Zap,
  _Hash,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  href?: string;
  action?: () => void;
  group?: string;
  keywords?: string[];
  shortcut?: string;
}

export interface CommandGroup {
  id: string;
  label: string;
  items: CommandItem[];
}

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands?: CommandItem[];
  groups?: CommandGroup[];
  placeholder?: string;
  hotkey?: string;
}

const defaultIcons: Record<string, React.ReactNode> = {
  page: <FileText size={18} />,
  settings: <Settings size={18} />,
  home: <Home size={18} />,
  users: <Users size={18} />,
  dashboard: <LayoutDashboard size={18} />,
  action: <Zap size={18} />,
};

function getIcon(item: CommandItem): React.ReactNode {
  if (item.icon) return item.icon;
  const group = item.group?.toLowerCase() || '';
  if (group.includes('page') || group.includes('页面')) return defaultIcons.page;
  if (group.includes('setting') || group.includes('设置')) return defaultIcons.settings;
  if (group.includes('home') || group.includes('首页')) return defaultIcons.home;
  if (group.includes('user') || group.includes('用户')) return defaultIcons.users;
  if (group.includes('dashboard') || group.includes('仪表盘')) return defaultIcons.dashboard;
  return defaultIcons.page;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onClose,
  commands = [],
  groups = [],
  placeholder = '搜索命令、页面或操作...',
  hotkey = 'Ctrl+K',
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const allItems = useMemo(() => {
    if (groups.length > 0) {
      return groups.flatMap((g) => g.items.map((item) => ({ ...item, group: g.label })));
    }
    return commands;
  }, [commands, groups]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return allItems;
    const lower = query.toLowerCase();
    return allItems.filter((item) => {
      const searchText =
        `${item.label} ${item.description || ''} ${item.keywords?.join(' ') || ''} ${item.group || ''}`.toLowerCase();
      return searchText.includes(lower);
    });
  }, [allItems, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, filteredItems.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            const item = filteredItems[selectedIndex];
            if (item.action) {
              item.action();
            } else if (item.href) {
              navigate(item.href);
            }
            onClose();
          }
          break;
        case 'Escape':
          onClose();
          break;
      }
    },
    [filteredItems, selectedIndex, navigate, onClose]
  );

  // Grouped display
  const groupedItems = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    filteredItems.forEach((item) => {
      const group = item.group || '其他';
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(item);
    });
    return Array.from(map.entries());
  }, [filteredItems]);

  let flatIndex = 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='sm'
      fullWidth
      slotProps={{
        paper: {
          sx: {
            mt: '15vh',
            maxHeight: '60vh',
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: 24,
          },
        },
        backdrop: { style: { backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' } },
      }}
    >
      {/* Search input */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 2,
          py: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Search
          size={20}
          sx={{ color: 'text.secondary', mr: 1 }}
        />
        <InputBase
          inputRef={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          sx={{ flex: 1, fontSize: '1rem' }}
          endAdornment={
            <InputAdornment position='end'>
              <Chip
                label={hotkey}
                size='small'
                sx={{ height: 24, fontSize: '0.7rem' }}
              />
            </InputAdornment>
          }
        />
      </Box>

      {/* Results */}
      <Box sx={{ overflowY: 'auto', maxHeight: 'calc(60vh - 60px)' }}>
        {groupedItems.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography color='text.secondary'>未找到匹配结果</Typography>
          </Box>
        ) : (
          groupedItems.map(([group, items], groupIndex) => (
            <React.Fragment key={group}>
              {groupIndex > 0 && <Divider />}
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{
                  px: 2,
                  pt: 1.5,
                  pb: 0.5,
                  display: 'block',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                {group}
              </Typography>
              <List
                dense
                disablePadding
              >
                {items.map((item) => {
                  const currentIndex = flatIndex++;
                  return (
                    <ListItemButton
                      key={item.id}
                      selected={currentIndex === selectedIndex}
                      onClick={() => {
                        if (item.action) item.action();
                        else if (item.href) navigate(item.href);
                        onClose();
                      }}
                      sx={{ py: 1, px: 2 }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>{getIcon(item)}</ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        secondary={item.description}
                        sx={{
                          '& .MuiTypography-root:first-of-type': {
                            fontWeight: currentIndex === selectedIndex ? 600 : 400,
                          },
                        }}
                      />
                      {item.shortcut && (
                        <Chip
                          label={item.shortcut}
                          size='small'
                          sx={{ height: 20, fontSize: '0.65rem', ml: 1 }}
                        />
                      )}
                      {item.href && (
                        <ArrowRight
                          size={14}
                          sx={{ color: 'text.disabled', ml: 1 }}
                        />
                      )}
                    </ListItemButton>
                  );
                })}
              </List>
            </React.Fragment>
          ))
        )}
      </Box>

      {/* Footer hint */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          px: 2,
          py: 1,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'grey.50',
        }}
      >
        <Typography
          variant='caption'
          color='text.disabled'
        >
          {filteredItems.length} 个结果
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Typography
            variant='caption'
            color='text.disabled'
          >
            <kbd
              style={{
                padding: '0 4px',
                border: '1px solid',
                borderRadius: 4,
                fontSize: '0.65rem',
              }}
            >
              ↑↓
            </kbd>{' '}
            导航
          </Typography>
          <Typography
            variant='caption'
            color='text.disabled'
          >
            <kbd
              style={{
                padding: '0 4px',
                border: '1px solid',
                borderRadius: 4,
                fontSize: '0.65rem',
              }}
            >
              ↵
            </kbd>{' '}
            选择
          </Typography>
          <Typography
            variant='caption'
            color='text.disabled'
          >
            <kbd
              style={{
                padding: '0 4px',
                border: '1px solid',
                borderRadius: 4,
                fontSize: '0.65rem',
              }}
            >
              Esc
            </kbd>{' '}
            关闭
          </Typography>
        </Box>
      </Box>
    </Dialog>
  );
};

export default CommandPalette;
