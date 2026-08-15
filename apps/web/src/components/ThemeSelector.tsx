/**
 * 主题选择器 — 顶栏快捷切换
 *
 * 提供 亮色 / 暗色 / 赛博朋克 / 跟随系统 四种主题快速切换
 * 点击图标循环切换，长按或通过设置页查看全部选项
 */

import React, { useMemo, useState } from 'react';
import {
  IconButton,
  Tooltip,
  Menu,
  Box,
  Typography,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Sun, Moon, Sparkles, Monitor, Check } from 'lucide-react';
import {
  useThemeStore,
  getThemeList,
  type Theme,
  THEME_ICON_KEYS,
} from '@/store';

const THEME_ICON_COMPONENTS: Record<Theme, React.ReactNode> = {
  light: <Sun style={{ width: 18, height: 18 }} />,
  dark: <Moon style={{ width: 18, height: 18 }} />,
  cyberpunk: <Sparkles style={{ width: 18, height: 18 }} />,
  system: <Monitor style={{ width: 18, height: 18 }} />,
};

/**
 * 主题 i18n key 映射（懒翻译，组件渲染期才通过 useTranslation() 取值，避免模块加载期 i18n 未初始化）
 */
const THEME_LABEL_KEYS: Record<Theme, { iconKey: string; title: string; selectTheme: string }> = {
  light: {
    iconKey: 'components.theme_selector.k0',
    title: 'components.theme_selector.k0',
    selectTheme: 'components.theme_selector.k4',
  },
  dark: {
    iconKey: 'components.theme_selector.k1',
    title: 'components.theme_selector.k1',
    selectTheme: 'components.theme_selector.k4',
  },
  cyberpunk: {
    iconKey: 'components.theme_selector.k2',
    title: 'components.theme_selector.k2',
    selectTheme: 'components.theme_selector.k4',
  },
  system: {
    iconKey: 'components.theme_selector.k3',
    title: 'components.theme_selector.k3',
    selectTheme: 'components.theme_selector.k4',
  },
};

export interface ThemeSelectorProps {
  /** 是否显示下拉菜单（含全部选项），false 时仅显示图标按钮循环切换 */
  showMenu?: boolean;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ showMenu = true }) => {
  const { t } = useTranslation();
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  /** themeList 每次渲染懒翻译 */
  const themeListItems = useMemo(() => getThemeList((key) => t(key)), [t]);

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

  const currentThemeLabel = t(THEME_LABEL_KEYS[theme].title);
  const themeLabelPrefix = t('components.theme_selector.k0');
  const dropdownHint = showMenu ? t('components.theme_selector.k1') : '';
  const tooltipText = `${themeLabelPrefix} ${currentThemeLabel}${dropdownHint}`;
  const sectionTitle = t('components.theme_selector.k2');
  const ariaLabel = t(THEME_LABEL_KEYS[theme].selectTheme);

  // 防止 THEME_ICON_KEYS 未使用告警（供外部自定义消费）
  void THEME_ICON_KEYS;

  return (
    <>
      <Tooltip title={tooltipText}>
        <IconButton
          aria-label={ariaLabel}
          onClick={handleClick}
          sx={{
            width: 36,
            height: 36,
            '&:hover': { bgcolor: 'action.hover' },
            color: theme === 'cyberpunk' ? 'primary.main' : 'inherit',
          }}
          size='small'
        >
          {THEME_ICON_COMPONENTS[theme]}
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
            <Typography
              variant='caption'
              color='text.secondary'
              sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}
            >
              {sectionTitle}
            </Typography>
          </Box>
          <Divider />
          {themeListItems.map((item) => (
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
              <ListItemIcon
                sx={{
                  minWidth: 36,
                  color: theme === item.value ? 'primary.main' : 'text.secondary',
                }}
              >
                {THEME_ICON_COMPONENTS[item.value]}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <Box>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: theme === item.value ? 600 : 400 }}
                      >
                        {item.label}
                      </Typography>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
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
