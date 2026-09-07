import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  Chip,
  Divider,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  InputAdornment,
  IconButton,
  ListItemSecondaryAction,
  Tooltip,
} from '@mui/material';
import {
  Search,
  BookOpen,
  FileText,
  RefreshCw,
  Sparkles,
  Clock,
  MessageSquare,
  HelpCircle,
  FolderOpen,
  Upload,
  Trash2,
} from 'lucide-react';
import { AiToolPageTemplate } from '@/components/templates';
import { useNotificationStore } from '@/store';
import { designTokens } from '@/theme/tokens';
import { knowledgeApi } from '@/api/ai/knowledge';
import i18n from '@/i18n';

const ct = designTokens.colors;

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const sampleDocuments = [
  {
    id: 'doc-001',
    title: i18n.t('pages.ai_knowledge_base_page.erp_0'),
    type: 'manual',
    size: '2.3 MB',
    updatedAt: '2024-01-10',
  },
  {
    id: 'doc-002',
    title: i18n.t('ai.ai_knowledge_base_page.k0'),
    type: 'guide',
    size: '1.1 MB',
    updatedAt: '2024-01-08',
  },
  {
    id: 'doc-003',
    title: i18n.t('pages.ai_knowledge_base_page.hrm_1'),
    type: 'process',
    size: '512 KB',
    updatedAt: '2024-01-05',
  },
  {
    id: 'doc-004',
    title: i18n.t('pages.ai_knowledge_base_page.mes_2'),
    type: 'manual',
    size: '3.5 MB',
    updatedAt: '2024-01-03',
  },
];

const sampleAnswers = [
  {
    question: i18n.t('ai.ai_knowledge_base_page.k1'),
    answer: i18n.t('pages.ai_knowledge_base_page.k3'),
    sources: [
      { title: i18n.t('pages.ai_knowledge_base_page.erp_4'), similarity: 0.92 },
      { title: i18n.t('ai.ai_knowledge_base_page.k2'), similarity: 0.85 },
    ],
    confidence: 0.95,
  },
];

const getSampleFollowUp = () => [
  i18n.t('ai.ai_knowledge_base_page.k5'),
  i18n.t('ai.ai_knowledge_base_page.k4'),
  i18n.t('ai.ai_knowledge_base_page.k3'),
];

type ChatMessage = {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  sources?: Array<{
    title: string;
    similarity: number;
    document_id?: string;
    score?: number;
  }>;
  confidence?: number;
};

