import React from 'react';
import { Stack, Tooltip, IconButton } from '@mui/material';
import { Search, Sparkles } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AI_PATHS } from '@/modules/ai/config';
import { writeAICopilotContext } from '@/lib/ai/copilotContext';
import i18n from '@/i18n';

interface GlobalActionsProps {
  onSearchClick?: () => void;
}

/**
 * 顶栏全局动作按钮
 *
 * 仅保留 Search + AI 入口。插件市场已移至 Sidebar enterprise 域显式菜单项，
 * 避免与 Sidebar 的 plugin-marketplace 导航项重复。
 */
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
      <Tooltip title={i18n.t('layouts.global_actions.k0')}>
        <IconButton
          size='small'
          aria-label={i18n.t('layouts.global_actions.k1')}
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
            writeAICopilotContext({
              pathname: location.pathname,
              source: 'global-action',
              intent: 'chat',
            });
            navigate(AI_PATHS.root);
          }}
          sx={{ ...buttonSx, color: 'primary.main' }}
        >
          <Sparkles style={{ width: 18, height: 18 }} />
        </IconButton>
      </Tooltip>
    </Stack>
  );
};

export default GlobalActions;
