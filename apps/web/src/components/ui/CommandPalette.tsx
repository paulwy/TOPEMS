import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {Dialog,
  Box,
  TextField,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Chip,
  IconButton, useTheme} from '@mui/material';
import {
  Search,
  X,
  ArrowRight,
  Command,
  Home,
  Settings,
  User,
  Bell,
  Sun,
  Moon,
  Bookmark,
  Clock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { navigationRegistryV2 } from '@/lib/navigation';
import type { NavItem } from '@/lib/navigation/types';
import { renderIcon } from '@/lib/iconMapping';

export interface CommandPaletteProps {
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
        label: '切换主题',
        description: '切换浅色/深色模式',
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
        label: '系统设置',
        description: '打开系统设置页面',
        icon: <Settings style={{ width: 18, height: 18 }} />,
        action: () => navigate('/settings'),
        category: 'action',
      },
      {
        id: 'go-profile',
        label: '个人中心',
        description: '查看和编辑个人信息',
        icon: <User style={{ width: 18, height: 18 }} />,
        action: () => navigate('/profile'),
        category: 'action',
      },
      {
        id: 'go-home',
        label: '返回首页',
        description: '回到首页仪表盘',
        icon: <Home style={{ width: 18, height: 18 }} />,
        action: () => navigate('/dashboard'),
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
    recent: '最近访问',
    favorite: '我的收藏',
    page: '页面',
    action: '操作',
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='sm'
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          mt: '20vh',
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        },
      }}
    >
      {/* 搜索框 */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <TextField
          inputRef={inputRef}
          fullWidth
          placeholder='搜索页面、操作...'
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
                      sx={{ height: 20, fontSize: '0.7rem' }}
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
            <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
              未找到匹配的结果
            </Typography>
          </Box>
        ) : (
          Object.entries(groupedCommands).map(([category, items]) => (
            <Box key={category}>
              {query === '' && (
                <Box sx={{ px: 2, pt: 2, pb: 1 }}>
                  <Typography
                    sx={{
                      fontSize: '0.75rem',
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
                {items.map((cmd, index) => {
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
                        slotProps={{ primary: { sx: { fontSize: '0.875rem', fontWeight: 500 } }, secondary: { sx: { fontSize: '0.75rem' } } }}
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
            sx={{ height: 20, fontSize: '0.7rem' }}
          />
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>导航</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Chip
            label='⏎'
            size='small'
            sx={{ height: 20, fontSize: '0.7rem' }}
          />
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>选择</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}>
          <Chip
            label='ESC'
            size='small'
            sx={{ height: 20, fontSize: '0.7rem' }}
          />
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>关闭</Typography>
        </Box>
      </Box>
    </Dialog>
  );
};

export default CommandPalette;
