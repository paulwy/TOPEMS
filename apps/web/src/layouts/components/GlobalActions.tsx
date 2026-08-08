import React from 'react';
import { Stack, Tooltip, IconButton } from '@mui/material';
import { Search, Sparkles, Briefcase, Sun, Moon, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useThemeMode } from '@/hooks/useThemeMode';
import { PLUGIN_PATHS } from '@/modules/plugin/config';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import { AI_PATHS } from '@/modules/ai/config';

export interface GlobalActionsProps {
  onSearchClick?: () => void;
}

export const GlobalActions: React.FC<GlobalActionsProps> = ({ onSearchClick }) => {
  const navigate = useNavigate();
  const { isDark, toggleMode } = useThemeMode();

  const buttonSx = {
    width: 36,
    height: 36,
    '&:hover': { bgcolor: 'action.hover' },
  };

  return (
    <Stack
      direction='row'
      spacing={0.25}
    >
      <Tooltip title='搜索 (⌘K / Ctrl+K)'>
        <IconButton
          size='small'
          aria-label='搜索 (⌘K / Ctrl+K)'
          onClick={onSearchClick}
          sx={buttonSx}
        >
          <Search style={{ width: 18, height: 18 }} />
        </IconButton>
      </Tooltip>

      <Tooltip title='AI'>
        <IconButton
          size='small'
          aria-label='AI'
          onClick={() => navigate(AI_PATHS.root)}
          sx={{ ...buttonSx, color: 'primary.main' }}
        >
          <Sparkles style={{ width: 18, height: 18 }} />
        </IconButton>
      </Tooltip>

      <Tooltip title='工具箱'>
        <IconButton
          size='small'
          aria-label='工具箱'
          onClick={() => navigate(PLUGIN_PATHS.marketplace)}
          sx={buttonSx}
        >
          <Briefcase style={{ width: 18, height: 18 }} />
        </IconButton>
      </Tooltip>

      <Tooltip title={isDark ? '切换到浅色模式' : '切换到深色模式'}>
        <IconButton
          size='small'
          aria-label={isDark ? '切换到浅色模式' : '切换到深色模式'}
          onClick={toggleMode}
          sx={buttonSx}
        >
          {isDark ? (
            <Sun style={{ width: 18, height: 18 }} />
          ) : (
            <Moon style={{ width: 18, height: 18 }} />
          )}
        </IconButton>
      </Tooltip>

      <Tooltip title='帮助中心'>
        <IconButton
          size='small'
          aria-label='帮助中心'
          onClick={() => navigate(DASHBOARD_PATHS.helpCenter)}
          sx={buttonSx}
        >
          <HelpCircle style={{ width: 18, height: 18 }} />
        </IconButton>
      </Tooltip>
    </Stack>
  );
};

export default GlobalActions;
