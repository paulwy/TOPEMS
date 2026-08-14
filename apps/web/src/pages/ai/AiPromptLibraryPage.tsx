import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Card,
  CardContent,
  Chip,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  BookOpen,
  Star,
  Search,
  Copy,
  PlayCircle,
  Plus,
  Tag,
  Sparkles,
  Lightbulb,
  FileText,
  Code2,
  MessageSquare,
  BarChart3,
  ThumbsUp,
  X,
} from 'lucide-react';
import { PageContainer, Grid } from '@/components/common';
import { useNotificationStore } from '@/store';
import { designTokens } from '@/theme/tokens';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';


import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

const ct= designTokens.colors;

type PromptCategory = 'all' | 'writing' | 'code' | 'business' | 'analysis' | 'creative';

interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  content: string;
  variables: string[];
  usage_count: number;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

const mockPrompts: PromptTemplate[] = [
  {
    id: '1',
    name: i18n.t('ai.ai_prompt_library_page.k0'),
    description: i18n.t('ai.ai_prompt_library_page.k1'),
    category: 'writing',
    content:
      i18n.t('pages.ai_prompt_library_page.k0'),
    variables: ['subject', 'recipient', 'key_points'],
    usage_count: 234,
    is_favorite: true,
    created_at: '2024-01-15',
    updated_at: '2024-06-20',
    created_by: i18n.t('ai.ai_prompt_library_page.k2'),
  },
  {
    id: '2',
    name: i18n.t('ai.ai_prompt_library_page.k3'),
    description: i18n.t('ai.ai_prompt_library_page.k4'),
    category: 'code',
    content:
      i18n.t('pages.ai_prompt_library_page.k1'),
    variables: ['language', 'code'],
    usage_count: 189,
    is_favorite: true,
    created_at: '2024-02-10',
    updated_at: '2024-06-18',
    created_by: i18n.t('ai.ai_prompt_library_page.k5'),
  },
  {
    id: '3',
    name: i18n.t('ai.ai_prompt_library_page.k6'),
    description: i18n.t('ai.ai_prompt_library_page.k7'),
    category: 'analysis',
    content:
      i18n.t('pages.ai_prompt_library_page.k2'),
    variables: ['data'],
    usage_count: 156,
    is_favorite: false,
    created_at: '2024-03-05',
    updated_at: '2024-06-15',
    created_by: i18n.t('ai.ai_prompt_library_page.k8'),
  },
  {
    id: '4',
    name: i18n.t('ai.ai_prompt_library_page.k9'),
    description: i18n.t('ai.ai_prompt_library_page.k10'),
    category: 'business',
    content:
      i18n.t('pages.ai_prompt_library_page.k3'),
    variables: ['meeting_content'],
    usage_count: 312,
    is_favorite: false,
    created_at: '2024-01-20',
    updated_at: '2024-06-22',
    created_by: i18n.t('ai.ai_prompt_library_page.k11'),
  },
  {
    id: '5',
    name: i18n.t('ai.ai_prompt_library_page.k12'),
    description: i18n.t('ai.ai_prompt_library_page.k13'),
    category: 'creative',
    content:
      i18n.t('pages.ai_prompt_library_page.k4'),
    variables: ['product', 'target_audience', 'selling_points'],
    usage_count: 278,
    is_favorite: true,
    created_at: '2024-02-28',
    updated_at: '2024-06-10',
    created_by: i18n.t('ai.ai_prompt_library_page.k14'),
  },
  {
    id: '6',
    name: i18n.t('pages.ai_prompt_library_page.sql_5'),
    description: i18n.t('ai.ai_prompt_library_page.sql_15'),
    category: 'code',
    content:
      i18n.t('pages.ai_prompt_library_page.k6'),
    variables: ['requirement', 'table_structure'],
    usage_count: 145,
    is_favorite: false,
    created_at: '2024-03-15',
    updated_at: '2024-06-05',
    created_by: i18n.t('ai.ai_prompt_library_page.k16'),
  },
];

const categoryIcons: Record<string, React.ReactNode> = {
  all: <BookOpen size={18} />,
  writing: <FileText size={18} />,
  code: <Code2 size={18} />,
  business: <MessageSquare size={18} />,
  analysis: <BarChart3 size={18} />,
  creative: <Lightbulb size={18} />,
};

const categoryIds = ['all', 'writing', 'code', 'business', 'analysis', 'creative'] as const;

const getCategoryIcon = (category: string) => {
  const map: Record<string, React.ReactNode> = {
    writing: <FileText size={20} />,
    code: <Code2 size={20} />,
    business: <MessageSquare size={20} />,
    analysis: <BarChart3 size={20} />,
    creative: <Lightbulb size={20} />,
  };
  return map[category] || <Tag size={20} />;
};

