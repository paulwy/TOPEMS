import { designTokens } from '@topems/tokens';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  MessageSquare,
  Send,
  Plus,
  Copy,
  RefreshCw,
  Sparkles,
  User,
  Check,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  Bot,
} from 'lucide-react';
import {
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
  Avatar,
  Paper,
  CircularProgress,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';

import { useTranslation } from 'react-i18next';

import { ChatPageTemplate } from '@/components/templates';
import { AI_PATHS } from '@/modules/ai/config';
import { useNotificationStore } from '@/store';
import i18n from '@/i18n';
import { difyApi } from '@/api/ai';
import type {
  DifyConversation,
  DifyMessage,
  DifyStreamEvent,
  DifyInfoResponse,
} from '@/api/ai/types';

interface UiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  message_id?: string;
  feedback?: 'like' | 'dislike' | null;
  isStreaming?: boolean;
}

const DEFAULT_USER_ID = 'default-user';

export const DifyChatPage: React.FC = () => {
  const { t } = useTranslation();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [appInfo, setAppInfo] = useState<DifyInfoResponse | null>(null);
  const [conversations, setConversations] = useState<DifyConversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentStreamMessageIdRef = useRef<string | null>(null);

  useQuery({
    queryKey: ['dify', 'info'],
    queryFn: async () => {
      try {
        const res = await difyApi.info();
        if (res.success && res.data) {
          setAppInfo(res.data);
        }
        return res.data;
      } catch {
        return null;
      }
    },
  });

  const loadConversations = useCallback(async () => {
    setIsLoadingConversations(true);
    try {
      const res = await difyApi.listConversations({
        user: DEFAULT_USER_ID,
        limit: 50,
      });
      if (res.success && res.data) {
        const convs = Array.isArray(res.data)
          ? (res.data as unknown as DifyConversation[])
          : (res.data as { data?: DifyConversation[] }).data || [];
        setConversations(convs);
        if (convs.length > 0 && !selectedConversationId) {
          setSelectedConversationId(convs[0].id);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingConversations(false);
    }
  }, [selectedConversationId]);

  const loadMessages = useCallback(async (conversationId: string) => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    setIsLoadingMessages(true);
    try {
      const res = await difyApi.listMessages({
        conversation_id: conversationId,
        user: DEFAULT_USER_ID,
        limit: 100,
      });
      if (res.success && res.data) {
        const rawMsgs = Array.isArray(res.data)
          ? (res.data as unknown as DifyMessage[])
          : (res.data as { data?: DifyMessage[] }).data || [];

        const uiMsgs: UiMessage[] = [];
        rawMsgs.forEach((m) => {
          if (m.query) {
            uiMsgs.push({
              id: `q-${m.id}`,
              role: 'user',
              content: m.query,
              timestamp: new Date(m.created_at),
            });
          }
          uiMsgs.push({
            id: `a-${m.id}`,
            role: 'assistant',
            content: m.answer || '',
            timestamp: new Date(m.created_at),
            message_id: m.id,
            feedback: m.feedback?.rating || null,
          });
        });
        setMessages(uiMsgs);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (selectedConversationId) {
      loadMessages(selectedConversationId);
    }
  }, [selectedConversationId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNewChat = () => {
    setSelectedConversationId(null);
    setMessages([]);
    setInputValue('');
  };

  const handleSelectConversation = (id: string) => {
    if (id === selectedConversationId) return;
    setSelectedConversationId(id);
    setInputValue('');
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await difyApi.deleteConversation(id, DEFAULT_USER_ID);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (selectedConversationId === id) {
        const remaining = conversations.filter((c) => c.id !== id);
        setSelectedConversationId(remaining.length > 0 ? remaining[0].id : null);
      }
      addNotification({
        title: i18n.t('ai.chat.message.delete_session_title'),
        message: i18n.t('ai.chat.message.session_deleted'),
        type: 'info',
      });
    } catch {
      addNotification({
        title: i18n.t('ai.dify.error.delete_conv_title'),
        message: i18n.t('ai.dify.error.delete_conv_body'),
        type: 'error',
      });
    }
  };

  const handleSend = useCallback(async () => {
    const query = inputValue.trim();
    if (!query || isTyping) return;

    const tempId = `u-${Date.now()}`;
    const assistantTempId = `a-${Date.now() + 1}`;

    const userMessage: UiMessage = {
      id: tempId,
      role: 'user',
      content: query,
      timestamp: new Date(),
    };

    const assistantMessage: UiMessage = {
      id: assistantTempId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInputValue('');
    setIsTyping(true);
    currentStreamMessageIdRef.current = assistantTempId;

    try {
      const streamGenerator = difyApi.chatStream({
        query,
        user: DEFAULT_USER_ID,
        conversation_id: selectedConversationId || undefined,
      });

      let finalMessageId: string | undefined;
      let finalConversationId: string | undefined;

      for await (const event of streamGenerator as AsyncGenerator<DifyStreamEvent>) {
        if (event.event === 'message' || event.event === 'agent_message') {
          if (event.answer) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantTempId ? { ...m, content: m.content + (event.answer || '') } : m
              )
            );
          }
          if (event.message_id) {
            finalMessageId = event.message_id;
          }
          if (event.conversation_id) {
            finalConversationId = event.conversation_id;
          }
        } else if (event.event === 'message_replace') {
          if (event.answer) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantTempId ? { ...m, content: event.answer || '' } : m
              )
            );
          }
        } else if (event.event === 'message_end') {
          if (event.message_id) {
            finalMessageId = event.message_id;
          }
          if (event.conversation_id) {
            finalConversationId = event.conversation_id;
          }
        } else if (event.event === 'error') {
          addNotification({
            title: i18n.t('ai.dify.error.stream_title'),
            message: event.error || i18n.t('ai.dify.error.stream_body'),
            type: 'error',
          });
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantTempId
                ? {
                    ...m,
                    isStreaming: false,
                    content: `${m.content}\n\n${i18n.t('ai.dify.error.stream_prefix')}${
                      event.error || i18n.t('ai.dify.error.stream_body')
                    }`,
                  }
                : m
            )
          );
          break;
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantTempId
            ? {
                ...m,
                isStreaming: false,
                message_id: finalMessageId,
              }
            : m
        )
      );

      if (finalConversationId && finalConversationId !== selectedConversationId) {
        setSelectedConversationId(finalConversationId);
        loadConversations();
      } else if (selectedConversationId) {
        loadConversations();
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      addNotification({
        title: i18n.t('ai.dify.error.send_title'),
        message: i18n.t('ai.dify.error.send_body'),
        type: 'error',
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantTempId
            ? {
                ...m,
                isStreaming: false,
                content: `${m.content}\n\n${i18n.t('ai.dify.error.stream_prefix')}${errorMsg}`,
              }
            : m
        )
      );
    } finally {
      setIsTyping(false);
      currentStreamMessageIdRef.current = null;
      abortControllerRef.current = null;
    }
  }, [inputValue, isTyping, selectedConversationId, loadConversations, addNotification]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFeedback = async (messageId: string, rating: 'like' | 'dislike') => {
    try {
      const res = await difyApi.feedback(messageId, rating, DEFAULT_USER_ID);
      if (res.success) {
        setMessages((prev) =>
          prev.map((m) => (m.message_id === messageId ? { ...m, feedback: rating } : m))
        );
        addNotification({
          title: i18n.t('ai.dify.feedback.success_title'),
          message: i18n.t('ai.dify.feedback.success_body'),
          type: 'success',
        });
      }
    } catch {
      addNotification({
        title: i18n.t('ai.dify.error.feedback_title'),
        message: i18n.t('ai.dify.error.feedback_body'),
        type: 'error',
      });
    }
  };

  const handleRefreshConversations = () => {
    loadConversations();
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return i18n.t('ai.chat.time.just_now');
    if (minutes < 60) return i18n.t('ai.chat.time.minutes_ago', { count: minutes });
    if (hours < 24) return i18n.t('ai.chat.time.hours_ago', { count: hours });
    if (days < 7) return i18n.t('ai.chat.time.days_ago', { count: days });
    return date.toLocaleDateString();
  };

  const conversationName = (c: DifyConversation) => {
    if (c.name && c.name !== 'New conversation') return c.name;
    return i18n.t('ai.dify.conversation.untitled');
  };

  const sidebarContent = (
    <>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Button
          fullWidth
          variant='contained'
          startIcon={<Plus size={16} />}
          onClick={handleNewChat}
        >
          {i18n.t('ai.chat.action.new_chat')}
        </Button>
      </Box>

      <Box
        sx={{
          p: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography
          variant='caption'
          color='text.secondary'
        >
          {i18n.t('ai.dify.sidebar.conversations')}
        </Typography>
        <IconButton
          size='small'
          onClick={handleRefreshConversations}
          disabled={isLoadingConversations}
          aria-label={i18n.t('ai.dify.action.refresh')}
        >
          <RefreshCw
            size={14}
            className={isLoadingConversations ? 'animate-spin' : ''}
          />
        </IconButton>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {isLoadingConversations && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        )}
        {!isLoadingConversations && conversations.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 6, px: 2 }}>
            <MessageSquare
              size={32}
              style={{ margin: `0 auto ${designTokens.spacing.sm}px`, opacity: 0.4 }}
            />
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {i18n.t('ai.dify.sidebar.empty')}
            </Typography>
          </Box>
        )}
        {conversations.map((conv) => (
          <Paper
            key={conv.id}
            sx={{
              p: 1.5,
              m: 1,
              cursor: 'pointer',
              borderRadius: 1,
              border: 1,
              borderColor: selectedConversationId === conv.id ? 'primary.main' : 'transparent',
              bgcolor: selectedConversationId === conv.id ? 'primary.50' : 'transparent',
              '&:hover': { bgcolor: 'action.hover' },
            }}
            onClick={() => handleSelectConversation(conv.id)}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 0.5,
              }}
            >
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
                  flexShrink: 0,
                }}
              >
                <MessageSquare size={14} />
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
                {conversationName(conv)}
              </Typography>
              <Tooltip
                title={i18n.t('ai.chat.action.delete')}
                placement='top'
              >
                <IconButton
                  size='small'
                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                  sx={{ p: 0.5 }}
                >
                  <Trash2 size={14} />
                </IconButton>
              </Tooltip>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {formatTime(new Date(conv.created_at))}
              </Typography>
            </Box>
          </Paper>
        ))}
      </Box>
    </>
  );

  const headerContent = (
    <Box
      sx={{
        p: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Bot
          size={20}
          color={theme.palette.primary.main}
        />
        <Typography variant='h6'>{appInfo?.name || t('ai.dify.page.title')}</Typography>
        {appInfo?.description && (
          <Typography
            variant='caption'
            color='text.secondary'
            sx={{ ml: 1 }}
          >
            {appInfo.description}
          </Typography>
        )}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton
          onClick={handleNewChat}
          aria-label={i18n.t('ai.chat.action.new_chat')}
        >
          <RefreshCw size={20} />
        </IconButton>
      </Box>
    </Box>
  );

  const messagesContent = (
    <>
      {isLoadingMessages && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      )}
      {!isLoadingMessages &&
        messages.map((msg) => (
          <Box
            key={msg.id}
            sx={{
              display: 'flex',
              gap: 2,
              mb: 3,
              alignItems: 'flex-start',
            }}
            onMouseEnter={() => setHoveredMessageId(msg.id)}
            onMouseLeave={() => setHoveredMessageId(null)}
          >
            <Avatar
              sx={{
                bgcolor: msg.role === 'user' ? 'primary.main' : 'secondary.main',
              }}
            >
              {msg.role === 'user' ? <User size={20} /> : <Sparkles size={20} />}
            </Avatar>
            <Box sx={{ flex: 1, maxWidth: '100%' }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 0.5,
                }}
              >
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500 }}
                >
                  {msg.role === 'user'
                    ? i18n.t('ai.chat.role.user')
                    : i18n.t('ai.dify.role.assistant')}
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {msg.timestamp.toLocaleTimeString()}
                </Typography>
                <IconButton
                  size='small'
                  onClick={() => handleCopy(msg.content, msg.id)}
                  aria-label={i18n.t('ai.chat.action.copy_message')}
                >
                  {copiedId === msg.id ? (
                    <Check
                      size={14}
                      color='success'
                    />
                  ) : (
                    <Copy size={14} />
                  )}
                </IconButton>
                {msg.role === 'assistant' &&
                  msg.message_id &&
                  (hoveredMessageId === msg.id || msg.feedback) && (
                    <>
                      <Tooltip
                        title={i18n.t('ai.dify.action.like')}
                        placement='top'
                      >
                        <IconButton
                          size='small'
                          onClick={() => handleFeedback(msg.message_id!, 'like')}
                          disabled={msg.feedback === 'like'}
                          color={msg.feedback === 'like' ? 'primary' : 'default'}
                        >
                          <ThumbsUp size={14} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip
                        title={i18n.t('ai.dify.action.dislike')}
                        placement='top'
                      >
                        <IconButton
                          size='small'
                          onClick={() => handleFeedback(msg.message_id!, 'dislike')}
                          disabled={msg.feedback === 'dislike'}
                          color={msg.feedback === 'dislike' ? 'error' : 'default'}
                        >
                          <ThumbsDown size={14} />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
              </Box>
              <Paper
                sx={{
                  p: 2,
                  bgcolor: msg.role === 'user' ? 'primary.light' : 'background.paper',
                  position: 'relative',
                }}
              >
                <Typography
                  variant='body2'
                  sx={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.content}
                  {msg.isStreaming && (
                    <Box
                      component='span'
                      sx={{
                        display: 'inline-block',
                        width: 2,
                        height: '1em',
                        bgcolor: 'text.primary',
                        ml: 0.5,
                        animation: 'pulse 1s infinite',
                        verticalAlign: 'text-bottom',
                      }}
                    />
                  )}
                </Typography>
              </Paper>
            </Box>
          </Box>
        ))}
      {isTyping && messages.length > 0 && !messages[messages.length - 1].isStreaming && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Avatar sx={{ bgcolor: 'secondary.main' }}>
            <Sparkles size={20} />
          </Avatar>
          <Paper sx={{ p: 2 }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {i18n.t('ai.chat.status.typing')}
            </Typography>
          </Paper>
        </Box>
      )}
      {!isLoadingMessages && messages.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 12 }}>
          <Bot
            size={48}
            style={{
              margin: `0 auto ${designTokens.spacing.md}px`,
              color: theme.palette.text.disabled,
            }}
          />
          <Typography
            variant='h6'
            sx={{ mb: 2 }}
          >
            {i18n.t('ai.dify.empty.start_title')}
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}
          >
            {appInfo?.description || i18n.t('ai.dify.empty.start_subtitle')}
          </Typography>
        </Box>
      )}
      <div ref={messagesEndRef} />
    </>
  );

  const inputContent = (
    <>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder={t('ai.dify.placeholder.input')}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          size='small'
          disabled={isTyping}
        />
        <Button
          variant='contained'
          onClick={handleSend}
          disabled={!inputValue.trim() || isTyping}
          sx={{ alignSelf: 'stretch', minWidth: 48 }}
        >
          {isTyping ? (
            <CircularProgress
              size={20}
              color='inherit'
            />
          ) : (
            <Send size={20} />
          )}
        </Button>
      </Box>
      <Typography
        variant='caption'
        color='text.secondary'
        sx={{ mt: 1, display: 'block' }}
      >
        {i18n.t('ai.dify.disclaimer_bottom')}
      </Typography>
    </>
  );

  return (
    <ChatPageTemplate
      pageContainerProps={{
        title: appInfo?.name || t('ai.dify.page.title'),
        headerProps: {
          pageIcon: <Bot size={20} />,
          backButton: { href: AI_PATHS.dashboard },
        },
      }}
      sidebar={isDesktop ? sidebarContent : null}
      header={headerContent}
      messages={messagesContent}
      input={inputContent}
    />
  );
};

export default DifyChatPage;
