import React from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Popover,
  Typography,
  useTheme,
} from '@mui/material';
import { ChevronRight, MessageSquare, Sparkles, X, Zap } from 'lucide-react';
import { AICopilotSearchBox } from './AICopilotSearchBox';
import { AICopilotRecommendations } from './AICopilotRecommendations';
import { AICopilotQuickActions } from './AICopilotQuickActions';
import type { AIRecommendation, QuickCommand } from '@/lib/ai/recommendations';

interface AICopilotPanelProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  recommendations: AIRecommendation[];
  commands: QuickCommand[];
  onSearch: (query: string) => void;
  onRecommendationSelect: (recommendation: AIRecommendation) => void;
  onCommandSelect: (command: QuickCommand) => void;
  onOpenFull: () => void;
}

export const AICopilotPanel: React.FC<AICopilotPanelProps> = ({
  anchorEl,
  open,
  onClose,
  recommendations,
  commands,
  onSearch,
  onRecommendationSelect,
  onCommandSelect,
  onOpenFull,
}) => {
  const theme = useTheme();

  return (
    <Popover
      open={open && Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
      transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      slotProps={{
        paper: {
          className: 'ai-helper-panel',
          sx: {
            width: 320,
            minWidth: 320,
            height: 420,
            maxWidth: 'none',
            maxHeight: 'calc(100vh - 32px)',
            borderRadius: 2.5,
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(15, 23, 42, 0.22)',
          },
        },
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            p: 1.75,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            color: 'common.white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Sparkles style={{ width: 19, height: 19 }} />
            <Box>
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 700, lineHeight: 1.1 }}
              >
                AI Copilot
              </Typography>
              <Typography
                variant='caption'
                sx={{ opacity: 0.82 }}
              >
                当前页面上下文已带入
              </Typography>
            </Box>
          </Box>
          <IconButton
            size='small'
            onClick={onClose}
            sx={{ color: 'common.white' }}
            aria-label='关闭'
          >
            <X style={{ width: 16, height: 16 }} />
          </IconButton>
        </Box>

        <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <AICopilotSearchBox onSubmit={onSearch} />
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
            <Chip
              icon={<MessageSquare style={{ width: 13, height: 13 }} />}
              label='推荐'
              size='small'
              color='primary'
            />
            <Typography
              variant='caption'
              color='text.secondary'
            >
              Top {recommendations.length}
            </Typography>
          </Box>
          <AICopilotRecommendations
            recommendations={recommendations}
            onSelect={onRecommendationSelect}
            compact
          />

          <Divider sx={{ my: 1.5 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
            <Chip
              icon={<Zap style={{ width: 13, height: 13 }} />}
              label='快捷命令'
              size='small'
              variant='outlined'
            />
          </Box>
          <AICopilotQuickActions
            commands={commands}
            onSelect={onCommandSelect}
          />
        </Box>

        <Box sx={{ p: 1.25, borderTop: 1, borderColor: 'divider' }}>
          <Button
            fullWidth
            size='small'
            endIcon={<ChevronRight style={{ width: 16, height: 16 }} />}
            onClick={onOpenFull}
          >
            打开完整 AI 助手
          </Button>
        </Box>
      </Box>
    </Popover>
  );
};

export default AICopilotPanel;
