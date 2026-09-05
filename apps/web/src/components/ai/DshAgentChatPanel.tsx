/**
 * DSH Agent 聊天面板组件
 *
 * 提供基于 DSH Agent 编排器的聊天界面，支持：
 * - 同步/流式执行 Agent
 * - 多轮对话
 * - 工具调用展示
 * - 执行步骤展示
 * - 会话管理
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  TextField,
  IconButton,
  Paper,
  Typography,
  CircularProgress,
  Chip,
  Divider,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import BuildIcon from '@mui/icons-material/Build';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

import {
  dshAgentApi,
  type DshAgentExecuteResponse,
  type ExecutionStep,
  type StreamEventType,
  type StreamEventData,
} from '@/api/ai/dsh-agent';

// ============================================================================
// 类型定义
// ============================================================================

/** 聊天消息 */
interface ChatMessage {
  /** 消息 ID */
  id: string;
  /** 角色 */
  role: 'user' | 'assistant' | 'system';
  /** 内容 */
  content: string;
  /** 时间戳 */
  timestamp: Date;
  /** 执行步骤（仅 assistant 消息） */
  steps?: ExecutionStep[];
  /** 使用的工具（仅 assistant 消息） */
  tools_used?: string[];
  /** 是否正在流式输出 */
  streaming?: boolean;
  /** 是否出错 */
  error?: boolean;
}

// ============================================================================
// 组件 Props
// ============================================================================

interface DshAgentChatPanelProps {
  /** 会话 ID（可选） */
  sessionId?: string;
  /** 标题 */
  title?: string;
  /** 最大高度 */
  maxHeight?: number;
  /** 是否显示标题栏 */
  showHeader?: boolean;
  /** 初始消息 */
  initialMessages?: ChatMessage[];
  /** 消息发送回调 */
  onMessageSent?: (message: string) => void;
  /** 响应接收回调 */
  onResponseReceived?: (response: DshAgentExecuteResponse) => void;
}

// ============================================================================
// 组件实现
// ============================================================================

