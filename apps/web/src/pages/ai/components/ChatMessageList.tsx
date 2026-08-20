/**
 * Chat message list - renders messages, typing indicator, and empty state.
 */
import React from 'react';
import type { RefObject } from 'react';
import { Sparkles, User, Copy, Check } from 'lucide-react';
import { Box, Typography, Avatar, Paper, Chip, IconButton } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { getTypeLabel, type Message } from '../hooks/useAiChat';

export interface ChatMessageListProps {
  messages: Message[];
  isTyping: boolean;
  copiedId: string | null;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  onCopy: (content: string, id: string) => void;
}

const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  isTyping,
  copiedId,
  messagesEndRef,
  onCopy,
}) => {
  const { t } = useTranslation();

  return (
    <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
      {messages.map((msg) => (
        <Box
          key={msg.id}
          sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'flex-start' }}
        >
          <Avatar sx={{ bgcolor: msg.role === 'user' ? 'primary.main' : 'secondary.main' }}>
            {msg.role === 'user' ? <User size={20} /> : <Sparkles size={20} />}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                {msg.role === 'user' ? t('ai.chat.role.user') : t('ai.chat.role.assistant')}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {msg.timestamp.toLocaleTimeString()}
              </Typography>
              {msg.type && (
                <Chip
                  label={getTypeLabel(msg.type, t)}
                  size='small'
                  variant='outlined'
                  sx={{ fontSize: 10 }}
                />
              )}
              <IconButton
                size='small'
                onClick={() => onCopy(msg.content, msg.id)}
                aria-label={t('ai.chat.action.copy_message')}
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
            </Box>
            <Paper
              sx={{
                p: 2,
                bgcolor: msg.role === 'user' ? 'primary.light' : 'background.paper',
              }}
            >
              {msg.content.includes('```') ? (
                <Box sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                  {msg.content.split('```').map((part, i) =>
                    i % 2 === 1 ? (
                      <Box
                        key={i}
                        sx={{
                          bg: 'grey.900',
                          color: 'common.white',
                          p: 2,
                          borderRadius: 1,
                          fontFamily: 'monospace',
                        }}
                      >
                        <pre
                          style={{
                            margin: 0,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {part}
                        </pre>
                      </Box>
                    ) : (
                      <Typography
                        key={i}
                        variant='body2'
                        sx={{ whiteSpace: 'pre-wrap' }}
                      >
                        {part}
                      </Typography>
                    )
                  )}
                </Box>
              ) : (
                <Typography
                  variant='body2'
                  sx={{ whiteSpace: 'pre-wrap' }}
                >
                  {msg.content}
                </Typography>
              )}
            </Paper>
          </Box>
        </Box>
      ))}
      {isTyping && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Avatar sx={{ bgcolor: 'secondary.main' }}>
            <Sparkles size={20} />
          </Avatar>
          <Paper sx={{ p: 2 }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {t('ai.chat.status.typing')}
            </Typography>
          </Paper>
        </Box>
      )}
      {messages.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 12 }}>
          <Sparkles
            size={48}
            style={{ margin: '0 auto 16px', color: 'text.disabled' }}
          />
          <Typography
            variant='h6'
            sx={{ mb: 2 }}
          >
            {t('ai.chat.empty.title')}
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {t('ai.chat.empty.subtitle')}
          </Typography>
        </Box>
      )}
      <div ref={messagesEndRef} />
    </Box>
  );
};

export default ChatMessageList;
