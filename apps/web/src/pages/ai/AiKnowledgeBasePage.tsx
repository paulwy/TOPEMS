import React, { useState, useCallback } from 'react';
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
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AiToolPageTemplate } from '@/components/templates';
import { useNotificationStore } from '@/store';
import { designTokens } from '@/theme/tokens';
import i18n from '@/i18n';

const ct = designTokens.colors;

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
  sources?: Array<{ title: string; similarity: number }>;
  confidence?: number;
};

export const AiKnowledgeBasePage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [documentList] = useState(sampleDocuments);
  const [filterType, setFilterType] = useState<string>('all');

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
  }, [query, addNotification, t]);

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
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {i18n.t('ai.knowledge_base.label.document_library')}
          </Typography>

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
            {documentList.map((doc) => (
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
