/**
 * 对话历史记录组件
 *
 * @module components/ai
 */

import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Search,
  Clock,
  Trash2,
  Lightbulb,
  FileText,
  Code,
  Filter,
} from 'lucide-react';
import i18n from '@/i18n';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
} from '@mui/material';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  timestamp: Date;
  type: 'qa' | 'summary' | 'code' | 'general';
}

interface ChatHistoryProps {
  sessions: ChatSession[];
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onNewSession: () => void;
  activeTab: 'qa' | 'summary' | 'code' | 'general';
  onTabChange: (tab: 'qa' | 'summary' | 'code' | 'general') => void;
}

const getTypeIcon = (type: ChatSession['type']) => {
  const icons = {
    qa: <Lightbulb size={16} />,
    summary: <FileText size={16} />,
    code: <Code size={16} />,
    general: <MessageSquare size={16} />,
  };
  return icons[type];
};

const getTypeLabel = (type: ChatSession['type']) => {
  const labels = {
    qa: i18n.t('components.chat_history.k0'),
    summary: i18n.t('components.chat_history.k1'),
    code: i18n.t('components.chat_history.k2'),
    general: i18n.t('components.chat_history.k3'),
  };
  return labels[type];
};

const getTypeColor = (type: ChatSession['type']) => {
  const colors = {
    qa: 'primary',
    summary: 'info',
    code: 'success',
    general: 'default',
  };
  return colors[type];
};

const formatTime = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return i18n.t('components.chat_history.k4');
  if (minutes < 60) return `${minutes}${i18n.t('components.chat_history.k0')}`;
  if (hours < 24) return `${hours}${i18n.t('components.chat_history.k1')}`;
  if (days < 7) return `${days}${i18n.t('components.chat_history.k2')}`;
  return date.toLocaleDateString();
};

