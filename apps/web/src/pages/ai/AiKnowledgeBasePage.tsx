import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  Chip,
  Divider,
  IconButton,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
} from '@mui/material';
import {
  Search,
  BookOpen,
  FileText,
  RefreshCw,
  Copy,
  ExternalLink,
  ChevronDown,
  Sparkles,
  Clock,
  MessageSquare,
  HelpCircle,
  FolderOpen,
} from 'lucide-react';
import { PageContainer, Grid } from '@/components/common';
import { useNotificationStore } from '@/store';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const sampleDocuments = [
  { id: 'doc-001', title: 'ERP 系统操作手册', type: 'manual', size: '2.3 MB', updatedAt: '2024-01-10' },
  { id: 'doc-002', title: '财务报表生成指南', type: 'guide', size: '1.1 MB', updatedAt: '2024-01-08' },
  { id: 'doc-003', title: 'HRM 员工入职流程', type: 'process', size: '512 KB', updatedAt: '2024-01-05' },
  { id: 'doc-004', title: 'MES 生产工单管理', type: 'manual', size: '3.5 MB', updatedAt: '2024-01-03' },
];

const sampleAnswers = [
  {
    question: '如何创建财务凭证？',
    answer: '创建财务凭证的步骤如下：\n\n1. 登录 ERP 系统，进入财务模块\n2. 点击「凭证管理」->「新建凭证」\n3. 选择凭证类型（记账凭证、收款凭证、付款凭证等）\n4. 填写凭证日期和凭证号\n5. 添加会计分录，包括科目、借方金额、贷方金额\n6. 录入凭证摘要\n7. 保存并审核凭证\n8. 审核通过后进行记账操作\n\n注意：凭证借贷必须平衡，且需要有对应的原始单据。',
    sources: [
      { title: 'ERP 系统操作手册', similarity: 0.92 },
      { title: '财务报表生成指南', similarity: 0.85 },
    ],
    confidence: 0.95,
  },
];

const sampleFollowUp = [
  '如何查询已记账的凭证？',
  '凭证审核流程是什么？',
  '如何修改已审核的凭证？',
];

type ChatMessage = {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  sources?: Array<{ title: string; similarity: number }>;
  confidence?: number;
};

