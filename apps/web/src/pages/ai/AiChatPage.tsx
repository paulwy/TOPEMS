/**
 * AI 对话页面 - V4.0 标准化改造
 *
 * @module pages/ai
 * @path /ai/chat
 */

import React, { useState, useRef, useEffect } from 'react';
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
} from '@mui/material';

import { PageContainer } from '@/components/common';
import { useAppStore } from '../../store';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const mockMessages: Message[] = [
  {
    id: '1',
    role: 'user',
    content: '帮我分析一下这个系统架构有什么优化建议？',
    timestamp: new Date(Date.now() - 300000),
  },
  {
    id: '2',
    role: 'assistant',
    content:
      '根据您提供的系统架构，我有以下优化建议：\n\n**1. 性能优化**\n- 建议引入 CDN 加速静态资源\n- 考虑使用 Redis 缓存热点数据\n- 数据库读写分离\n\n**2. 可扩展性**\n- 微服务架构拆分\n- 引入消息队列解耦\n- 配置中心统一管理\n\n**3. 安全性**\n- 加强 API 鉴权机制\n- 敏感数据加密存储\n- 引入 WAF 防护\n\n需要我详细展开某个方面的建议吗？',
    timestamp: new Date(Date.now() - 280000),
  },
  {
    id: '3',
    role: 'user',
    content: '请详细说明微服务架构拆分的方案',
    timestamp: new Date(Date.now() - 60000),
  },
  {
    id: '4',
    role: 'assistant',
    content:
      '微服务架构拆分建议：\n\n**核心服务拆分**\n1. **用户服务** - 用户注册、登录、权限\n2. **订单服务** - 订单创建、查询、管理\n3. **支付服务** - 支付、退款、对账\n4. **库存服务** - 库存查询、扣减、预警\n\n**技术选型**\n- 服务通信：gRPC / REST\n- 服务治理：Spring Cloud / Kubernetes\n- 服务发现：Consul / Nacos\n\n**实施步骤**\n1. 领域建模，明确边界\n2. 逐步拆分，先易后难\n3. 数据同步，保证一致性\n4. 全量切换，灰度发布',
    timestamp: new Date(Date.now() - 30000),
  },
];

export const AiChatPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-4');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    const userMessage: Message = {
      id: String(Date.now()),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    setTimeout(() => {
      const assistantMessage: Message = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: '感谢您的提问！AI助手正在处理中，请稍候...',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
      addNotification({ title: '消息发送', message: 'AI助手已回复', type: 'success' });
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    addNotification({ title: '复制成功', message: '内容已复制到剪贴板', type: 'success' });
  };

  const handleNewChat = () => {
    setMessages([]);
    addNotification({ title: '新建对话', message: '对话已清空', type: 'info' });
  };

  return (
    <PageContainer
      headerProps={{ pageIcon: <MessageSquare size={20} />, backButton: { href: '/ai/dashboard' } }}
    >
      <Box sx={{ display: 'flex', height: 'calc(100vh - 140px)', bgcolor: 'background.default' }}>
        {/* 左侧会话列表 */}
        <Box
          sx={{
            width: 280,
            borderRight: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            display: { xs: 'none', md: 'block' },
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
          <Box sx={{ p: 1, overflow: 'auto' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Paper
                key={i}
                sx={{ p: 1.5, mb: 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
              >
                <Typography
                  variant='body2'
                  noWrap
                >
                  对话 {i}
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {i}小时前
                </Typography>
              </Paper>
            ))}
          </Box>
        </Box>
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
              <Sparkles
                size={20}
                color='primary.main'
              />
              <Typography variant='h6'>AI 智能对话</Typography>
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
              <IconButton onClick={handleNewChat}>
                <RefreshCw size={20} />
              </IconButton>
            </Box>
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
                    <IconButton
                      size='small'
                      onClick={() => handleCopy(msg.content)}
                    >
                      <Copy size={14} />
                    </IconButton>
                  </Box>
                  <Paper
                    sx={{
                      p: 2,
                      bgcolor: msg.role === 'user' ? 'primary.light' : 'background.paper',
                    }}
                  >
                    <Typography
                      variant='body2'
                      sx={{ whiteSpace: 'pre-wrap' }}
                    >
                      {msg.content}
                    </Typography>
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
            <div ref={messagesEndRef} />
          </Box>
          {/* 输入区域 */}
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              <TextField
                fullWidth
                multiline
                maxRows={4}
                placeholder='输入消息，Shift+Enter换行...'
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
    </PageContainer>
  );
};

export default AiChatPage;