export const ChatHistory: React.FC<ChatHistoryProps> = ({
  sessions,
  selectedSessionId,
  onSelectSession,
  onDeleteSession,
  onNewSession,
  activeTab,
  onTabChange,
}) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ChatSession['type'] | 'all'>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      const matchSearch =
        !searchQuery ||
        session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.messages.some((msg) =>
          msg.content.toLowerCase().includes(searchQuery.toLowerCase())
        );
      const matchType = filterType === 'all' || session.type === filterType;
      return matchSearch && matchType;
    });
  }, [sessions, searchQuery, filterType]);

  const handleDeleteClick = (sessionId: string) => {
    setSessionToDelete(sessionId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (sessionToDelete) {
      onDeleteSession(sessionToDelete);
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
    }
  };

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: 280,
          borderRight: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        {/* 新建对话按钮 */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Button
            fullWidth
            variant='contained'
            startIcon={<MessageSquare size={16} />}
            onClick={onNewSession}
          >
            {i18n.t('components.chat_history.k3')}
          </Button>
        </Box>

        {/* 功能模式切换 */}
        <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Typography
            variant='caption'
            color='text.secondary'
            sx={{ mb: 1, display: 'block' }}
          >
            {i18n.t('components.chat_history.k4')}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {[
              {
                id: 'qa' as const,
                label: i18n.t('components.chat_history.k5'),
                icon: <Lightbulb size={14} />,
              },
              {
                id: 'summary' as const,
                label: i18n.t('components.chat_history.k6'),
                icon: <FileText size={14} />,
              },
              {
                id: 'code' as const,
                label: i18n.t('components.chat_history.k7'),
                icon: <Code size={14} />,
              },
              {
                id: 'general' as const,
                label: i18n.t('components.chat_history.k8'),
                icon: <MessageSquare size={14} />,
              },
            ].map((tab) => (
              <Chip
                key={tab.id}
                icon={tab.icon}
                label={tab.label}
                size='small'
                variant={activeTab === tab.id ? 'filled' : 'outlined'}
                color={activeTab === tab.id ? 'primary' : 'default'}
                onClick={() => onTabChange(tab.id)}
                sx={{ fontSize: 11 }}
              />
            ))}
          </Box>
        </Box>

        {/* 搜索和筛选 */}
        <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <TextField
            size='small'
            placeholder={i18n.t('components.chat_history.k5')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ mb: 1, width: '100%' }}
            slotProps={{
              input: {
                startAdornment: (
                  <Box sx={{ mr: 1, color: 'text.secondary' }}>
                    <Search size={14} />
                  </Box>
                ),
              },
            }}
          />
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {(
              [
                { id: 'all' as const, label: i18n.t('components.chat_history.k9') },
                { id: 'qa' as const, label: i18n.t('components.chat_history.k10') },
                { id: 'summary' as const, label: i18n.t('components.chat_history.k11') },
                { id: 'code' as const, label: i18n.t('components.chat_history.k12') },
                { id: 'general' as const, label: i18n.t('components.chat_history.k13') },
              ] as const
            ).map((type) => (
              <Chip
                key={type.id}
                icon={type.id !== 'all' ? getTypeIcon(type.id) : <Filter size={12} />}
                label={type.label}
                size='small'
                variant={filterType === type.id ? 'filled' : 'outlined'}
                color={filterType === type.id ? 'primary' : 'default'}
                onClick={() => setFilterType(type.id)}
                sx={{ fontSize: 10 }}
              />
            ))}
          </Box>
        </Box>

        {/* 会话列表 */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
          {filteredSessions.length > 0 ? (
            <List disablePadding>
              {filteredSessions.map((session) => (
                <ListItem
                  key={session.id}
                  sx={{
                    p: 1.5,
                    mb: 0.5,
                    borderRadius: 1,
                    border: 1,
                    borderColor: selectedSessionId === session.id ? 'primary.main' : 'transparent',
                    bgcolor: selectedSessionId === session.id ? 'primary.50' : 'transparent',
                    '&:hover': { bgcolor: 'action.hover' },
                    cursor: 'pointer',
                  }}
                  onClick={() => onSelectSession(session.id)}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: 0.5,
                        bgcolor: `${getTypeColor(session.type)}.light`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: `${getTypeColor(session.type)}.main`,
                      }}
                    >
                      {getTypeIcon(session.type)}
                    </Box>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}
                      >
                        {session.title}
                      </Typography>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={getTypeLabel(session.type)}
                          size='small'
                          variant='outlined'
                          sx={{ fontSize: 9, height: 18 }}
                        />
                        <Typography
                          variant='caption'
                          color='text.secondary'
                          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                        >
                          <Clock size={10} />
                          {formatTime(session.timestamp)}
                        </Typography>
                      </Box>
                    }
                  />
                  <IconButton
                    size='small'
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(session.id);
                    }}
                    sx={{ p: 0.5, opacity: 0.6, '&:hover': { opacity: 1 } }}
                    aria-label={i18n.t('components.chat_history.k14')}
                  >
                    <Trash2 size={14} />
                  </IconButton>
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <MessageSquare
                size={32}
                style={{ margin: '0 auto 8px', color: theme.palette.text.disabled }}
              />
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {searchQuery
                  ? i18n.t('components.chat_history.k16')
                  : i18n.t('components.chat_history.k15')}
              </Typography>
            </Box>
          )}
        </Box>

        {/* 底部统计 */}
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {i18n.t('components.chat_history.k0')} {sessions.length}{' '}
            {i18n.t('components.chat_history.k1')}
          </Typography>
        </Box>
      </Box>

      {/* 删除确认对话框 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>{i18n.t('components.chat_history.k17')}</DialogTitle>
        <DialogContent>
          <Typography
            variant='body2'
            sx={{ mt: 1 }}
          >
            {i18n.t('components.chat_history.k6')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            {i18n.t('components.chat_history.k18')}
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color='error'
          >
            {i18n.t('components.chat_history.k7')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ChatHistory;
