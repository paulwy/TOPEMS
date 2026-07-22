/**
 * 主题选择器 — 顶栏快捷切换
 *
 * 提供 亮色 / 暗色 / 赛博朋克 / 跟随系统 四种主题快速切换
 * 点击图标循环切换，长按或通过设置页查看全部选项
 */

import React, { useState } from 'react';
import { IconButton, Tooltip, Menu, Box, Typography, ListItemButton, ListItemIcon, ListItemText, Divider } from '@mui/material';
import { Sun, Moon, Sparkles, Monitor, Check } from 'lucide-react';
import { useThemeStore, themeList, type Theme } from '@/store';

const themeIcons: Record<Theme, React.ReactNode> = {
  light: <Sun style={{ width: 18, height: 18 }} />,
  dark: <Moon style={{ width: 18, height: 18 }} />,
  cyberpunk: <Sparkles style={{ width: 18, height: 18 }} />,
  system: <Monitor style={{ width: 18, height: 18 }} />,
};

const themeLabels: Record<Theme, string> = {
  light: '亮色',
  dark: '暗色',
  cyberpunk: '赛博朋克',
  system: '跟随系统',
};

export interface ThemeSelectorProps {
  /** 是否显示下拉菜单（含全部选项），false 时仅显示图标按钮循环切换 */
  showMenu?: boolean;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ showMenu = true }) => {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (showMenu) {
      setAnchorEl(event.currentTarget);
    } else {
      toggleTheme();
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (next: Theme) => {
    setTheme(next);
    handleClose();
  };

  const tooltipText = `当前: ${themeLabels[theme]}${showMenu ? '（点击切换）' : ''}`;

  return (
    <>
      <Tooltip title={tooltipText}>
        <IconButton
          aria-label='切换主题'
          onClick={handleClick}
          sx={{
            width: 36,
            height: 36,
            '&:hover': { bgcolor: 'action.hover' },
            color: theme === 'cyberpunk' ? 'primary.main' : 'inherit',
          }}
          size='small'
        >
          {themeIcons[theme]}
        </IconButton>
      </Tooltip>

      {showMenu && (
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{
            paper: {
              sx: {
                minWidth: 220,
                mt: 1.5,
                borderRadius: 2,
              },
            },
          }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              主题模式
            </Typography>
          </Box>
          <Divider />
          {themeList.map((item) => (
            <ListItemButton
              key={item.value}
              onClick={() => handleSelect(item.value)}
              sx={{
                py: 1,
                px: 2,
                '&.Mui-selected': {
                  bgcolor: 'action.selected',
                },
              }}
              selected={theme === item.value}
            >
              <ListItemIcon sx={{ minWidth: 36, color: theme === item.value ? 'primary.main' : 'text.secondary' }}>
                {themeIcons[item.value]}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant='body2' sx={{ fontWeight: theme === item.value ? 600 : 400 }}>
                        {item.label}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {item.description}
                      </Typography>
                    </Box>
                    {theme === item.value && (
                      <Check style={{ width: 16, height: 16, color: 'primary.main' }} />
                    )}
                  </Box>
                }
              />
            </ListItemButton>
          ))}
        </Menu>
      )}
    </>
  );
};

export default ThemeSelector;