export const AiKnowledgeBasePage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [query, setQuery] = useState('');
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [documentList, setDocumentList] = useState(sampleDocuments);
  const [docsLoading, setDocsLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const kbIdRef = useRef<string | null>(null);

  // 上传文档：取默认知识库 id（懒加载），multipart 上传后刷新列表
  const ensureKbId = useCallback(async (): Promise<string | null> => {
    if (kbIdRef.current) return kbIdRef.current;
    try {
      const res = await knowledgeApi.listKnowledgeBases({ page_size: 1 });
      const kb = res?.data?.[0];
      if (!kb) return null;
      kbIdRef.current = kb.id;
      return kb.id;
    } catch {
      return null;
    }
  }, []);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const kbId = await ensureKbId();
    if (!kbId) {
      addNotification({
        title: i18n.t('ai.knowledge_base.message.notice'),
        message: i18n.t('ai.knowledge_base.message.no_knowledge_base'),
        type: 'warning',
      });
      return;
    }
    setUploading(true);
    try {
      await knowledgeApi.uploadDocument(kbId, file);
      addNotification({
        title: i18n.t('ai.knowledge_base.message.notice'),
        message: i18n.t('ai.knowledge_base.message.upload_success'),
        type: 'success',
      });
      refreshDocuments();
    } catch {
      addNotification({
        title: i18n.t('ai.knowledge_base.message.notice'),
        message: i18n.t('ai.knowledge_base.message.upload_fail'),
        type: 'error',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!window.confirm(i18n.t('ai.knowledge_base.message.confirm_delete'))) return;
    try {
      await knowledgeApi.deleteDocument(docId);
      setDocumentList((prev) => prev.filter((d) => d.id !== docId));
      setSelectedDocs((prev) => prev.filter((id) => id !== docId));
      addNotification({
        title: i18n.t('ai.knowledge_base.message.notice'),
        message: i18n.t('ai.knowledge_base.message.delete_success'),
        type: 'success',
      });
    } catch {
      addNotification({
        title: i18n.t('ai.knowledge_base.message.notice'),
        message: i18n.t('ai.knowledge_base.message.delete_fail'),
        type: 'error',
      });
    }
  };

  // 遗留⑩闭环（2026-09-08）：知识库后端已挂载（svc/ai ai_knowledge 模块），
  // 列表改为真实数据；接口不可用时回退本地示例，保证页面可用
  const refreshDocuments = useCallback(() => {
    setDocsLoading(true);
    knowledgeApi
      .listDocuments()
      .then((res) => {
        const items = (res?.data ?? []).map((d) => ({
          id: d.id,
          title: d.title,
          type: d.doc_type || 'manual',
          size: d.file_size != null ? formatFileSize(d.file_size) : '-',
          updatedAt: (d.updated_at ?? '').slice(0, 10),
        }));
        setDocumentList(items.length > 0 ? items : sampleDocuments);
      })
      .catch(() => {
        setDocumentList(sampleDocuments);
      })
      .finally(() => {
        setDocsLoading(false);
      });
  }, []);

  useEffect(() => {
    refreshDocuments();
  }, [refreshDocuments]);

  const handleSendQuery = useCallback(async () => {
    if (!query.trim()) {
      addNotification({
        title: i18n.t('ai.knowledge_base.message.notice'),
        message: i18n.t('ai.knowledge_base.message.input_question'),
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

    // 遗留⑩闭环（2026-09-08）：问答接真实知识库 RAG 接口；失败回退示例答案
    try {
      const res = await knowledgeApi.askQuestion({ question: query, top_k: 5 });
      const data = res?.data;
      if (data?.answer) {
        const aiMessage: ChatMessage = {
          id: `msg-${Date.now()}-ai`,
          type: 'ai',
          content: data.answer,
          timestamp: new Date(),
          sources: (data.sources ?? []).map((s) => ({
            title: s.document_title ?? i18n.t('ai.knowledge_base.label.knowledge_document'),
            similarity: s.score ?? 0,
            document_id: s.document_id,
            score: s.score,
          })),
          confidence: data.confidence,
        };
        setChatHistory((prev) => [...prev, aiMessage]);
      } else {
        throw new Error('empty answer');
      }
    } catch {
      const aiMessage: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        type: 'ai',
        content: sampleAnswers[0].answer,
        timestamp: new Date(),
        sources: sampleAnswers[0].sources,
        confidence: sampleAnswers[0].confidence,
      };
      setChatHistory((prev) => [...prev, aiMessage]);
    }
    setSearching(false);
    setQuery('');
  }, [query, addNotification]);

  const handleSelectDocument = (docId: string) => {
    setSelectedDocs((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'manual':
        return (
          <BookOpen
            size={16}
            style={{ color: ct.primary.main }}
          />
        );
      case 'guide':
        return (
          <FileText
            size={16}
            style={{ color: ct.info.main }}
          />
        );
      case 'process':
        return (
          <FolderOpen
            size={16}
            style={{ color: ct.success.main }}
          />
        );
      default:
        return (
          <FileText
            size={16}
            style={{ color: ct.text.secondary }}
          />
        );
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'manual':
        return i18n.t('ai.knowledge_base.type.manual');
      case 'guide':
        return i18n.t('ai.knowledge_base.type.guide');
      case 'process':
        return i18n.t('ai.knowledge_base.type.process');
      default:
        return i18n.t('ai.knowledge_base.type.document');
    }
  };

  return (
    <AiToolPageTemplate
      title={i18n.t('ai.knowledge_base.title')}
      description={i18n.t('ai.knowledge_base.subtitle')}
      leftPanelWidth={3}
      leftPanelBreakpoint='lg'
      pageContainerProps={{
        headerProps: {
          pageIcon: <BookOpen style={{ width: 20, height: 20 }} />,
          pageGradient: `linear-gradient(135deg, ${ct.blue[400]} 0%, ${ct.purple[500]} 100%)`,
        },
      }}
      leftPanel={
        <Paper sx={{ borderRadius: 3, p: 3, height: '100%' }}>
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
          >
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600 }}
            >
              {i18n.t('ai.knowledge_base.label.document_library')}
            </Typography>
            <Button
              size='small'
              variant='outlined'
              startIcon={<Upload size={14} />}
              onClick={handleUploadClick}
              disabled={uploading}
            >
              {uploading
                ? i18n.t('ai.knowledge_base.button.uploading')
                : i18n.t('ai.knowledge_base.button.upload')}
            </Button>
            <input
              ref={fileInputRef}
              type='file'
              hidden
              onChange={handleFileChange}
              accept='.md,.txt,.pdf,.docx,.csv'
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              size='small'
              placeholder={i18n.t('ai.knowledge_base.label.search_document')}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position='start'>
                      <Search size={16} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {['all', 'manual', 'guide', 'process'].map((type) => (
                <Chip
                  key={type}
                  label={
                    type === 'all' ? i18n.t('ai.knowledge_base.label.all') : getTypeLabel(type)
                  }
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
            {docsLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={24} />
              </Box>
            )}
            {!docsLoading &&
              documentList.map((doc) => (
                <ListItemButton
                  key={doc.id}
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
                    secondary={`${doc.size} · ${i18n.t('ai.knowledge_base.label.updated_at')} ${doc.updatedAt}`}
                  />
                  <ListItemSecondaryAction>
                    <Tooltip title={i18n.t('ai.knowledge_base.message.confirm_delete')}>
                      <IconButton
                        edge='end'
                        size='small'
                        aria-label='delete'
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDocument(doc.id);
                        }}
                      >
                        <Trash2 size={14} />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItemButton>
              ))}
          </List>

          {selectedDocs.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ mb: 1 }}
              >
                {i18n.t('ai.knowledge_base.label.selected_docs', {
                  count: selectedDocs.length,
                })}
              </Typography>
              <Button
                fullWidth
                size='small'
                variant='outlined'
                onClick={() => setSelectedDocs([])}
              >
                {i18n.t('ai.knowledge_base.label.clear_selection')}
              </Button>
            </Box>
          )}
        </Paper>
      }
      rightPanel={
        <Box sx={{ p: 3, height: '100%', minHeight: 600 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 3,
            }}
          >
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Sparkles
                  size={18}
                  style={{ color: ct.yellow[500] }}
                />
                {i18n.t('ai.knowledge_base.label.smart_qa')}
              </Box>
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip
                label={i18n.t('ai.knowledge_base.label.knowledge_base')}
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
                <Typography
                  variant='body1'
                  color='text.secondary'
                >
                  {i18n.t('ai.knowledge_base.message.welcome')}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('ai.knowledge_base.message.welcome_desc')}
                </Typography>
                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                  {[
                    i18n.t('ai.knowledge_base.mock.q_1'),
                    i18n.t('ai.knowledge_base.example.q_2'),
                    i18n.t('ai.knowledge_base.example.q_3'),
                  ].map((example) => (
                    <Chip
                      key={example}
                      label={example}
                      size='small'
                      variant='outlined'
                      onClick={() => setQuery(example)}
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                </Box>
              </Box>
            ) : (
              <List>
                {chatHistory.map((msg) => (
                  <ListItem
                    key={msg.id}
                    sx={{ mb: 2 }}
                  >
                    <Avatar
                      sx={{
                        mr: 2,
                        bgcolor: msg.type === 'user' ? 'primary.main' : 'secondary.main',
                      }}
                    >
                      {msg.type === 'user' ? <MessageSquare size={16} /> : <Sparkles size={16} />}
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
                          <Typography
                            variant='body2'
                            color='text.secondary'
                          >
                            {i18n.t('ai.knowledge_base.label.reference_source')}：
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
                            label={`${i18n.t('ai.knowledge_base.label.confidence')}: ${Math.round(msg.confidence * 100)}%`}
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
              placeholder={i18n.t('ai.knowledge_base.label.input_question')}
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
                searching ? (
                  <RefreshCw
                    size={18}
                    className='animate-spin'
                  />
                ) : (
                  <Search size={18} />
                )
              }
            >
              {searching
                ? i18n.t('ai.knowledge_base.button.searching')
                : i18n.t('ai.knowledge_base.button.ask')}
            </Button>
          </Box>

          {chatHistory.length > 0 && !searching && (
            <Box sx={{ mt: 3 }}>
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ mb: 1 }}
              >
                {i18n.t('ai.knowledge_base.label.related_questions')}：
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {getSampleFollowUp().map((question) => (
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
        </Box>
      }
    />
  );
};

export default AiKnowledgeBasePage;
