/**
 * Chat sidebar - session list, mode chips, and quick prompts.
 */
import React from 'react';
import { Plus, X, Lightbulb, FileText, Code, FileCode, MessageSquare } from 'lucide-react';
import { Box, Typography, IconButton, Button, Paper, Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  getTypeLabel,
  type ChatMode,
  type ChatSession,
  type QuickPrompt,
} from '../hooks/useAiChat';

const getTypeIcon = (type: ChatSession['type']) => {
  const icons: Record<ChatSession['type'], React.ReactNode> = {
    qa: <Lightbulb size={16} />,
    summary: <FileText size={16} />,
    code: <Code size={16} />,
    general: <MessageSquare size={16} />,
  };
  return icons[type];
};

export interface ChatSidebarProps {
  sessions: ChatSession[];
  selectedSessionId: string;
  activeTab: ChatMode;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onNewChat: () => void;
  onChangeMode: (mode: ChatMode) => void;
  onQuickPrompt: (prompt: QuickPrompt) => void;
  formatTime: (date: Date) => string;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  sessions,
  selectedSessionId,
  activeTab,
  onSelectSession,
  onDeleteSession,
  onNewChat,
  onChangeMode,
  onQuickPrompt,
  formatTime,
}) => {
  const { t } = useTranslation();
  const quickPrompts: QuickPrompt[] = [
    {
      id: '1',
      label: t('ai.chat.quick_prompt.analyze'),
      icon: <Lightbulb size={16} />,
      category: 'qa',
    },
    {
      id: '2',
      label: t('ai.chat.quick_prompt.summarize'),
      icon: <FileText size={16} />,
      category: 'summary',
    },
    {
      id: '3',
      label: t('ai.chat.quick_prompt.generate_code'),
      icon: <Code size={16} />,
      category: 'code',
    },
    {
      id: '4',
      label: t('ai.chat.quick_prompt.explain_code'),
      icon: <FileCode size={16} />,
      category: 'code',
    },
  ];

  const modeTabs: { id: ChatMode; label: string; icon: React.ReactElement }[] = [
    { id: 'qa', label: t('ai.chat.tab.qa'), icon: <Lightbulb size={14} /> },
    { id: 'summary', label: t('ai.chat.tab.summary'), icon: <FileText size={14} /> },
    { id: 'code', label: t('ai.chat.tab.code'), icon: <Code size={14} /> },
    { id: 'general', label: t('ai.chat.tab.general'), icon: <MessageSquare size={14} /> },
  ];

  return (
    <Box
      sx={{
        width: 280,
        borderRight: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        display: { xs: 'none', md: 'block' },
        flexDirection: 'column',
      }}
    >
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Button
          fullWidth
          variant='contained'
          startIcon={<Plus size={16} />}
          onClick={onNewChat}
        >
          {t('ai.chat.action.new_chat')}
        </Button>
      </Box>

      <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <Typography
          variant='caption'
          color='text.secondary'
          sx={{ mb: 1, display: 'block' }}
        >
          {t('ai.chat.sidebar.mode')}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {modeTabs.map((tab) => (
            <Chip
              key={tab.id}
              icon={tab.icon}
              label={tab.label}
              size='small'
              variant={activeTab === tab.id ? 'filled' : 'outlined'}
              color={activeTab === tab.id ? 'primary' : 'default'}
              onClick={() => onChangeMode(tab.id)}
              sx={{ fontSize: 11 }}
            />
          ))}
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {sessions.map((session) => (
          <Paper
            key={session.id}
            sx={{
              p: 1.5,
              m: 1,
              cursor: 'pointer',
              borderRadius: 1,
              border: 1,
              borderColor: selectedSessionId === session.id ? 'primary.main' : 'transparent',
              bgcolor: selectedSessionId === session.id ? 'primary.50' : 'transparent',
              '&:hover': { bgcolor: 'action.hover' },
            }}
            onClick={() => onSelectSession(session.id)}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: 0.5,
                  bgcolor: 'primary.light',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'primary.main',
                }}
              >
                {getTypeIcon(session.type)}
              </Box>
              <Typography
                variant='body2'
                sx={{
                  flex: 1,
                  fontWeight: 500,
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                }}
              >
                {session.title}
              </Typography>
              <IconButton
                size='small'
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSession(session.id);
                }}
                sx={{ p: 0.5 }}
              >
                <X size={14} />
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={getTypeLabel(session.type, t)}
                size='small'
                sx={{ fontSize: 10 }}
              />
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {formatTime(session.timestamp)}
              </Typography>
            </Box>
          </Paper>
        ))}
      </Box>

      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography
          variant='caption'
          color='text.secondary'
          sx={{ mb: 1, display: 'block' }}
        >
          {t('ai.chat.sidebar.quick_prompts')}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {quickPrompts.map((prompt) => (
            <Chip
              key={prompt.id}
              icon={prompt.icon}
              label={prompt.label}
              size='small'
              variant='outlined'
              onClick={() => onQuickPrompt(prompt)}
              sx={{ fontSize: 11 }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default ChatSidebar;
