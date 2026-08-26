import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Dialog,
  Box,
  TextField,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Chip,
  useTheme,
} from '@mui/material';
import i18n from '@/i18n';
import {
  Search,
  ArrowRight,
  Command,
  Home,
  Settings,
  User,
  Moon,
  Bookmark,
  Clock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { navigationRegistryV2 } from '@/lib/navigation';
import type { NavItem } from '@/lib/navigation/types';
import { renderIcon } from '@/lib/iconMapping';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import { ADMIN_PATHS } from '@/modules/admin/config';
import { designTokens } from '@topems/tokens';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  action: () => void;
  category: 'page' | 'action' | 'recent' | 'favorite';
  shortcut?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // 获取所有页面导航项
  const allNavItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [];
    const topItems = navigationRegistryV2.getTopNavItems(() => true);

    const collectItems = (navItems: NavItem[]) => {
      navItems.forEach((item) => {
        if (item.path) items.push(item);
        if (item.children) collectItems(item.children);
      });
    };

    topItems.forEach((item) => {
      if (item.path) items.push(item);
      if (item.children) collectItems(item.children);
    });

    return items;
  }, []);

  // 获取最近访问
  const recentItems = useMemo<NavItem[]>(() => {
    try {
      const saved = localStorage.getItem('sidebar-recent');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }, [open]);

  // 获取收藏
  const favoriteItems = useMemo<NavItem[]>(() => {
    try {
      const saved = localStorage.getItem('sidebar-favorites');
      const favPaths = saved ? (JSON.parse(saved) as string[]) : [];
      return allNavItems.filter((item) => favPaths.includes(item.path || item.code));
    } catch {
      return [];
    }
  }, [allNavItems, open]);

  // 操作命令
  const actionCommands = useMemo<CommandItem[]>(
    () => [
      {
        id: 'theme-toggle',
        label: i18n.t('components.command_palette.k0'),
        description: i18n.t('components.command_palette.k1'),
        icon: <Moon style={{ width: 18, height: 18 }} />,
        action: () => {
          // 通过自定义事件触发主题切换
          document.dispatchEvent(new CustomEvent('toggle-theme'));
        },
        category: 'action',
        shortcut: 'T',
      },
      {
        id: 'go-settings',
        label: i18n.t('components.command_palette.k2'),
        description: i18n.t('components.command_palette.k3'),
        icon: <Settings style={{ width: 18, height: 18 }} />,
        action: () => navigate(ADMIN_PATHS.systemSettings),
        category: 'action',
      },
      {
        id: 'go-profile',
        label: i18n.t('components.command_palette.k4'),
        description: i18n.t('components.command_palette.k5'),
        icon: <User style={{ width: 18, height: 18 }} />,
        action: () => navigate(DASHBOARD_PATHS.profile),
        category: 'action',
      },
      {
        id: 'go-home',
        label: i18n.t('components.command_palette.k6'),
        description: i18n.t('components.command_palette.k7'),
        icon: <Home style={{ width: 18, height: 18 }} />,
        action: () => navigate(DASHBOARD_PATHS.dashboard),
        category: 'action',
      },
    ],
    [navigate]
  );

  // 过滤命令列表
  const filteredCommands = useMemo<CommandItem[]>(() => {
    const q = query.toLowerCase().trim();

    if (!q) {
      // 没有搜索词时显示：最近访问 + 收藏 + 操作
      const commands: CommandItem[] = [];

      // 最近访问
      recentItems.slice(0, 3).forEach((item) => {
        commands.push({
          id: `recent-${item.code}`,
          label: item.label,
          description: item.path,
          icon: item.icon ? renderIcon(item.icon, 18) : <Clock style={{ width: 18, height: 18 }} />,
          action: () => item.path && navigate(item.path),
          category: 'recent',
        });
      });

      // 收藏
      favoriteItems.slice(0, 3).forEach((item) => {
        commands.push({
          id: `fav-${item.code}`,
          label: item.label,
          description: item.path,
          icon: item.icon ? (
            renderIcon(item.icon, 18)
          ) : (
            <Bookmark style={{ width: 18, height: 18 }} />
          ),
          action: () => item.path && navigate(item.path),
          category: 'favorite',
        });
      });

      // 操作命令
      actionCommands.forEach((cmd) => commands.push(cmd));

      return commands;
    }

    // 有搜索词时过滤
    const commands: CommandItem[] = [];

    // 匹配页面
    allNavItems
      .filter(
        (item) =>
          item.label.toLowerCase().includes(q) || (item.path && item.path.toLowerCase().includes(q))
      )
      .slice(0, 8)
      .forEach((item) => {
        commands.push({
          id: `page-${item.code}`,
          label: item.label,
          description: item.path,
          icon: item.icon ? (
            renderIcon(item.icon, 18)
          ) : (
            <Search style={{ width: 18, height: 18 }} />
          ),
          action: () => item.path && navigate(item.path),
          category: 'page',
        });
      });

    // 匹配操作
    actionCommands
      .filter(
        (cmd) => cmd.label.toLowerCase().includes(q) || cmd.description?.toLowerCase().includes(q)
      )
      .forEach((cmd) => commands.push(cmd));

    return commands;
  }, [query, allNavItems, recentItems, favoriteItems, actionCommands, navigate]);

  // 重置状态
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // 键盘导航
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev < filteredCommands.length - 1 ? prev + 1 : prev));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filteredCommands, selectedIndex, onClose]
  );

  // 按分类分组
  const groupedCommands = useMemo(() => {
    const groups: { [key: string]: CommandItem[] } = {};
    filteredCommands.forEach((cmd) => {
      if (!groups[cmd.category]) groups[cmd.category] = [];
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  const categoryLabels: { [key: string]: string } = {
    recent: i18n.t('components.command_palette.k8'),
    favorite: i18n.t('components.command_palette.k9'),
    page: i18n.t('components.command_palette.k10'),
    action: i18n.t('components.command_palette.k11'),
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='sm'
      fullWidth
      className='command-palette'
      sx={{
        '& .MuiDialog-paper': {
          mt: '20vh',
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: designTokens.shadows['2xl'],
        },
      }}
    >
      {/* 搜索框 */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <TextField
          inputRef={inputRef}
          fullWidth
          placeholder={i18n.t('components.command_palette.k0')}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          variant='outlined'
          size='small'
          autoFocus
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position='start'>
                  <Search style={{ width: 18, height: 18, color: theme.palette.text.secondary }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position='end'>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Chip
                      icon={<Command style={{ width: 12, height: 12 }} />}
                      label='K'
                      size='small'
                      sx={{
                        height: 20,
                        fontSize: designTokens.typography.fontSize.scale['0.7rem'],
                      }}
                    />
                  </Box>
                </InputAdornment>
              ),
            },
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 1.5,
            },
          }}
        />
      </Box>

      {/* 命令列表 */}
      <Box
        sx={{
          maxHeight: '400px',
          overflowY: 'auto',
        }}
      >
        {filteredCommands.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography
              sx={{
                color: 'text.secondary',
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
              }}
            >
              {i18n.t('components.command_palette.k1')}
            </Typography>
          </Box>
        ) : (
          Object.entries(groupedCommands).map(([category, items]) => (
            <Box key={category}>
              {query === '' && (
                <Box sx={{ px: 2, pt: 2, pb: 1 }}>
                  <Typography
                    sx={{
                      fontSize: designTokens.typography.fontSize.scale['0.75rem'],
                      fontWeight: 600,
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {categoryLabels[category] || category}
                  </Typography>
                </Box>
              )}
              <List
                dense
                sx={{ pt: 0 }}
              >
                {items.map((cmd, _index) => {
                  const globalIndex = filteredCommands.indexOf(cmd);
                  const isSelected = globalIndex === selectedIndex;
                  return (
                    <ListItemButton
                      key={cmd.id}
                      selected={isSelected}
                      onClick={() => {
                        cmd.action();
                        onClose();
                      }}
                      sx={{
                        px: 2,
                        py: 1,
                        borderRadius: 1,
                        mx: 1,
                        mb: 0.5,
                        '&.Mui-selected': {
                          bgcolor: 'primary.50',
                          color: 'primary.main',
                          '&:hover': {
                            bgcolor: 'primary.50',
                          },
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{ minWidth: 36, color: isSelected ? 'primary.main' : 'text.secondary' }}
                      >
                        {cmd.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={cmd.label}
                        secondary={cmd.description}
                        slotProps={{
                          primary: {
                            sx: {
                              fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                              fontWeight: 500,
                            },
                          },
                          secondary: {
                            sx: { fontSize: designTokens.typography.fontSize.scale['0.75rem'] },
                          },
                        }}
                      />
                      <ArrowRight
                        style={{
                          width: 16,
                          height: 16,
                          opacity: isSelected ? 1 : 0,
                          color: theme.palette.primary.main,
                        }}
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            </Box>
          ))
        )}
      </Box>

      {/* 底部提示 */}
      <Box
        sx={{
          p: 1.5,
          borderTop: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          bgcolor: 'background.default',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Chip
            label='↑↓'
            size='small'
            sx={{ height: 20, fontSize: designTokens.typography.fontSize.scale['0.7rem'] }}
          />
          <Typography
            sx={{
              fontSize: designTokens.typography.fontSize.scale['0.75rem'],
              color: 'text.secondary',
            }}
          >
            {i18n.t('components.command_palette.k12')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Chip
            label='⏎'
            size='small'
            sx={{ height: 20, fontSize: designTokens.typography.fontSize.scale['0.7rem'] }}
          />
          <Typography
            sx={{
              fontSize: designTokens.typography.fontSize.scale['0.75rem'],
              color: 'text.secondary',
            }}
          >
            {i18n.t('components.command_palette.k13')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}>
          <Chip
            label='ESC'
            size='small'
            sx={{ height: 20, fontSize: designTokens.typography.fontSize.scale['0.7rem'] }}
          />
          <Typography
            sx={{
              fontSize: designTokens.typography.fontSize.scale['0.75rem'],
              color: 'text.secondary',
            }}
          >
            {i18n.t('components.command_palette.k14')}
          </Typography>
        </Box>
      </Box>
    </Dialog>
  );
};

export default CommandPalette;
