import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { X as XIcon, Bot } from 'lucide-react';
import i18n from '@/i18n';
import type {
  Task,
  TaskStep,
  ExecutionContext,
  AgentEvent,
} from './autonomous-agent';
import type {
  Workflow as WorkflowType,
  WorkflowStep as WorkflowStepType,
  WorkflowTemplate,
  WorkflowEvent,
  StepType,
} from './workflow-engine';
import type {
  ConversationContext,
  MemoryEntry,
  Entity,
  Intent,
  Sentiment,
} from './context-engine';

export const V54AgentPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <Box sx={{ p: 3, minWidth: 480 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Bot size={20} />
          <Typography variant="h6">{i18n.t('ai.v54-agent-panel.title')}</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <XIcon size={18} />
        </IconButton>
      </Box>
      <Typography variant="body2" color="text.secondary">
        {i18n.t('ai.v54-agent-panel.disabled')}
      </Typography>
    </Box>
  );
};

export default V54AgentPanel;