export const AiKnowledgeBasePage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [query, setQuery] = useState('');
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [documentList, setDocumentList] = useState(sampleDocuments);
  const [filterType, setFilterType] = useState<string>('all');

  const handleSendQuery = useCallback(async () => {
    if (!query.trim()) {
      addNotification({
        title: '提示',
        message: '请输入您的问题',
        type: 'warning',
      });
      return;
    }

    setSearching(true);
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      type: 'user',
      content: query,
      timestamp: new Date(),
    };
    setChatHistory((prev) => [...prev, userMessage]);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const aiMessage: ChatMessage = {
      id: `msg-${Date.now()}-ai`,
      type: 'ai',
      content: sampleAnswers[0].answer,
      timestamp: new Date(),
      sources: sampleAnswers[0].sources,
      confidence: sampleAnswers[0].confidence,
    };
    setChatHistory((prev) => [...prev, aiMessage]);
    setSearching(false);
    setQuery('');
  }, [query, addNotification]);

  const handleSelectDocument = (docId: string) => {
    setSelectedDocs((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    addNotification({
      title: '已复制',
      message: '内容已复制到剪贴板',
      type: 'success',
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'manual':
        return <BookOpen size={16} style={{ color: ct.primary.main }} />;
      case 'guide':
        return <FileText size={16} style={{ color: ct.info.main }} />;
      case 'process':
        return <FolderOpen size={16} style={{ color: ct.success.main }} />;
      default:
        return <FileText size={16} style={{ color: ct.text.secondary }} />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'manual':
        return '操作手册';
      case 'guide':
        return '指南';
      case 'process':
        return '流程文档';
      default:
        return '文档';
    }
  };

  return (
    <PageContainer
      title='知识库问答'
      subtitle='基于企业文档的智能问答助手'
      padding={false}
      maxWidth={false}
      headerProps={{
        pageIcon: <BookOpen style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.blue[400]} 0%, ${ct.indigo[500]} 100%)`,
      }}
    >
      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} lg={3}>
            <Paper sx={{ borderRadius: 3, p: 3, height: '100%' }}>
              <Typography variant='subtitle1' sx={{ fontWeight: 600, mb: 2 }}>
                文档库
              </Typography>

              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  size='small'
                  placeholder='搜索文档...'
                  prefix={<Search size={16} />}
                  sx={{ mb: 2 }}
                />
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {['all', 'manual', 'guide', 'process'].map((type) => (
                    <Chip
                      key={type}
                      label={type === 'all' ? '全部' : getTypeLabel(type)}
                      size='small'
                      variant={filterType === type ? 'filled' : 'outlined'}
                      onClick={() => setFilterType(type)}
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                </Box>
              </Box>

              <Divider sx={{ mb: 2 }} />

              <List>
                {documentList.map((doc) => (
                  <ListItem
                    key={doc.id}
                    button
                    onClick={() => handleSelectDocument(doc.id)}
                    sx={{
                      borderRadius: 2,
                      mb: 1,
                      bgcolor: selectedDocs.includes(doc.id) ? 'primary.light' : undefined,
                      '&:hover': { bgcolor: 'grey.100' },
                    }}
                  >
                    <ListItemIcon>{getTypeIcon(doc.type)}</ListItemIcon>
                    <ListItemText
                      primary={doc.title}
                      secondary={`${doc.size} · 更新于 ${doc.updatedAt}`}
                    />
                  </ListItem>
                ))}
              </List>

              {selectedDocs.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                    已选择 {selectedDocs.length} 个文档
                  </Typography>
                  <Button
                    fullWidth
                    size='small'
                    variant='outlined'
                    onClick={() => setSelectedDocs([])}
                  >
                    清除选择
                  </Button>
                </Box>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} lg={9}>
            <Paper sx={{ borderRadius: 3, p: 3, height: '100%', minHeight: 600 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 3,
                }}
              >
                <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Sparkles size={18} style={{ color: ct.amber[500] }} />
                    智能问答
                  </Box>
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip
                    label='知识库'
                    size='small'
                    color='primary'
                    variant='outlined'
                  />
                  <Chip
                    label='AI'
                    size='small'
                    color='secondary'
                  />
                </Box>
              </Box>

              <Box sx={{ flex: 1, overflow: 'auto', mb: 3, maxHeight: 400 }}>
                {chatHistory.length === 0 ? (
                  <Box
                    sx={{
                      height: 300,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px dashed',
                      borderColor: 'divider',
                      borderRadius: 3,
                    }}
                  >
                    <HelpCircle
                      size={48}
                      style={{ color: ct.text.disabled, marginBottom: 12 }}
                    />
                    <Typography variant='body1' color='text.secondary'>
                      欢迎使用知识库问答助手
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      选择文档后输入问题，AI 将基于文档内容为您解答
                    </Typography>
                    <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                      {['如何创建财务凭证？', '员工入职流程是什么？', '生产工单如何管理？'].map(
                        (example) => (
                          <Chip
                            key={example}
                            label={example}
                            size='small'
                            variant='outlined'
                            onClick={() => setQuery(example)}
                            sx={{ cursor: 'pointer' }}
                          />
                        )
                      )}
                    </Box>
                  </Box>
                ) : (
                  <List>
                    {chatHistory.map((msg) => (
                      <ListItem key={msg.id} sx={{ mb: 2 }}>
                        <Avatar
                          sx={{
                            mr: 2,
                            bgcolor: msg.type === 'user' ? 'primary.main' : 'secondary.main',
                          }}
                        >
                          {msg.type === 'user' ? (
                            <MessageSquare size={16} />
                          ) : (
                            <Sparkles size={16} />
                          )}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography
                            variant='body1'
                            sx={{ fontWeight: msg.type === 'user' ? 500 : 400 }}
                          >
                            {msg.content}
                          </Typography>
                          <Typography
                            variant='body2'
                            color='text.secondary'
                            sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}
                          >
                            <Clock size={12} />
                            {msg.timestamp.toLocaleTimeString()}
                          </Typography>
                          {msg.sources && msg.sources.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                              <Typography variant='body2' color='text.secondary'>
                                参考来源：
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                                {msg.sources.map((source, idx) => (
                                  <Chip
                                    key={idx}
                                    label={`${source.title} (${Math.round(source.similarity * 100)}%)`}
                                    size='small'
                                    variant='outlined'
                                  />
                                ))}
                              </Box>
                            </Box>
                          )}
                          {msg.confidence !== undefined && (
                            <Box sx={{ mt: 1 }}>
                              <Chip
                                label={`置信度: ${Math.round(msg.confidence * 100)}%`}
                                size='small'
                                color={msg.confidence >= 0.8 ? 'success' : 'warning'}
                                variant='outlined'
                              />
                            </Box>
                          )}
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                )}

                {searching && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                    <CircularProgress size={24} />
                  </Box>
                )}
              </Box>

              <Divider />

              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  placeholder='输入您的问题...'
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendQuery()}
                  disabled={searching}
                />
                <Button
                  variant='contained'
                  onClick={handleSendQuery}
                  disabled={searching || !query.trim()}
                  startIcon={
                    searching ? <RefreshCw size={18} className='animate-spin' /> : <Search size={18} />
                  }
                >
                  {searching ? '搜索中' : '提问'}
                </Button>
              </Box>

              {chatHistory.length > 0 && !searching && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                    相关问题：
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {sampleFollowUp.map((question) => (
                      <Chip
                        key={question}
                        label={question}
                        size='small'
                        variant='outlined'
                        onClick={() => setQuery(question)}
                        sx={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default AiKnowledgeBasePage;