const getCategoryColor = (category: string) => {
  const map: Record<string, string> = {
    writing: 'primary.main',
    code: 'secondary.main',
    business: 'success.main',
    analysis: 'warning.main',
    creative: ct.pink[500],
  };
  return map[category] || 'grey.500';
};

export const AiPromptLibraryPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const categories = categoryIds.map((id) => ({
    id,
    label: t(`ai.prompt_library.category.${id}`),
    icon: categoryIcons[id],
  }));

  const { data: prompts = [] } = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.AI_PROMPTS_BASE,
    queryFn: async () => {
      return mockPrompts;
    },
    staleTime: 5 * 60 * 1000,
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async (promptId: string) => {
      return promptId;
    },
    onMutate: async (promptId) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.AD_HOC.AI_PROMPTS_BASE });
      const previousPrompts = queryClient.getQueryData<PromptTemplate[]>(['ai-prompts']);
      queryClient.setQueryData<PromptTemplate[]>(['ai-prompts'], (old) =>
        old ? old.map((p) => (p.id === promptId ? { ...p, is_favorite: !p.is_favorite } : p)) : []
      );
      return { previousPrompts };
    },
    onError: (_err, _id, context) => {
      if (context?.previousPrompts) {
        queryClient.setQueryData(['ai-prompts'], context.previousPrompts);
      }
    },
  });

  const deletePromptMutation = useMutation({
    mutationFn: async (promptId: string) => {
      return promptId;
    },
    onMutate: async (promptId) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.AD_HOC.AI_PROMPTS_BASE });
      const previousPrompts = queryClient.getQueryData<PromptTemplate[]>(['ai-prompts']);
      queryClient.setQueryData<PromptTemplate[]>(['ai-prompts'], (old) =>
        old ? old.filter((p) => p.id !== promptId) : []
      );
      return { previousPrompts };
    },
    onError: (_err, _id, context) => {
      if (context?.previousPrompts) {
        queryClient.setQueryData(['ai-prompts'], context.previousPrompts);
      }
    },
  });

  const [activeCategory, setActiveCategory] = useState<PromptCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptTemplate | null>(null);
  const [useDialogOpen, setUseDialogOpen] = useState(false);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [generatedResult, setGeneratedResult] = useState('');
  const [generating, setGenerating] = useState(false);
  const [viewTab, setViewTab] = useState<'all' | 'mine'>('all');

  const filteredPrompts = prompts.filter((p) => {
    const matchCategory = activeCategory === 'all' || p.category === activeCategory;
    const matchSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFavorite = !showFavoritesOnly || p.is_favorite;
    return matchCategory && matchSearch && matchFavorite;
  });

  const handleUsePrompt = (prompt: PromptTemplate) => {
    setSelectedPrompt(prompt);
    const vars: Record<string, string> = {};
    prompt.variables.forEach((v) => {
      vars[v] = '';
    });
    setVariables(vars);
    setGeneratedResult('');
    setUseDialogOpen(true);
  };

  const handleGenerate = () => {
    if (!selectedPrompt) return;

    setGenerating(true);

    setTimeout(() => {
      let result = selectedPrompt.content;
      Object.entries(variables).forEach(([key, value]) => {
        result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value || `[${key}]`);
      });
      setGeneratedResult(result);
      setGenerating(false);
    }, 1500);
  };

  const handleCopyResult = () => {
    if (generatedResult) {
      navigator.clipboard.writeText(generatedResult);
      addNotification({
        title: i18n.t('ai.prompt_library.message.copied_title'),
        message: i18n.t('ai.prompt_library.message.result_copied'),
        type: 'success',
      });
    }
  };

  const handleCopyPrompt = (content: string) => {
    navigator.clipboard.writeText(content);
    addNotification({
      title: i18n.t('ai.prompt_library.message.copied_title'),
      message: i18n.t('ai.prompt_library.message.prompt_copied'),
      type: 'success',
    });
  };

  const handleToggleFavorite = (id: string) => {
    toggleFavoriteMutation.mutate(id, {
      onSuccess: () => {
        addNotification({
          title: i18n.t('ai.prompt_library.message.favorite_title'),
          message: i18n.t('ai.prompt_library.message.favorite_updated'),
          type: 'success',
        });
      },
    });
  };

  return (
    <PageContainer
      title={i18n.t('ai.prompt_library.title')}
      subtitle={i18n.t('ai.prompt_library.subtitle')}
      padding={false}
      maxWidth={false}
      headerProps={{
        pageIcon: <BookOpen style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.teal[200]} 0%, ${ct.pink[100]} 100%)`,
      }}
    >
      <Box sx={{ p: 3 }}>
        <Grid
          container
          spacing={3}
        >
          {/* 左侧分类 */}
          <Grid
            item
            xs={12}
            md={2}
          >
            <Paper sx={{ p: 2, borderRadius: 3 }}>
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}
                >
                  {i18n.t('ai.prompt_library.label.category')}
                </Typography>
                <List
                  disablePadding
                  dense
                >
                  {categories.map((cat) => (
                    <ListItem
                      key={cat.id}
                      sx={{
                        borderRadius: 1,
                        mb: 0.5,
                        cursor: 'pointer',
                        bgcolor: activeCategory === cat.id ? 'primary.50' : 'transparent',
                        '&:hover': { bgcolor: 'grey.50' },
                      }}
                      onClick={() => setActiveCategory(cat.id as PromptCategory)}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <span
                          style={{
                            color: activeCategory === cat.id ? ct.secondary[400] : ct.grey[500],
                          }}
                        >
                          {cat.icon}
                        </span>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography
                            variant='body2'
                            sx={{
                              fontWeight: activeCategory === cat.id ? 600 : 400,
                              color: activeCategory === cat.id ? 'primary.main' : 'inherit',
                            }}
                          >
                            {cat.label}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box>
                <Chip
                  icon={<Star size={14} />}
                  label={i18n.t('ai.prompt_library.label.favorites_only')}
                  variant={showFavoritesOnly ? 'filled' : 'outlined'}
                  color={showFavoritesOnly ? 'warning' : 'default'}
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                  sx={{ width: '100%', justifyContent: 'flex-start' }}
                />
              </Box>
            </Paper>
          </Grid>

          {/* 右侧模板列表 */}
          <Grid
            item
            xs={12}
            md={10}
          >
            <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <Box
                sx={{
                  p: 2,
                  borderBottom: 1,
                  borderColor: 'divider',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Tabs
                  value={viewTab}
                  onChange={(_, v) => setViewTab(v)}
                  sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0.5 } }}
                >
                  <Tab
                    label={i18n.t('ai.prompt_library.view.all_templates')}
                    value='all'
                    sx={{ textTransform: 'none' }}
                  />
                  <Tab
                    label={i18n.t('ai.prompt_library.view.my_templates')}
                    value='mine'
                    sx={{ textTransform: 'none' }}
                  />
                </Tabs>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size='small'
                    placeholder={i18n.t('ai.prompt_library.placeholder.search')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <Search
                            size={16}
                            style={{ marginRight: 8, color: ct.grey[400] }}
                          />
                        ),
                      },
                    }}
                    sx={{ width: 250 }}
                  />
                  <Button
                    variant='contained'
                    startIcon={<Plus size={18} />}
                    size='small'
                    onClick={() => {
                      addNotification({
                        title: i18n.t('ai.prompt_library.button.new_template'),
                        message: i18n.t('ai.prompt_library.message.coming_soon'),
                        type: 'info',
                      });
                    }}
                  >
                    {i18n.t('ai.prompt_library.button.new_template')}
                  </Button>
                </Box>
              </Box>

              <Box sx={{ p: 3 }}>
                <Grid
                  container
                  spacing={2}
                >
                  {filteredPrompts.map((prompt) => (
                    <Grid
                      item
                      xs={12}
                      sm={6}
                      md={4}
                      key={prompt.id}
                    >
                      <Card
                        variant='outlined'
                        sx={{
                          height: '100%',
                          borderRadius: 3,
                          transition: 'all 0.2s',
                          '&:hover': {
                            boxShadow: 2,
                            borderColor: 'primary.main',
                          },
                        }}
                      >
                        <Box
                          onClick={() => handleUsePrompt(prompt)}
                          sx={{
                            height: '100%',
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: 'action.hover',
                            },
                            '&:active': {
                              backgroundColor: 'action.hover',
                            },
                          }}
                        >
                          <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                mb: 1.5,
                              }}
                            >
                              <Avatar
                                sx={{
                                  width: 40,
                                  height: 40,
                                  bgcolor: `${prompt.category}.50`,
                                  color: getCategoryColor(prompt.category),
                                }}
                              >
                                {getCategoryIcon(prompt.category)}
                              </Avatar>
                              <IconButton
                                size='small'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleFavorite(prompt.id);
                                }}
                                aria-label={i18n.t('ai.ai_prompt_library_page.k17')}
                              >
                                <Star
                                  size={18}
                                  style={{
                                    fill: prompt.is_favorite ? 'warning.main' : 'none',
                                    color: prompt.is_favorite ? 'warning.main' : 'grey.400',
                                  }}
                                />
                              </IconButton>
                            </Box>

                            <Typography
                              variant='subtitle1'
                              sx={{ fontWeight: 600, mb: 0.5 }}
                            >
                              {prompt.name}
                            </Typography>
                            <Typography
                              variant='body2'
                              color='text.secondary'
                              sx={{ mb: 2, minHeight: 40 }}
                            >
                              {prompt.description}
                            </Typography>

                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                              {prompt.variables.slice(0, 3).map((v) => (
                                <Chip
                                  key={v}
                                  label={`{${v}}`}
                                  size='small'
                                  variant='outlined'
                                  sx={{ fontSize: 11 }}
                                />
                              ))}
                              {prompt.variables.length > 3 && (
                                <Chip
                                  label={`+${prompt.variables.length - 3}`}
                                  size='small'
                                  variant='outlined'
                                  sx={{ fontSize: 11 }}
                                />
                              )}
                            </Box>

                            <Divider sx={{ mb: 1.5 }} />

                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <Typography
                                variant='caption'
                                color='text.secondary'
                                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                              >
                                <ThumbsUp size={12} />
                                {i18n.t('ai.prompt_library.label.usage_count', {
                                  count: prompt.usage_count,
                                })}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <IconButton
                                  size='small'
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyPrompt(prompt.content);
                                  }}
                                  aria-label={i18n.t('ai.ai_prompt_library_page.k18')}
                                >
                                  <Copy size={14} />
                                </IconButton>
                                <IconButton
                                  size='small'
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUsePrompt(prompt);
                                  }}
                                  aria-label={i18n.t('ai.ai_prompt_library_page.k19')}
                                >
                                  <PlayCircle size={14} />
                                </IconButton>
                              </Box>
                            </Box>
                          </CardContent>
                        </Box>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                {filteredPrompts.length === 0 && (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <BookOpen
                      size={48}
                      style={{ margin: '0 auto 12px', color: ct.text.disabled }}
                    />
                    <Typography
                      variant='body1'
                      color='text.secondary'
                    >
                      {i18n.t('ai.prompt_library.message.no_results')}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* 使用模板对话框 */}
      <Dialog
        open={useDialogOpen}
        onClose={() => setUseDialogOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography
              variant='h6'
              sx={{ fontWeight: 600 }}
            >
              {selectedPrompt?.name}
            </Typography>
            <IconButton
              size='small'
              onClick={() => setUseDialogOpen(false)}
              aria-label={i18n.t('ai.ai_prompt_library_page.k20')}
            >
              <X size={18} />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mt: 1 }}>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mb: 2 }}
            >
              {selectedPrompt?.description}
            </Typography>

            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 1.5 }}
            >
              {i18n.t('ai.prompt_library.dialog.fill_variables')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
              {Object.keys(variables).map((key) => (
                <TextField
                  key={key}
                  label={key}
                  value={variables[key]}
                  onChange={(e) => setVariables((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder={i18n.t('ai.prompt_library.placeholder.enter_var', { var: key })}
                  size='small'
                  multiline
                  maxRows={3}
                />
              ))}
            </Box>

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 1.5,
              }}
            >
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                {i18n.t('ai.prompt_library.dialog.generated_result')}
              </Typography>
              {generatedResult && (
                <Button
                  size='small'
                  startIcon={<Copy size={14} />}
                  onClick={handleCopyResult}
                >
                  {i18n.t('ai.prompt_library.button.copy')}
                </Button>
              )}
            </Box>
            <Paper
              variant='outlined'
              sx={{
                p: 2,
                minHeight: 200,
                maxHeight: 300,
                overflowY: 'auto',
                bgcolor: 'grey.50',
              }}
            >
              {generating ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Sparkles
                    size={32}
                    className='animate-pulse'
                    style={{ margin: '0 auto 8px', color: ct.secondary[400] }}
                  />
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {i18n.t('ai.prompt_library.message.generating')}
                  </Typography>
                </Box>
              ) : generatedResult ? (
                <pre
                  style={{
                    margin: 0,
                    fontFamily: 'monospace',
                    fontSize: 13,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    lineHeight: 1.6,
                  }}
                >
                  {generatedResult}
                </pre>
              ) : (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Sparkles
                    size={32}
                    style={{ margin: '0 auto 8px', color: ct.text.disabled }}
                  />
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {i18n.t('ai.prompt_library.message.fill_then_generate')}
                  </Typography>
                </Box>
              )}
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUseDialogOpen(false)}>
            {i18n.t('ai.prompt_library.button.cancel')}
          </Button>
          <Button
            variant='contained'
            startIcon={<Sparkles size={16} />}
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating
              ? i18n.t('ai.prompt_library.button.generating')
              : i18n.t('ai.prompt_library.button.generate')}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default AiPromptLibraryPage;
