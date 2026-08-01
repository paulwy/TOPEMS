/**
 * AI 对话页面 - V4.0 标准化改造
 *
 * @module pages/ai
 * @path /ai/chat
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Send,
  Plus,
  Settings,
  Trash2,
  Copy,
  RefreshCw,
  Sparkles,
  User,
  FileText,
  Code,
  Lightbulb,
  FileCode,
  ChevronRight,
  X,
  Check,
  Clock,
  Bookmark,
  Filter,
} from 'lucide-react';
import {
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
  Avatar,
  Paper,
  Divider,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
} from '@mui/material';

import { useTranslation } from 'react-i18next';

import { PageContainer } from '@/components/common';
import { AI_PATHS } from '@/modules/ai/config';
import { useNotificationStore } from '@/store';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'text' | 'code' | 'summary' | 'qa' | 'general';
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  timestamp: Date;
  type: 'qa' | 'summary' | 'code' | 'general';
}

const mockSessions: ChatSession[] = [
  {
    id: '1',
    title: '系统架构优化建议',
    messages: [],
    timestamp: new Date(Date.now() - 300000),
    type: 'qa',
  },
  {
    id: '2',
    title: '用户手册摘要',
    messages: [],
    timestamp: new Date(Date.now() - 1800000),
    type: 'summary',
  },
  {
    id: '3',
    title: 'React表单组件',
    messages: [],
    timestamp: new Date(Date.now() - 3600000),
    type: 'code',
  },
  {
    id: '4',
    title: '数据分析报告',
    messages: [],
    timestamp: new Date(Date.now() - 7200000),
    type: 'general',
  },
];

const mockMessages: Message[] = [
  {
    id: '1',
    role: 'user',
    content: '帮我分析一下这个系统架构有什么优化建议？',
    timestamp: new Date(Date.now() - 300000),
    type: 'qa',
  },
  {
    id: '2',
    role: 'assistant',
    content:
      '根据您提供的系统架构，我有以下优化建议：\n\n**1. 性能优化**\n- 建议引入 CDN 加速静态资源\n- 考虑使用 Redis 缓存热点数据\n- 数据库读写分离\n\n**2. 可扩展性**\n- 微服务架构拆分\n- 引入消息队列解耦\n- 配置中心统一管理\n\n**3. 安全性**\n- 加强 API 鉴权机制\n- 敏感数据加密存储\n- 引入 WAF 防护\n\n需要我详细展开某个方面的建议吗？',
    timestamp: new Date(Date.now() - 280000),
    type: 'qa',
  },
  {
    id: '3',
    role: 'user',
    content: '请详细说明微服务架构拆分的方案',
    timestamp: new Date(Date.now() - 60000),
    type: 'qa',
  },
  {
    id: '4',
    role: 'assistant',
    content:
      '微服务架构拆分建议：\n\n**核心服务拆分**\n1. **用户服务** - 用户注册、登录、权限\n2. **订单服务** - 订单创建、查询、管理\n3. **支付服务** - 支付、退款、对账\n4. **库存服务** - 库存查询、扣减、预警\n\n**技术选型**\n- 服务通信：gRPC / REST\n- 服务治理：Spring Cloud / Kubernetes\n- 服务发现：Consul / Nacos\n\n**实施步骤**\n1. 领域建模，明确边界\n2. 逐步拆分，先易后难\n3. 数据同步，保证一致性\n4. 全量切换，灰度发布',
    timestamp: new Date(Date.now() - 30000),
    type: 'qa',
  },
];

const quickPrompts = [
  { id: '1', label: 'quick_prompt.analyze', icon: <Lightbulb size={16} />, category: 'qa' },
  { id: '2', label: 'quick_prompt.summarize', icon: <FileText size={16} />, category: 'summary' },
  { id: '3', label: 'quick_prompt.generate_code', icon: <Code size={16} />, category: 'code' },
  { id: '4', label: 'quick_prompt.explain_code', icon: <FileCode size={16} />, category: 'code' },
];

const getTypeIcon = (type: ChatSession['type']) => {
  const icons = {
    qa: <Lightbulb size={16} />,
    summary: <FileText size={16} />,
    code: <Code size={16} />,
    general: <MessageSquare size={16} />,
  };
  return icons[type];
};

const getTypeLabel = (type: Message['type']) => {
  const labels: Record<string, string> = {
    qa: 'qa',
    summary: 'summary',
    code: 'code',
    general: 'general',
    text: 'text',
  };
  return labels[type || 'text'];
};

export const AiChatPage: React.FC = () => {
  const theme = useTheme();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-4');
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<'qa' | 'summary' | 'code' | 'general'>('qa');
  const [sessions, setSessions] = useState<ChatSession[]>(mockSessions);
  const [selectedSessionId, setSelectedSessionId] = useState('1');
  const [showSidebar, setShowSidebar] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docUploadDialog, setDocUploadDialog] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState('typescript');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: String(Date.now()),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
      type: activeTab,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      let responseContent = '';
      switch (activeTab) {
        case 'qa':
          responseContent = t('ai.chat.response.qa');
          break;
        case 'summary':
          responseContent = t('ai.chat.response.summary');
          break;
        case 'code':
          responseContent = t('ai.chat.response.code');
          break;
        default:
          responseContent = t('ai.chat.response.default');
      }

      const assistantMessage: Message = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
        type: activeTab,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
      addNotification({ title: t('ai.chat.message.sent_title'), message: t('ai.chat.message.ai_replied'), type: 'success' });
    }, 1500);
  }, [inputValue, activeTab, addNotification, t]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    addNotification({ title: t('ai.chat.message.copy_success_title'), message: t('ai.chat.message.copy_success_body'), type: 'success' });
  };

  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: String(Date.now()),
      title: t('ai.chat.session.new_title'),
      messages: [],
      timestamp: new Date(),
      type: activeTab,
    };
    setSessions((prev) => [newSession, ...prev]);
    setSelectedSessionId(newSession.id);
    setMessages([]);
    addNotification({ title: t('ai.chat.message.new_session_title'), message: t('ai.chat.message.session_created'), type: 'info' });
  };

  const handleSelectSession = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    const session = sessions.find((s) => s.id === sessionId);
    if (session) {
      setMessages(session.messages);
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (selectedSessionId === sessionId) {
      const remaining = sessions.filter((s) => s.id !== sessionId);
      if (remaining.length > 0) {
        setSelectedSessionId(remaining[0].id);
        setMessages(remaining[0].messages);
      } else {
        setMessages([]);
      }
    }
    addNotification({ title: t('ai.chat.message.delete_session_title'), message: t('ai.chat.message.session_deleted'), type: 'info' });
  };

  const handleQuickPrompt = (prompt: (typeof quickPrompts)[0]) => {
    setInputValue(t('ai.chat.' + prompt.label));
    setActiveTab(prompt.category as typeof activeTab);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocFile(file);
      addNotification({
        title: t('ai.chat.message.file_upload_title'),
        message: t('ai.chat.dialog.file_selected', { name: file.name }),
        type: 'info',
      });
    }
  };

  const handleStartSummary = () => {
    if (!docFile) return;
    setDocUploadDialog(false);
    setActiveTab('summary');
    setInputValue(t('ai.chat.message.summary_prompt'));
    addNotification({
      title: t('ai.chat.message.start_summary_title'),
      message: t('ai.chat.message.analyzing_document'),
      type: 'info',
    });
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t('ai.chat.time.just_now');
    if (minutes < 60) return t('ai.chat.time.minutes_ago', { count: minutes });
    if (hours < 24) return t('ai.chat.time.hours_ago', { count: hours });
    if (days < 7) return t('ai.chat.time.days_ago', { count: days });
    return date.toLocaleDateString();
  };

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);

  return (
    <PageContainer
      headerProps={{
        pageIcon: <MessageSquare size={20} />,
        backButton: { href: AI_PATHS.dashboard },
      }}
    >
      <Box sx={{ display: 'flex', height: 'calc(100vh - 140px)', bgcolor: 'background.default' }}>
        {/* 左侧会话列表 */}
        {showSidebar && (
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
                onClick={handleNewChat}
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
                {[
                  { id: 'qa', label: t('ai.chat.mode.qa'), icon: <Lightbulb size={14} /> },
                  { id: 'summary', label: t('ai.chat.mode.summary'), icon: <FileText size={14} /> },
                  { id: 'code', label: t('ai.chat.mode.code'), icon: <Code size={14} /> },
                  { id: 'general', label: t('ai.chat.mode.general'), icon: <MessageSquare size={14} /> },
                ].map((tab) => (
                  <Chip
                    key={tab.id}
                    icon={tab.icon}
                    label={tab.label}
                    size='small'
                    variant={activeTab === tab.id ? 'filled' : 'outlined'}
                    color={activeTab === tab.id ? 'primary' : 'default'}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
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
                  onClick={() => handleSelectSession(session.id)}
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
                        handleDeleteSession(session.id);
                      }}
                      sx={{ p: 0.5 }}
                    >
                      <X size={14} />
                    </IconButton>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={t('ai.chat.type.' + getTypeLabel(session.type))}
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
                    label={t('ai.chat.' + prompt.label)}
                    size='small'
                    variant='outlined'
                    onClick={() => handleQuickPrompt(prompt)}
                    sx={{ fontSize: 11 }}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        )}

        {/* 右侧聊天区域 */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* 顶部 */}
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
              <IconButton
                size='small'
                onClick={() => setShowSidebar(!showSidebar)}
                sx={{ display: { md: 'none' } }}
              >
                <ChevronRight size={20} />
              </IconButton>
              <Sparkles
                size={20}
                color='primary.main'
              />
              <Typography variant='h6'>{selectedSession?.title || t('ai.chat.title.default')}</Typography>
              {selectedSession && (
                <Chip
                  label={t('ai.chat.type.' + getTypeLabel(selectedSession.type))}
                  size='small'
                  color='primary'
                />
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FormControl
                size='small'
                sx={{ minWidth: 150 }}
              >
                <InputLabel>{t('ai.chat.field.model')}</InputLabel>
                <Select
                  value={selectedModel}
                  label={t('ai.chat.field.model')}
                  onChange={(e) => setSelectedModel(e.target.value)}
                >
                  <MenuItem value='gpt-4'>GPT-4</MenuItem>
                  <MenuItem value='gpt-3.5'>GPT-3.5</MenuItem>
                  <MenuItem value='claude'>Claude</MenuItem>
                  <MenuItem value='ERNIE'>{t('ai.chat.model.ernie')}</MenuItem>
                </Select>
              </FormControl>
              <IconButton
                onClick={handleNewChat}
                aria-label={t('ai.chat.action.new_chat')}
              >
                <RefreshCw size={20} />
              </IconButton>
            </Box>
          </Box>

          {/* 功能模式标签 */}
          <Box
            sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider', display: { md: 'none' } }}
          >
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              variant='scrollable'
              scrollButtons='auto'
              sx={{
                minHeight: 36,
                '& .MuiTab-root': { minHeight: 36, fontSize: '0.75rem' },
              }}
            >
              <Tab
                label={t('ai.chat.mode.qa')}
                value='qa'
              />
              <Tab
                label={t('ai.chat.mode.summary')}
                value='summary'
              />
              <Tab
                label={t('ai.chat.mode.code')}
                value='code'
              />
              <Tab
                label={t('ai.chat.mode.general')}
                value='general'
              />
            </Tabs>
          </Box>

          {/* 消息区域 */}
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
                        label={t('ai.chat.type.' + getTypeLabel(msg.type))}
                        size='small'
                        variant='outlined'
                        sx={{ fontSize: 10 }}
                      />
                    )}
                    <IconButton
                      size='small'
                      onClick={() => handleCopy(msg.content, msg.id)}
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
                                color: 'white',
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
                  {t('ai.chat.empty.start_title')}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('ai.chat.empty.start_subtitle')}
                </Typography>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>

          {/* 输入区域 */}
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            {activeTab === 'code' && (
              <Box sx={{ mb: 2 }}>
                <FormControl
                  size='small'
                  sx={{ width: 200 }}
                >
                  <InputLabel>{t('ai.chat.field.code_language')}</InputLabel>
                  <Select
                    value={codeLanguage}
                    label={t('ai.chat.field.code_language')}
                    onChange={(e) => setCodeLanguage(e.target.value)}
                  >
                    <MenuItem value='typescript'>TypeScript</MenuItem>
                    <MenuItem value='javascript'>JavaScript</MenuItem>
                    <MenuItem value='python'>Python</MenuItem>
                    <MenuItem value='java'>Java</MenuItem>
                    <MenuItem value='sql'>SQL</MenuItem>
                    <MenuItem value='go'>Go</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {activeTab === 'summary' && (
                  <Button
                    size='small'
                    variant='outlined'
                    startIcon={<FileText size={16} />}
                    onClick={() => setDocUploadDialog(true)}
                  >
                    {t('ai.chat.action.upload_document')}
                  </Button>
                )}
              </Box>
              <TextField
                fullWidth
                multiline
                maxRows={4}
                placeholder={
                  activeTab === 'qa'
                    ? t('ai.chat.placeholder.qa')
                    : activeTab === 'summary'
                      ? t('ai.chat.placeholder.summary')
                      : activeTab === 'code'
                        ? t('ai.chat.placeholder.code')
                        : t('ai.chat.placeholder.general')
                }
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                size='small'
              />
              <Button
                variant='contained'
                onClick={handleSend}
                disabled={!inputValue.trim() || isTyping}
              >
                <Send size={20} />
              </Button>
            </Box>
            <Typography
              variant='caption'
              color='text.secondary'
              sx={{ mt: 1, display: 'block' }}
            >
              {t('ai.chat.disclaimer_bottom')}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* 文档上传对话框 */}
      <Dialog
        open={docUploadDialog}
        onClose={() => setDocUploadDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('ai.chat.dialog.upload_title')}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <input
              type='file'
              accept='.txt,.md,.docx,.pdf'
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              id='doc-upload'
            />
            <Button
              variant='outlined'
              fullWidth
              component='label'
              htmlFor='doc-upload'
              sx={{ py: 4 }}
            >
              <FileText size={24} />
              <Typography sx={{ ml: 2 }}>
                {docFile ? t('ai.chat.dialog.file_selected', { name: docFile.name }) : t('ai.chat.dialog.click_to_select')}
              </Typography>
            </Button>
            <Typography
              variant='caption'
              color='text.secondary'
              sx={{ mt: 2, display: 'block' }}
            >
              {t('ai.chat.dialog.supported_formats')}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDocUploadDialog(false)}>{t('ai.chat.action.cancel')}</Button>
          <Button
            variant='contained'
            onClick={handleStartSummary}
            disabled={!docFile}
          >
            {t('ai.chat.action.start_summary')}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default AiChatPage;
