import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  Divider,
  IconButton,
  Chip,
  Rating,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip,
  Pagination,
  Avatar,
  Slider,
  Switch,
  FormControlLabel,
  Menu,
  MenuItem,
  Drawer,
} from '@mui/material';
import {
  Search,
  Send,
  MessageSquare,
  History,
  ThumbsUp,
  Trash2,
  RefreshCw,
  Bot,
  User,
  ChevronRight,
  X,
  AlertCircle,
  Zap,
  Plus,
  Settings,
  Cpu,
  Sparkles,
  MoreHorizontal,
  Layers,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { aiApi, type QAHistoryItem } from '../../api/ai';
import { logger } from '@/utils/logger';
import { useAppStore } from '@/store';
import { PageContainer } from '@/components/common';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  confidence?: number;
  question_type?: string;
  sources?: string[];
  follow_up_questions?: string[];
  qa_id?: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

interface AIModel {
  id: string;
  name: string;
  provider: string;
}

const AVAILABLE_MODELS: AIModel[] = [
  { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI' },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic' },
  { id: 'ernie-4.0', name: '文心一言 4.0', provider: '百度' },
  { id: 'qwen-max', name: '通义千问 Max', provider: '阿里' },
];

const mockConversations: Conversation[] = [
  {
    id: '1',
    title: '库存管理流程咨询',
    created_at: '2024-06-21 10:30',
    updated_at: '2024-06-21 10:45',
    message_count: 12,
  },
  {
    id: '2',
    title: '如何创建入库订单',
    created_at: '2024-06-20 14:20',
    updated_at: '2024-06-20 15:00',
    message_count: 8,
  },
  {
    id: '3',
    title: '库存预警设置',
    created_at: '2024-06-19 09:15',
    updated_at: '2024-06-19 09:30',
    message_count: 5,
  },
  {
    id: '4',
    title: '安全库存计算方法',
    created_at: '2024-06-18 16:45',
    updated_at: '2024-06-18 17:10',
    message_count: 6,
  },
];

const QUESTION_TYPE_LABELS: Record<string, string> = {
  Factual: '事实性问题',
  Procedural: '过程性问题',
  Analytical: '分析性问题',
  Advisory: '建议性问题',
  Confirmation: '确认性问题',
  Comparative: '比较性问题',
  Predictive: '预测性问题',
  Diagnostic: '诊断性问题',
  Definition: '定义性问题',
  Unknown: '未知类型',
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'success.dark',
  medium: 'warning.main',
  low: 'error.main',
};

export const AiChatPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'conversations' | 'history'>('conversations');
  const [history, setHistory] = useState<QAHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [feedbackDialog, setFeedbackDialog] = useState<{
    open: boolean;
    qaId: string;
    answer: string;
  }>({ open: false, qaId: '', answer: '' });
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');

  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<AIModel>(AVAILABLE_MODELS[0]);
  const [modelMenuAnchor, setModelMenuAnchor] = useState<null | HTMLElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [streamingEnabled, setStreamingEnabled] = useState(true);
  const [useKnowledgeBase, setUseKnowledgeBase] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const loadHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const response = await aiApi.getQAHistory({
        page: currentPage,
        pagesize: 10,
        query: searchQuery || undefined,
      });

      if (response.success && response.data) {
        setHistory(response.data.history || []);
        setTotalPages(Math.ceil((response.data.total || 0) / 10));
      }
    } catch (error: unknown) {
      logger.error('Failed to load QA history:', error);
      addNotification({
        title: '加载失败',
        message: '无法加载问答历史',
        type: 'error',
      });
    } finally {
      setHistoryLoading(false);
    }
  }, [addNotification, currentPage, searchQuery]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, currentPage, searchQuery, loadHistory]);

  const handleNewConversation = useCallback(() => {
    const newConv: Conversation = {
      id: Date.now().toString(),
      title: '新对话',
      created_at: new Date().toLocaleString('zh-CN'),
      updated_at: new Date().toLocaleString('zh-CN'),
      message_count: 0,
    };
    setConversations((prev) => [newConv, ...prev]);
    setCurrentConversationId(newConv.id);
    setMessages([]);
    addNotification({
      title: '新对话',
      message: '已创建新的对话',
      type: 'success',
    });
  }, [addNotification]);

  const handleSelectConversation = useCallback((conv: Conversation) => {
    setCurrentConversationId(conv.id);
    setActiveTab('conversations');
    setMessages([
      {
        id: '1',
        role: 'user',
        content: conv.title,
        timestamp: new Date(),
      },
      {
        id: '2',
        role: 'assistant',
        content: '这是关于"' + conv.title + '"的对话内容。我可以帮助您解答相关问题。',
        timestamp: new Date(),
      },
    ]);
  }, []);

  const handleDeleteConversation = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (currentConversationId === id) {
      setCurrentConversationId(null);
      setMessages([]);
    }
    addNotification({
      title: '删除成功',
      message: '对话已删除',
      type: 'success',
    });
  }, [currentConversationId, addNotification]);

  const handleSend = async () => {
    const question = inputValue.trim();
    if (!question || loading) return;

    setInputValue('');
    setLoading(true);

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const historyPairs = messages
        .slice(-5)
        .map((msg) => ({ question: msg.content, answer: msg.content }));

      const response = await aiApi.askConversation({
        question,
        history: historyPairs,
        top_k: 5,
      });

      if (response.success && response.data) {
        const structuredResponse = await aiApi.askStructured({
          question,
          top_k: 5,
        });

        let assistantMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: response.data.answer,
          qa_id: response.data.qa_id,
          confidence: response.data.confidence,
          timestamp: new Date(),
        };

        if (structuredResponse.success && structuredResponse.data) {
          assistantMessage = {
            ...assistantMessage,
            question_type: structuredResponse.data.question_type,
            sources: structuredResponse.data.sources,
            follow_up_questions: structuredResponse.data.follow_up_questions,
            confidence: structuredResponse.data.confidence,
          };
        }

        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: '抱歉，我暂时无法回答这个问题。',
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error: unknown) {
      logger.error('Failed to send message:', error);
      addNotification({
        title: '发送失败',
        message: '消息发送失败，请稍后重试',
        type: 'error',
      });
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: '抱歉，服务暂时不可用，请稍后重试。',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowUp = (question: string) => {
    setInputValue(question);
    inputRef.current?.focus();
    setActiveTab('conversations');
  };

  const handleFeedback = (qaId: string, answer: string) => {
    setFeedbackDialog({ open: true, qaId, answer });
    setFeedbackRating(0);
    setFeedbackText('');
  };

  const submitFeedback = async () => {
    if (!feedbackRating) {
      addNotification({
        title: '提示',
        message: '请先选择评分',
        type: 'warning',
      });
      return;
    }

    try {
      const response = await aiApi.submitFeedback({
        qa_id: feedbackDialog.qaId,
        feedback: feedbackText || '用户反馈',
        rating: feedbackRating,
      });

      if (response.success) {
        addNotification({
          title: '成功',
          message: '反馈已提交，感谢您的评价',
          type: 'success',
        });
        setFeedbackDialog({ open: false, qaId: '', answer: '' });
      }
    } catch (error: unknown) {
      logger.error('Failed to submit feedback:', error);
      addNotification({
        title: '提交失败',
        message: '反馈提交失败',
        type: 'error',
      });
    }
  };

  const handleDeleteHistory = async (id: string) => {
    if (!window.confirm('确定要删除这条记录吗？')) return;

    try {
      const response = await aiApi.deleteQAHistory(id);
      if (response.success) {
        addNotification({
          title: '成功',
          message: '记录已删除',
          type: 'success',
        });
        loadHistory();
      }
    } catch (error: unknown) {
      logger.error('Failed to delete history:', error);
      addNotification({
        title: '删除失败',
        message: '删除记录失败',
        type: 'error',
      });
    }
  };

  const handleHistoryItemClick = (item: QAHistoryItem) => {
    setMessages([
      {
        id: '1',
        role: 'user',
        content: item.question,
        timestamp: new Date(item.created_at),
      },
      {
        id: '2',
        role: 'assistant',
        content: item.answer,
        qa_id: item.id,
        confidence: item.rating ? item.rating / 5 : undefined,
        timestamp: new Date(item.created_at),
      },
    ]);
    setActiveTab('conversations');
  };

  const getConfidenceLevel = (confidence?: number) => {
    if (!confidence) return 'medium';
    if (confidence >= 0.7) return 'high';
    if (confidence >= 0.4) return 'medium';
    return 'low';
  };

  const getConfidenceLabel = (confidence?: number) => {
    if (!confidence) return '未知';
    if (confidence >= 0.7) return '高';
    if (confidence >= 0.4) return '中';
    return '低';
  };

  return (
    <PageContainer
      title='AI 助手'
      padding={false}
      maxWidth={false}
      headerProps={{
        pageIcon: <Zap style={{ width: 20, height: 20 }} />,
        pageGradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          height: '100vh',
          backgroundColor: '#f5f7fa',
        }}
      >
        <Box
          sx={{
            width: 360,
            backgroundColor: 'white',
            borderRight: '1px solid grey.200',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box
            sx={{
              p: 3,
              background: 'linear-gradient(135deg, primary.main 0%, secondary.main 100%)',
              color: 'white',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 1,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bot sx={{ width: 24, height: 24 }} />
              </Box>
              <Box>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 600 }}
                >
                  TOPEMS AI 助手
                </Typography>
                <Typography
                  variant='caption'
                  sx={{ opacity: 0.9 }}
                >
                  智能问答与数据分析
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', borderBottom: '1px solid grey.200' }}>
            <Button
              onClick={() => setActiveTab('conversations')}
              sx={{
                flex: 1,
                py: 2,
                borderBottom: `2px solid ${activeTab === 'conversations' ? 'primary.main' : 'transparent'}`,
                color: activeTab === 'conversations' ? 'primary.main' : 'text.secondary',
                fontWeight: activeTab === 'conversations' ? 600 : 400,
              }}
            >
              <MessageSquare sx={{ width: 16, height: 16, mr: 1 }} />
              会话
            </Button>
            <Button
              onClick={() => setActiveTab('history')}
              sx={{
                flex: 1,
                py: 2,
                borderBottom: `2px solid ${activeTab === 'history' ? 'primary.main' : 'transparent'}`,
                color: activeTab === 'history' ? 'primary.main' : 'text.secondary',
                fontWeight: activeTab === 'history' ? 600 : 400,
              }}
            >
              <History sx={{ width: 16, height: 16, mr: 1 }} />
              历史记录
            </Button>
          </Box>

          {activeTab === 'conversations' && (
            <Box sx={{ p: 2, borderBottom: '1px solid grey.200' }}>
              <Button
                fullWidth
                variant='contained'
                startIcon={<Plus size={18} />}
                onClick={handleNewConversation}
              >
                新建对话
              </Button>
            </Box>
          )}

          {activeTab === 'history' && (
            <Box sx={{ p: 2, borderBottom: '1px solid grey.200' }}>
              <TextField
                fullWidth
                size='small'
                placeholder='搜索历史记录...'
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <Search sx={{ width: 16, height: 16, mr: 1, color: 'text.disabled' }} />
                    ),
                  },
                }}
              />
            </Box>
          )}

          <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
            {activeTab === 'conversations' ? (
              <List disablePadding>
                {conversations.map((conv) => (
                  <ListItem
                    key={conv.id}
                    sx={{
                      p: 2,
                      mb: 1,
                      borderRadius: 1,
                      cursor: 'pointer',
                      bgcolor: currentConversationId === conv.id ? 'primary.50' : 'transparent',
                      border: '1px solid',
                      borderColor: currentConversationId === conv.id ? 'primary.main' : 'grey.200',
                      '&:hover': {
                        backgroundColor: 'grey.50',
                      },
                    }}
                    onClick={() => handleSelectConversation(conv)}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <MessageSquare size={18} style={{ color: currentConversationId === conv.id ? '#6366f1' : '#9ca3af' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant='body2' sx={{ fontWeight: 500 }} noWrap>
                          {conv.title}
                        </Typography>
                      }
                      secondary={
                        <Typography variant='caption' color='text.secondary'>
                          {conv.message_count} 条消息 · {conv.updated_at}
                        </Typography>
                      }
                    />
                    <IconButton
                      size='small'
                      onClick={(e) => handleDeleteConversation(conv.id, e)}
                      sx={{ opacity: 0.6, '&:hover': { opacity: 1, color: 'error.main' } }}
                    >
                      <Trash2 size={14} />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
            ) : historyLoading ? (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  py: 8,
                }}
              >
                <CircularProgress size={24} />
              </Box>
            ) : history.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <History
                  sx={{
                    width: 48,
                    height: 48,
                    color: 'grey.300',
                    mx: 'auto',
                    mb: 2,
                  }}
                />
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  暂无历史记录
                </Typography>
              </Box>
            ) : (
              <List>
                {history.map((item) => (
                  <ListItem
                    key={item.id}
                    sx={{
                      p: 2,
                      mb: 1,
                      borderRadius: 1,
                      border: '1px solid grey.200',
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'grey.100',
                        borderColor: 'primary.main',
                      },
                    }}
                    onClick={() => handleHistoryItemClick(item)}
                  >
                    <ListItemText
                      primary={
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 500, mb: 1 }}
                          noWrap
                        >
                          {item.question}
                        </Typography>
                      }
                      secondary={
                        <Typography
                          variant='caption'
                          color='text.secondary'
                          noWrap
                        >
                          {item.answer.slice(0, 50)}...
                        </Typography>
                      }
                    />
                    <IconButton
                      size='small'
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteHistory(item.id);
                      }}
                      sx={{ color: 'error.main' }}
                    >
                      <Trash2 sx={{ width: 16, height: 16 }} />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>

          {activeTab === 'history' && history.length > 0 && (
            <Box
              sx={{
                p: 2,
                borderTop: '1px solid grey.200',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={(_, page) => setCurrentPage(page)}
                size='small'
              />
            </Box>
          )}
        </Box>

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Box
              sx={{
                p: 3,
                backgroundColor: 'white',
                borderBottom: '1px solid grey.200',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 600 }}
                >
                  智能对话
                </Typography>
                <Chip
                  icon={<Cpu size={14} />}
                  label={selectedModel.name}
                  size='small'
                  variant='outlined'
                  onClick={(e) => setModelMenuAnchor(e.currentTarget)}
                  sx={{ cursor: 'pointer' }}
                />
                <Menu
                  anchorEl={modelMenuAnchor}
                  open={Boolean(modelMenuAnchor)}
                  onClose={() => setModelMenuAnchor(null)}
                >
                  {AVAILABLE_MODELS.map((model) => (
                    <MenuItem
                      key={model.id}
                      selected={selectedModel.id === model.id}
                      onClick={() => {
                        setSelectedModel(model);
                        setModelMenuAnchor(null);
                        addNotification({
                          title: '模型已切换',
                          message: `当前使用：${model.name}`,
                          type: 'success',
                        });
                      }}
                    >
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography variant='body2' sx={{ fontWeight: 500 }}>
                          {model.name}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {model.provider}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Menu>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Tooltip title='对话设置'>
                  <IconButton
                    onClick={() => setSettingsOpen(true)}
                    size='small'
                  >
                    <Settings size={18} />
                  </IconButton>
                </Tooltip>
                <Button
                  size='small'
                  variant='text'
                  startIcon={<Plus size={14} />}
                  onClick={handleNewConversation}
                >
                  新对话
                </Button>
                <Button
                  size='small'
                  variant='text'
                  onClick={() => setMessages([])}
                >
                  清空对话
                </Button>
              </Box>
            </Box>

              <Box
                sx={{
                  flex: 1,
                  overflowY: 'auto',
                  p: 4,
                  backgroundColor: '#f5f7fa',
                }}
              >
                {messages.length === 0 ? (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                    }}
                  >
                    <Paper
                      sx={{
                        p: 8,
                        textAlign: 'center',
                        backgroundColor: 'white',
                        borderRadius: 2,
                      }}
                    >
                      <Box
                        sx={{
                          width: 80,
                          height: 80,
                          borderRadius: '50%',
                          background:
                            'linear-gradient(135deg, primary.main 0%, secondary.main 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mx: 'auto',
                          mb: 4,
                        }}
                      >
                        <Bot sx={{ width: 40, height: 40, color: 'white' }} />
                      </Box>
                      <Typography
                        variant='h5'
                        sx={{ fontWeight: 600, mb: 2 }}
                      >
                        欢迎使用 TOPEMS AI 助手
                      </Typography>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        我可以帮助您解答关于库存管理、订单处理、业务流程等方面的问题。
                        您可以直接提问，我会基于知识库为您提供准确的答案。
                      </Typography>
                    </Paper>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {messages.map((message) => (
                      <Box
                        key={message.id}
                        sx={{
                          display: 'flex',
                          gap: 2,
                          justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            backgroundColor: message.role === 'user' ? 'primary.main' : 'grey.200',
                          }}
                        >
                          {message.role === 'user' ? (
                            <User sx={{ width: 18, height: 18, color: 'white' }} />
                          ) : (
                            <Bot sx={{ width: 18, height: 18, color: 'text.secondary' }} />
                          )}
                        </Box>
                        <Paper
                          sx={{
                            maxWidth: '70%',
                            p: 3,
                            borderRadius:
                              message.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                            backgroundColor: message.role === 'user' ? 'primary.main' : 'white',
                            color: message.role === 'user' ? 'white' : 'inherit',
                          }}
                        >
                          <Typography variant='body1'>{message.content}</Typography>

                          {message.role === 'assistant' && (
                            <Box
                              sx={{
                                mt: 2,
                                pt: 2,
                                borderTop: '1px solid grey.200',
                              }}
                            >
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 2,
                                  flexWrap: 'wrap',
                                }}
                              >
                                {message.question_type && (
                                  <Chip
                                    label={
                                      QUESTION_TYPE_LABELS[message.question_type] ||
                                      message.question_type
                                    }
                                    size='small'
                                    sx={{
                                      backgroundColor: 'grey.100',
                                      color: 'grey.700',
                                      fontSize: 11,
                                    }}
                                  />
                                )}
                                {message.confidence !== undefined && (
                                  <Chip
                                    label={`置信度: ${getConfidenceLabel(message.confidence)}`}
                                    size='small'
                                    sx={{
                                      backgroundColor: 'grey.100',
                                      color:
                                        CONFIDENCE_COLORS[getConfidenceLevel(message.confidence)],
                                      fontSize: 11,
                                    }}
                                  />
                                )}
                              </Box>

                              {message.sources && message.sources.length > 0 && (
                                <Box sx={{ mt: 2 }}>
                                  <Typography
                                    variant='caption'
                                    color='text.secondary'
                                    sx={{ display: 'block', mb: 1 }}
                                  >
                                    参考来源:
                                  </Typography>
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      flexWrap: 'wrap',
                                      gap: 1,
                                    }}
                                  >
                                    {message.sources.map((source, index) => (
                                      <Chip
                                        key={index}
                                        label={source}
                                        size='small'
                                        sx={{
                                          backgroundColor: 'warning.light',
                                          color: '#92400e',
                                          fontSize: 10,
                                        }}
                                      />
                                    ))}
                                  </Box>
                                </Box>
                              )}

                              {message.follow_up_questions &&
                                message.follow_up_questions.length > 0 && (
                                  <Box sx={{ mt: 2 }}>
                                    <Typography
                                      variant='caption'
                                      color='text.secondary'
                                      sx={{ display: 'block', mb: 1 }}
                                    >
                                      您可能还想了解:
                                    </Typography>
                                    <Box
                                      sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 1,
                                      }}
                                    >
                                      {message.follow_up_questions.map((question, index) => (
                                        <Button
                                          key={index}
                                          size='small'
                                          variant='text'
                                          onClick={() => handleFollowUp(question)}
                                          sx={{
                                            justifyContent: 'flex-start',
                                            color: 'primary.main',
                                            textTransform: 'none',
                                            paddingLeft: 0,
                                          }}
                                        >
                                          <ChevronRight
                                            sx={{
                                              width: 14,
                                              height: 14,
                                              mr: 1,
                                            }}
                                          />
                                          {question}
                                        </Button>
                                      ))}
                                    </Box>
                                  </Box>
                                )}

                              {message.qa_id && (
                                <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                                  <Tooltip title='有用'>
                                    <IconButton
                                      size='small'
                                      onClick={() =>
                                        handleFeedback(message.qa_id!, message.content)
                                      }
                                      sx={{
                                        color: 'success.dark',
                                        '&:hover': { backgroundColor: 'success.lighter' },
                                      }}
                                    >
                                      <ThumbsUp sx={{ width: 16, height: 16 }} />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title='反馈'>
                                    <Button
                                      size='small'
                                      variant='text'
                                      onClick={() =>
                                        handleFeedback(message.qa_id!, message.content)
                                      }
                                      sx={{
                                        textTransform: 'none',
                                        color: 'text.secondary',
                                      }}
                                    >
                                      反馈
                                    </Button>
                                  </Tooltip>
                                </Box>
                              )}
                            </Box>
                          )}
                        </Paper>
                      </Box>
                    ))}
                    {loading && (
                      <Box
                        sx={{
                          display: 'flex',
                          gap: 2,
                          justifyContent: 'flex-start',
                        }}
                      >
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            backgroundColor: 'grey.200',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Bot sx={{ width: 18, height: 18, color: 'text.secondary' }} />
                        </Box>
                        <Paper
                          sx={{
                            p: 3,
                            borderRadius: '20px 20px 20px 4px',
                            backgroundColor: 'white',
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              gap: 1,
                            }}
                          >
                            <CircularProgress size={16} />
                            <Typography
                              variant='body2'
                              color='text.secondary'
                            >
                              思考中...
                            </Typography>
                          </Box>
                        </Paper>
                      </Box>
                    )}
                    <div ref={messagesEndRef} />
                  </Box>
                )}
              </Box>

              <Box
                sx={{
                  p: 3,
                  backgroundColor: 'white',
                  borderTop: '1px solid grey.200',
                }}
              >
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    fullWidth
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !loading && handleSend()}
                    placeholder='输入问题，按回车发送...'
                    ref={inputRef}
                    disabled={loading}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <IconButton
                            onClick={handleSend}
                            disabled={loading || !inputValue.trim()}
                            sx={{ color: 'primary.main' }}
                          >
                            <Send sx={{ width: 20, height: 20 }} />
                          </IconButton>
                        ),
                      },
                    }}
                  />
                </Box>
              </Box>
        </Box>

        <Drawer
          anchor='right'
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          sx={{ '& .MuiDrawer-paper': { width: 320 } }}
        >
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant='h6' sx={{ fontWeight: 600 }}>
                对话设置
              </Typography>
              <IconButton
                size='small'
                onClick={() => setSettingsOpen(false)}
              >
                <X size={18} />
              </IconButton>
            </Box>
            <Divider sx={{ mb: 3 }} />

            <Box sx={{ mb: 3 }}>
              <Typography variant='subtitle2' sx={{ fontWeight: 600, mb: 2 }}>
                当前模型
              </Typography>
              <Chip
                icon={<Cpu size={14} />}
                label={`${selectedModel.name} (${selectedModel.provider})`}
                color='primary'
                variant='outlined'
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant='body2' sx={{ fontWeight: 500 }}>
                  Temperature (温度)
                </Typography>
                <Typography variant='body2' color='primary.main' sx={{ fontWeight: 600 }}>
                  {temperature.toFixed(1)}
                </Typography>
              </Box>
              <Slider
                value={temperature}
                onChange={(_, v) => setTemperature(v as number)}
                step={0.1}
                min={0}
                max={2}
                valueLabelDisplay='auto'
                size='small'
              />
              <Typography variant='caption' color='text.secondary'>
                控制输出随机性，值越高越随机
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant='body2' sx={{ fontWeight: 500 }}>
                  最大Token数
                </Typography>
                <Typography variant='body2' color='primary.main' sx={{ fontWeight: 600 }}>
                  {maxTokens}
                </Typography>
              </Box>
              <Slider
                value={maxTokens}
                onChange={(_, v) => setMaxTokens(v as number)}
                step={128}
                min={256}
                max={8192}
                valueLabelDisplay='auto'
                size='small'
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={streamingEnabled}
                    onChange={(e) => setStreamingEnabled(e.target.checked)}
                  />
                }
                label='流式输出'
              />
              <Typography variant='caption' color='text.secondary' sx={{ ml: 4, display: 'block' }}>
                逐步返回响应，提升体验
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={useKnowledgeBase}
                    onChange={(e) => setUseKnowledgeBase(e.target.checked)}
                  />
                }
                label='使用知识库'
              />
              <Typography variant='caption' color='text.secondary' sx={{ ml: 4, display: 'block' }}>
                基于知识库内容回答问题
              </Typography>
            </Box>
          </Box>
        </Drawer>

        <Dialog
          open={feedbackDialog.open}
          onClose={() => setFeedbackDialog({ open: false, qaId: '', answer: '' })}
        >
          <DialogTitle>评价答案</DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 2 }}>
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ mb: 1 }}
              >
                答案内容:
              </Typography>
              <Typography
                variant='body1'
                sx={{ fontSize: 14, color: 'grey.700' }}
              >
                {feedbackDialog.answer.slice(0, 200)}...
              </Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ mb: 2 }}
              >
                请评分:
              </Typography>
              <Rating
                value={feedbackRating}
                onChange={(_, value) => setFeedbackRating(value || 0)}
                size='large'
              />
            </Box>
            <TextField
              fullWidth
              multiline
              rows={3}
              label='反馈意见（可选）'
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder='请描述您对答案的评价或建议...'
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFeedbackDialog({ open: false, qaId: '', answer: '' })}>
              取消
            </Button>
            <Button
              onClick={submitFeedback}
              variant='contained'
            >
              提交反馈
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageContainer>
  );
};

export default AiChatPage;
