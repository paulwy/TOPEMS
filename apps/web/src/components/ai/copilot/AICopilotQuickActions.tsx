import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { BarChart3, Calendar, FileText, HelpCircle, Search, Zap } from 'lucide-react';
import type { QuickCommand } from '@/lib/ai/recommendations';
import i18n from '@/i18n';

interface AICopilotQuickActionsProps {
  commands: QuickCommand[];
  onSelect: (command: QuickCommand) => void;
}

const commandIcons: Record<string, React.ReactNode> = {
  [i18n.t('components.ai_copilot_quick_actions.k0')]: (
    <FileText style={{ width: 16, height: 16 }} />
  ),
  [i18n.t('components.ai_copilot_quick_actions.k1')]: (
    <Calendar style={{ width: 16, height: 16 }} />
  ),
  [i18n.t('components.ai_copilot_quick_actions.k2')]: <Search style={{ width: 16, height: 16 }} />,
  [i18n.t('components.ai_copilot_quick_actions.k3')]: (
    <BarChart3 style={{ width: 16, height: 16 }} />
  ),
  [i18n.t('components.ai_copilot_quick_actions.k4')]: (
    <HelpCircle style={{ width: 16, height: 16 }} />
  ),
};

export const AICopilotQuickActions: React.FC<AICopilotQuickActionsProps> = ({
  commands,
  onSelect,
}) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
    {commands.slice(0, 5).map((command) => (
      <Box
        key={command.command}
        onClick={() => onSelect(command)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1.25,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1.5,
          cursor: 'pointer',
          '&:hover': {
            bgcolor: 'action.hover',
            borderColor: 'primary.main',
          },
        }}
      >
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: 1,
            bgcolor: 'secondary.50',
            color: 'secondary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {commandIcons[command.command] || <Zap style={{ width: 16, height: 16 }} />}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant='body2'
            sx={{ fontWeight: 600 }}
          >
            {command.label}
          </Typography>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {command.description}
          </Typography>
        </Box>
        <Chip
          label={command.command}
          size='small'
          variant='outlined'
          sx={{ height: 22, fontFamily: 'monospace', fontSize: 11 }}
        />
      </Box>
    ))}
  </Box>
);

export default AICopilotQuickActions;