export const DshAgentChatPanel: React.FC<DshAgentChatPanelProps> = ({
  sessionId,
  title,
  maxHeight = 600,
  showHeader = true,
  initialMessages = [],
  onMessageSent,
  onResponseReceived,
}) => {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t('ai.dsh_agent_panel.title');

  // 状态
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(sessionId);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 生成唯一 ID
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // 处理流式事件
  const handleStreamEvent = useCallback(
    (event: StreamEventType, data: StreamEventData, messageId: string) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;

          switch (event) {
            case 'thinking':
              return {
                ...msg,
                content: data.thought || t('ai.dsh_agent_panel.thinking'),
              };
            case 'content_delta':
              return {
                ...msg,
                content: msg.content + (data.delta || ''),
              };
            case 'content_complete':
              return {
                ...msg,
                content: data.content || msg.content,
                streaming: false,
              };
            case 'tool_call_start':
              return {
                ...msg,
                content: t('ai.dsh_agent_panel.tool_call', {
                  content: msg.content,
                  tool: data.tool_name,
                }),
              };
            case 'tool_call_complete':
              return {
                ...msg,
                content: t('ai.dsh_agent_panel.tool_done', {
                  content: msg.content,
                  tool: data.tool_name,
                }),
              };
            case 'error':
              return {
                ...msg,
                content: t('ai.dsh_agent_panel.tool_error', {
                  content: msg.content,
                  error: data.error,
                }),
                error: true,
                streaming: false,
              };
            case 'session_end':
              return {
                ...msg,
                streaming: false,
              };
            default:
              return msg;
          }
        })
      );
    },
    [t]
  );

  // 发送消息
  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    const assistantMessageId = generateId();
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      streaming: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    onMessageSent?.(input.trim());

    try {
      // 使用流式 API
      await dshAgentApi.executeStream(
        {
          query: userMessage.content,
          session_id: currentSessionId,
        },
        (event, data) => {
          handleStreamEvent(event, data, assistantMessageId);

          // 记录会话 ID
          if (data.session_id && !currentSessionId) {
            setCurrentSessionId(data.session_id);
          }
        }
      );

      // 流式结束后，获取完整响应（用于步骤和工具信息）
      // 注意：这里简化处理，实际应用中可以从流式事件中收集步骤信息
      setMessages((prev) =>
        prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, streaming: false } : msg))
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : t('ai.dsh_agent_panel.error_unknown');
      setError(errorMessage);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: t('ai.dsh_agent_panel.exec_failed', { message: errorMessage }),
                error: true,
                streaming: false,
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [input, isLoading, currentSessionId, onMessageSent, handleStreamEvent, t]);

  // 清除会话
  const handleClearSession = useCallback(async () => {
    if (currentSessionId) {
      try {
        await dshAgentApi.clearSession(currentSessionId);
      } catch (err) {
        console.error('清除会话失败:', err);
      }
    }
    setMessages([]);
    setCurrentSessionId(undefined);
    setError(null);
  }, [currentSessionId]);

  // 处理键盘事件
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // 渲染工具步骤
  const renderStep = (step: ExecutionStep, index: number) => (
    <Box
      key={index}
      sx={{ mb: 1, ml: 2 }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {step.success ? (
          <CheckCircleIcon
            color='success'
            fontSize='small'
          />
        ) : (
          <ErrorIcon
            color='error'
            fontSize='small'
          />
        )}
        <Typography
          variant='body2'
          component='span'
        >
          {t('ai.dsh_agent_panel.step', {
            number: step.step_number,
            description: step.description,
          })}
        </Typography>
        {step.tool_name && (
          <Chip
            icon={<BuildIcon />}
            label={step.tool_name}
            size='small'
            variant='outlined'
          />
        )}
        <Typography
          variant='caption'
          color='text.secondary'
        >
          ({step.duration_ms}ms)
        </Typography>
      </Box>
    </Box>
  );

  // 渲染消息
  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === 'user';

    return (
      <Box
        key={message.id}
        sx={{
          display: 'flex',
          flexDirection: isUser ? 'row-reverse' : 'row',
          gap: 1,
          mb: 2,
        }}
      >
        {/* 头像 */}
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: isUser ? 'primary.main' : 'secondary.main',
            color: 'common.white',
            flexShrink: 0,
          }}
        >
          {isUser ? <PersonIcon fontSize='small' /> : <SmartToyIcon fontSize='small' />}
        </Box>

        {/* 消息内容 */}
        <Paper
          elevation={1}
          sx={{
            p: 2,
            maxWidth: '75%',
            bgcolor: isUser ? 'primary.light' : 'background.paper',
            borderTopLeftRadius: isUser ? 12 : 0,
            borderTopRightRadius: isUser ? 0 : 12,
            borderBottomLeftRadius: 12,
            borderBottomRightRadius: 12,
          }}
        >
          {/* 消息文本 */}
          <Typography
            variant='body1'
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {message.content || (message.streaming ? t('ai.dsh_agent_panel.thinking') : '')}
          </Typography>

          {/* 流式指示器 */}
          {message.streaming && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <CircularProgress size={16} />
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {t('ai.dsh_agent_panel.generating')}
              </Typography>
            </Box>
          )}

          {/* 执行步骤 */}
          {message.steps && message.steps.length > 0 && (
            <Accordion sx={{ mt: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant='body2'>
                  {t('ai.dsh_agent_panel.exec_steps', { count: message.steps.length })}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {message.steps.map((step, index) => renderStep(step, index))}
              </AccordionDetails>
            </Accordion>
          )}

          {/* 使用的工具 */}
          {message.tools_used && message.tools_used.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
              {message.tools_used.map((tool, index) => (
                <Chip
                  key={index}
                  icon={<BuildIcon />}
                  label={tool}
                  size='small'
                  variant='outlined'
                />
              ))}
            </Box>
          )}

          {/* 时间戳 */}
          <Typography
            variant='caption'
            color='text.secondary'
            sx={{ mt: 1, display: 'block' }}
          >
            {message.timestamp.toLocaleTimeString()}
          </Typography>
        </Paper>
      </Box>
    );
  };

  return (
    <Paper
      elevation={2}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxHeight,
        overflow: 'hidden',
      }}
    >
      {/* 标题栏 */}
      {showHeader && (
        <Box
          sx={{
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SmartToyIcon color='primary' />
            <Typography variant='h6'>{resolvedTitle}</Typography>
            {currentSessionId && (
              <Chip
                label={t('ai.dsh_agent_panel.session_label', {
                  id: currentSessionId.substring(0, 8),
                })}
                size='small'
                variant='outlined'
              />
            )}
          </Box>
          <Tooltip title={t('ai.dsh_agent_panel.clear_session')}>
            <IconButton
              onClick={handleClearSession}
              size='small'
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* 错误提示 */}
      {error && (
        <Alert
          severity='error'
          onClose={() => setError(null)}
          sx={{ m: 1 }}
        >
          {error}
        </Alert>
      )}

      {/* 消息列表 */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {messages.length === 0 ? (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
            }}
          >
            <SmartToyIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography
              variant='h6'
              gutterBottom
            >
              {t('ai.dsh_agent_panel.help_title')}
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {t('ai.dsh_agent_panel.help_subtitle')}
            </Typography>
          </Box>
        ) : (
          messages.map(renderMessage)
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* 输入区域 */}
      <Box
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          gap: 1,
        }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder={t('ai.dsh_agent_panel.input_placeholder')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          inputRef={inputRef}
          size='small'
        />
        <IconButton
          color='primary'
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          sx={{ alignSelf: 'flex-end' }}
        >
          {isLoading ? <CircularProgress size={24} /> : <SendIcon />}
        </IconButton>
      </Box>
    </Paper>
  );
};

export default DshAgentChatPanel;
