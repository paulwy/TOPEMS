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
  { id: '1', label: '分析这个问题', icon: <Lightbulb size={16} />, category: 'qa' },
  { id: '2', label: '总结这段文字', icon: <FileText size={16} />, category: 'summary' },
  { id: '3', label: '生成代码', icon: <Code size={16} />, category: 'code' },
  { id: '4', label: '解释这段代码', icon: <FileCode size={16} />, category: 'code' },
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
    qa: '问答',
    summary: '摘要',
    code: '代码',
    general: '对话',
    text: '文本',
  };
  return labels[type || 'text'];
};

export const AiChatPage: React.FC = () => {
  const theme = useTheme();
  const addNotification = useNotificationStore((state) => state.addNotification);
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
          responseContent =
            '感谢您的提问！AI助手正在分析您的问题...\n\n根据分析，以下是详细解答：\n\n1. 问题理解：您的问题涉及系统架构优化\n2. 关键要点：性能、可扩展性、安全性\n3. 建议方案：请参考之前的详细建议';
          break;
        case 'summary':
          responseContent =
            '文档摘要结果：\n\n**核心内容**\n- 本文档介绍了系统的主要功能模块\n- 包含架构设计和技术选型\n- 提供了部署和维护指南\n\n**关键点**\n- 系统采用微服务架构\n- 使用容器化部署\n- 支持水平扩展';
          break;
        case 'code':
          responseContent =
            '```typescript\n// 生成的代码示例\ninterface User {\n  id: string;\n  name: string;\n  email: string;\n}\n\nconst getUser = async (id: string): Promise<User> => {\n  const response = await fetch(`/api/users/${id}`);\n  return response.json();\n};\n```\n\n**代码说明**\n- 定义了 User 接口\n- 实现了 getUser 异步函数\n- 使用 TypeScript 类型安全';
          break;
        default:
          responseContent = '感谢您的提问！AI助手正在处理中，请稍候...';
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
      addNotification({ title: '消息发送', message: 'AI助手已回复', type: 'success' });
    }, 1500);
  }, [inputValue, activeTab, addNotification]);

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
    addNotification({ title: '复制成功', message: '内容已复制到剪贴板', type: 'success' });
  };

  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: String(Date.now()),
      title: '新对话',
      messages: [],
      timestamp: new Date(),
      type: activeTab,
    };
    setSessions((prev) => [newSession, ...prev]);
    setSelectedSessionId(newSession.id);
    setMessages([]);
    addNotification({ title: '新建对话', message: '对话已创建', type: 'info' });
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
    addNotification({ title: '删除对话', message: '对话已删除', type: 'info' });
  };

  const handleQuickPrompt = (prompt: (typeof quickPrompts)[0]) => {
    setInputValue(`请${prompt.label}`);
    setActiveTab(prompt.category as typeof activeTab);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocFile(file);
      addNotification({
        title: '文件上传',
        message: `已选择文件: ${file.name}`,
        type: 'info',
      });
    }
  };

  const handleStartSummary = () => {
    if (!docFile) return;
    setDocUploadDialog(false);
    setActiveTab('summary');
    setInputValue(
      `请总结以下文档内容：\n\n文件名：${docFile.name}\n文件大小：${docFile.size} bytes`
    );
    addNotification({
      title: '开始摘要',
      message: '正在分析文档内容...',
      type: 'info',
    });
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
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
                新建对话
              </Button>
            </Box>

            <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ mb: 1, display: 'block' }}
              >
                功能模式
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {[
                  { id: 'qa', label: '智能问答', icon: <Lightbulb size={14} /> },
                  { id: 'summary', label: '文档摘要', icon: <FileText size={14} /> },
                  { id: 'code', label: '代码生成', icon: <Code size={14} /> },
                  { id: 'general', label: '通用对话', icon: <MessageSquare size={14} /> },
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
                      label={getTypeLabel(session.type)}
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
                快捷提示
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {quickPrompts.map((prompt) => (
                  <Chip
                    key={prompt.id}
                    icon={prompt.icon}
                    label={prompt.label}
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
              <Typography variant='h6'>{selectedSession?.title || 'AI 智能对话'}</Typography>
              {selectedSession && (
                <Chip
                  label={getTypeLabel(selectedSession.type)}
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
                <InputLabel>模型</InputLabel>
                <Select
                  value={selectedModel}
                  label='模型'
                  onChange={(e) => setSelectedModel(e.target.value)}
                >
                  <MenuItem value='gpt-4'>GPT-4</MenuItem>
                  <MenuItem value='gpt-3.5'>GPT-3.5</MenuItem>
                  <MenuItem value='claude'>Claude</MenuItem>
                  <MenuItem value='ERNIE'>文心一言</MenuItem>
                </Select>
              </FormControl>
              <IconButton
                onClick={handleNewChat}
                aria-label='新建对话'
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
                label='智能问答'
                value='qa'
              />
              <Tab
                label='文档摘要'
                value='summary'
              />
              <Tab
                label='代码生成'
                value='code'
              />
              <Tab
                label='通用对话'
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
                      {msg.role === 'user' ? '我' : 'AI助手'}
                    </Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {msg.timestamp.toLocaleTimeString()}
                    </Typography>
                    {msg.type && (
                      <Chip
                        label={getTypeLabel(msg.type)}
                        size='small'
                        variant='outlined'
                        sx={{ fontSize: 10 }}
                      />
                    )}
                    <IconButton
                      size='small'
                      onClick={() => handleCopy(msg.content, msg.id)}
                      aria-label='复制消息内容'
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
                    AI 正在输入...
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
                  开始对话
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  选择功能模式，输入您的问题
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
                  <InputLabel>代码语言</InputLabel>
                  <Select
                    value={codeLanguage}
                    label='代码语言'
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
                    上传文档
                  </Button>
                )}
              </Box>
              <TextField
                fullWidth
                multiline
                maxRows={4}
                placeholder={
                  activeTab === 'qa'
                    ? '输入您的问题...'
                    : activeTab === 'summary'
                      ? '粘贴文本或上传文档进行摘要...'
                      : activeTab === 'code'
                        ? '描述您需要的代码，或粘贴代码进行解释...'
                        : '输入消息，Shift+Enter换行...'
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
              AI助手可能会产生不准确的信息，请谨慎使用
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
        <DialogTitle>上传文档</DialogTitle>
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
                {docFile ? `已选择: ${docFile.name}` : '点击选择文档'}
              </Typography>
            </Button>
            <Typography
              variant='caption'
              color='text.secondary'
              sx={{ mt: 2, display: 'block' }}
            >
              支持 .txt, .md, .docx, .pdf 格式
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDocUploadDialog(false)}>取消</Button>
          <Button
            variant='contained'
            onClick={handleStartSummary}
            disabled={!docFile}
          >
            开始摘要
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default AiChatPage;
