import React, { useState, useMemo, useCallback } from 'react';
import styles from './AiPromptLibraryPage.module.css';
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
  useTheme,
  type Theme,
} from '@mui/material';
import {
  BookOpen,
  Star,
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
  Trash2,
} from 'lucide-react';
import { PageContainer, Grid } from '@/components/common';
import { useNotificationStore } from '@/store';
import { designTokens } from '@/theme/tokens';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef, RowAction } from '@/components/templates/list/types';
import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';
import { aiApi } from '@/api/ai';

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

const getCategoryColor = (category: string, theme: Theme) => {
  const map: Record<string, string> = {
    writing: 'primary.main',
    code: 'secondary.main',
    business: 'success.main',
    analysis: 'warning.main',
    creative: theme.palette.pink[500],
  };
  return map[category] || 'grey.500';
};

const getCategoryBg = (category: string, theme: Theme) => {
  const palette = theme.palette as unknown as Record<string, Record<string, string>>;
  return palette[category]?.[50] ?? theme.palette.grey[50];
};

export const AiPromptLibraryPage: React.FC = () => {
  const { t } = useTranslation('ai');
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const theme = useTheme();

  const { data: prompts = [], refetch } = useQuery<PromptTemplate[]>({
    queryKey: QUERY_KEYS.AD_HOC.AI_PROMPTS_BASE,
    queryFn: async () => {
      const res = await aiApi.listPromptTemplates({ page: 1, page_size: 100 });
      if (!res.success || !res.data) {
        throw new Error(res.message || i18n.t('ai.ai_prompt_library_page.error_load'));
      }
      const items = (res.data.items ?? []) as unknown as Array<Record<string, unknown>>;
      return items.map((raw): PromptTemplate => ({
        id: String(raw.id ?? ''),
        name: String(raw.name ?? ''),
        description: String(raw.description ?? ''),
        category: String(raw.category ?? ''),
        content: String(raw.content ?? raw.template ?? ''),
        variables: Array.isArray(raw.variables) ? (raw.variables as string[]) : [],
        usage_count: Number(raw.usage_count ?? 0),
        is_favorite: Boolean(raw.is_favorite),
        created_at: String(raw.created_at ?? ''),
        updated_at: String(raw.updated_at ?? ''),
        created_by: String(raw.created_by ?? ''),
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async (promptId: string) => {
      const res = await aiApi.togglePromptFavorite(promptId);
      if (!res.success || !res.data) {
        throw new Error(
          res.message || i18n.t('ai.ai_prompt_library_page.error_favorite', '收藏操作失败')
        );
      }
      return res.data;
    },
    onMutate: async (promptId) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.AD_HOC.AI_PROMPTS_BASE });
      const previousPrompts = queryClient.getQueryData<PromptTemplate[]>(
        QUERY_KEYS.AD_HOC.AI_PROMPTS_BASE
      );
      queryClient.setQueryData<PromptTemplate[]>(QUERY_KEYS.AD_HOC.AI_PROMPTS_BASE, (old) =>
        old ? old.map((p) => (p.id === promptId ? { ...p, is_favorite: !p.is_favorite } : p)) : []
      );
      return { previousPrompts };
    },
    onError: (_err, _id, context) => {
      if (context?.previousPrompts) {
        queryClient.setQueryData(QUERY_KEYS.AD_HOC.AI_PROMPTS_BASE, context.previousPrompts);
      }
    },
  });

  const deletePromptMutation = useMutation({
    mutationFn: async (promptId: string) => {
      const res = await aiApi.deletePromptTemplate(promptId);
      if (!res.success) {
        throw new Error(
          res.message || i18n.t('ai.ai_prompt_library_page.error_delete', '删除提示词失败')
        );
      }
      return promptId;
    },
    onMutate: async (promptId) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.AD_HOC.AI_PROMPTS_BASE });
      const previousPrompts = queryClient.getQueryData<PromptTemplate[]>(
        QUERY_KEYS.AD_HOC.AI_PROMPTS_BASE
      );
      queryClient.setQueryData<PromptTemplate[]>(QUERY_KEYS.AD_HOC.AI_PROMPTS_BASE, (old) =>
        old ? old.filter((p) => p.id !== promptId) : []
      );
      return { previousPrompts };
    },
    onError: (_err, _id, context) => {
      if (context?.previousPrompts) {
        queryClient.setQueryData(QUERY_KEYS.AD_HOC.AI_PROMPTS_BASE, context.previousPrompts);
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

  const categories = useMemo(
    () =>
      categoryIds.map((id) => ({
        id,
        label: t(`prompt_library.category.${id}`),
        icon: categoryIcons[id],
      })),
    [t]
  );

  const filteredPrompts = useMemo(() => {
    return prompts.filter((p) => {
      const matchCategory = activeCategory === 'all' || p.category === activeCategory;
      const matchSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchFavorite = !showFavoritesOnly || p.is_favorite;
      return matchCategory && matchSearch && matchFavorite;
    });
  }, [activeCategory, prompts, searchQuery, showFavoritesOnly]);

  const handleUsePrompt = useCallback((prompt: PromptTemplate) => {
    setSelectedPrompt(prompt);
    const vars: Record<string, string> = {};
    prompt.variables.forEach((v) => {
      vars[v] = '';
    });
    setVariables(vars);
    setGeneratedResult('');
    setUseDialogOpen(true);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!selectedPrompt) return;

    setGenerating(true);
    try {
      const res = await aiApi.usePromptTemplate(selectedPrompt.id, { ...variables });
      if (!res.success || !res.data) {
        throw new Error(
          res.message || i18n.t('ai.ai_prompt_library_page.error_generate', '提示词执行失败')
        );
      }
      setGeneratedResult(res.data.result ?? res.data.formatted_prompt ?? '');
    } catch (err) {
      addNotification({
        title: i18n.t('ai.ai_prompt_library_page.error_generate', '提示词执行失败'),
        message: err instanceof Error ? err.message : String(err),
        type: 'error',
      });
    } finally {
      setGenerating(false);
    }
  }, [selectedPrompt, variables, addNotification]);

  const handleCopyResult = useCallback(() => {
    if (generatedResult) {
      navigator.clipboard.writeText(generatedResult);
      addNotification({
        title: i18n.t('ai.prompt_library.message.copied_title'),
        message: i18n.t('ai.prompt_library.message.result_copied'),
        type: 'success',
      });
    }
  }, [generatedResult, addNotification]);

  const handleCopyPrompt = useCallback(
    (content: string) => {
      navigator.clipboard.writeText(content);
      addNotification({
        title: i18n.t('ai.prompt_library.message.copied_title'),
        message: i18n.t('ai.prompt_library.message.prompt_copied'),
        type: 'success',
      });
    },
    [addNotification]
  );

  const handleToggleFavorite = useCallback(
    (id: string) => {
      toggleFavoriteMutation.mutate(id, {
        onSuccess: () => {
          addNotification({
            title: i18n.t('ai.prompt_library.message.favorite_title'),
            message: i18n.t('ai.prompt_library.message.favorite_updated'),
            type: 'success',
          });
        },
      });
    },
    [toggleFavoriteMutation, addNotification]
  );

  const columns: ColumnDef<PromptTemplate>[] = useMemo(
    () => [
      { id: 'name', label: t('ai.ai_prompt_library_page.columns.name') },
      { id: 'category', label: t('ai.ai_prompt_library_page.columns.category') },
      {
        id: 'usage_count',
        label: t('ai.ai_prompt_library_page.columns.usage_count'),
      },
      { id: 'created_by', label: t('ai.ai_prompt_library_page.columns.created_by') },
    ],
    [t]
  );

  const rowActions: RowAction<PromptTemplate>[] = useMemo(
    () => [
      {
        key: 'copy',
        label: i18n.t('ai.ai_prompt_library_page.k18'),
        icon: <Copy size={16} />,
        onClick: (row) => handleCopyPrompt(row.content),
        color: 'primary',
      },
      {
        key: 'use',
        label: i18n.t('ai.ai_prompt_library_page.k19'),
        icon: <PlayCircle size={16} />,
        onClick: (row) => handleUsePrompt(row),
        color: 'success',
      },
      {
        key: 'delete',
        label: i18n.t('templates.list_page_template.k42'),
        icon: <Trash2 size={16} />,
        onClick: (row) => deletePromptMutation.mutate(row.id),
        color: 'error',
      },
    ],
    [handleCopyPrompt, handleUsePrompt, deletePromptMutation]
  );

  const actions = useMemo(
    () => [
      {
        label: t('prompt_library.button.new_template'),
        icon: <Plus size={18} />,
        onClick: () => {
          addNotification({
            title: t('prompt_library.button.new_template'),
            message: t('prompt_library.message.coming_soon'),
            type: 'info',
          });
        },
        variant: 'contained' as const,
      },
    ],
    [t, addNotification]
  );

  const renderPromptCards = (data: PromptTemplate[]) => {
    if (data.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <BookOpen
            size={48}
            style={{ margin: '0 auto 12px', color: theme.palette.text.disabled }}
          />
          <Typography
            variant='body1'
            color='text.secondary'
          >
            {i18n.t('ai.prompt_library.message.no_results')}
          </Typography>
        </Box>
      );
    }

    return (
      <Grid
        container
        spacing={2}
      >
        {data.map((prompt) => (
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
                        bgcolor: getCategoryBg(prompt.category, theme),
                        color: getCategoryColor(prompt.category, theme),
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
                          fill: prompt.is_favorite ? theme.palette.warning.main : 'none',
                          color: prompt.is_favorite
                            ? theme.palette.warning.main
                            : theme.palette.grey[400],
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
    );
  };

  return (
    <PageContainer
      title={i18n.t('ai.prompt_library.title')}
      subtitle={i18n.t('ai.prompt_library.subtitle')}
      padding={false}
      maxWidth={false}
      headerProps={{
        pageIcon: <BookOpen className={styles.il1} />,
        pageGradient: `linear-gradient(135deg, ${theme.palette.teal[200]} 0%, ${theme.palette.pink[100]} 100%)`,
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
                            color:
                              activeCategory === cat.id
                                ? theme.palette.secondary[400]
                                : theme.palette.text.secondary,
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
            <ListPageTemplate<PromptTemplate>
              columns={columns}
              data={filteredPrompts}
              loading={false}
              searchable
              searchPlaceholder={t('prompt_library.placeholder.search')}
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              onRefresh={refetch}
              actions={actions}
              rowActions={rowActions}
              viewMode='card'
              viewModes={['card']}
              cardGridColumns={3}
              getRowId={(row) => row.id}
              headerContent={
                <Tabs
                  value={viewTab}
                  onChange={(_, v) => setViewTab(v)}
                  sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0.5 } }}
                >
                  <Tab
                    label={t('prompt_library.view.all_templates')}
                    value='all'
                    sx={{ textTransform: 'none' }}
                  />
                  <Tab
                    label={t('prompt_library.view.my_templates')}
                    value='mine'
                    sx={{ textTransform: 'none' }}
                  />
                </Tabs>
              }
              renderCardView={renderPromptCards}
              emptyMessage={t('prompt_library.message.no_results')}
              emptyIcon={
                <BookOpen
                  size={48}
                  style={{ color: theme.palette.text.disabled }}
                />
              }
            />
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
                    style={{
                      margin: `0 auto ${designTokens.spacing.sm}px`,
                      color: theme.palette.secondary[400],
                    }}
                  />
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {i18n.t('ai.prompt_library.message.generating')}
                  </Typography>
                </Box>
              ) : generatedResult ? (
                <pre className={styles.il2}>{generatedResult}</pre>
              ) : (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Sparkles
                    size={32}
                    style={{
                      margin: `0 auto ${designTokens.spacing.sm}px`,
                      color: theme.palette.text.disabled,
                    }}
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
