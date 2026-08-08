import React from 'react';
import { Stack, Tooltip, IconButton } from '@mui/material';
import { Search, Sparkles, Briefcase } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PLUGIN_PATHS } from '@/modules/plugin/config';
import { AI_PATHS } from '@/modules/ai/config';

export interface GlobalActionsProps {
  onSearchClick?: () => void;
}

export const GlobalActions: React.FC<GlobalActionsProps> = ({ onSearchClick }) => {
  const navigate = useNavigate();
  const location = useLocation();

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
          onClick={() => {
            try {
              window.localStorage.setItem(
                'ai-copilot-context',
                JSON.stringify({
                  pathname: typeof window !== 'undefined' ? location.pathname : '/',
                  moduleCode: 'shared',
                  breadcrumbs: ['首页'],
                })
              );
            } catch {}
            navigate(AI_PATHS.root);
          }}
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
    </Stack>
  );
};

export default GlobalActions;
