import { designTokens } from '@topems/tokens';
import React, { useState, useMemo, useCallback } from 'react';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  Search,
  Grid,
  List,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import i18n from '@/i18n';
import {
  templateApi,
  type Template,
  type TemplateCategory,
  type CreateTemplateRequest,
} from '@/api/template';
import { useNotificationStore } from '@/store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiLogger } from '@/utils/logger';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Button,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef } from '@/components/templates/list/types';
import { useCrudMutations } from '@/hooks';

import { QUERY_KEYS } from '@/lib/reactQuery';

const TemplateManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const templatesQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.TEMPLATES_BASE, searchQuery, selectedCategory],
    queryFn: async () => {
      const response = await templateApi.list({ search: searchQuery, category: selectedCategory });
      if (!response.success || !response.data) {
        throw new Error(response.message || i18n.t('pages.template_management_page.k0'));
      }
      return response.data.items || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const categoriesQuery = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.TEMPLATE_CATEGORIES_BASE,
    queryFn: async () => {
      const response = await templateApi.listCategories();
      if (!response.success || !response.data) {
        throw new Error(response.message || i18n.t('pages.template_management_page.k1'));
      }
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const templates = useMemo(() => templatesQuery.data || [], [templatesQuery]);
  const categories = useMemo(() => categoriesQuery.data || [], [categoriesQuery]);
  const loading = templatesQuery.isLoading || categoriesQuery.isLoading;

  const { createMutation, updateMutation, deleteMutation } = useCrudMutations<
    CreateTemplateRequest,
    Partial<CreateTemplateRequest>,
    string
  >({
    queryKeyToInvalidate: ['templates'],
    createFn: async (data) => {
      const response = await templateApi.create(data);
      if (!response.success) {
        throw new Error(response.message || i18n.t('pages.template_management_page.k2'));
      }
      return response.data;
    },
    updateFn: async ({ id, data }) => {
      const response = await templateApi.update(String(id), data);
      if (!response.success) {
        throw new Error(response.message || i18n.t('pages.template_management_page.k3'));
      }
      return response.data;
    },
    deleteFn: async (id) => {
      const response = await templateApi.delete(String(id));
      if (!response.success) {
        throw new Error(response.message || i18n.t('pages.template_management_page.k4'));
      }
      return id;
    },
    entityName: i18n.t('pages.template_management_page.k5'),
    onCreateSuccess: () => {
      setShowCreateModal(false);
    },
    onUpdateSuccess: () => {
      setShowEditModal(false);
      setSelectedTemplate(null);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await templateApi.duplicate(id);
      if (!response.success) {
        throw new Error(response.message || i18n.t('pages.template_management_page.k6'));
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.TEMPLATES_BASE,
        exact: false,
        refetchType: 'active',
      });
      addNotification({
        type: 'success',
        title: i18n.t('pages.template_management_page.k8'),
        message: i18n.t('pages.template_management_page.k7'),
      });
    },
    onError: (err: unknown) => {
      apiLogger.error(i18n.t('pages.template_management_page.k0'), err);
      addNotification({
        type: 'error',
        title: i18n.t('pages.template_management_page.k9'),
        message: (err as Error).message || i18n.t('pages.template_management_page.k10'),
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await templateApi.toggleStatus(id);
      if (!response.success) {
        throw new Error(response.message || i18n.t('pages.template_management_page.k11'));
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.TEMPLATES_BASE,
        exact: false,
        refetchType: 'active',
      });
      addNotification({
        type: 'success',
        title: i18n.t('pages.template_management_page.k13'),
        message: i18n.t('pages.template_management_page.k12'),
      });
    },
    onError: (err: unknown) => {
      apiLogger.error(i18n.t('pages.template_management_page.k1'), err);
      addNotification({
        type: 'error',
        title: i18n.t('pages.template_management_page.k14'),
        message: (err as Error).message || i18n.t('pages.template_management_page.k15'),
      });
    },
  });

  const isMutating = useMemo(
    () =>
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending ||
      duplicateMutation.isPending ||
      toggleStatusMutation.isPending,
    [
      createMutation.isPending,
      updateMutation.isPending,
      deleteMutation.isPending,
      duplicateMutation.isPending,
      toggleStatusMutation.isPending,
    ]
  );

  const handleCreateTemplate = useCallback(
    async (data: CreateTemplateRequest) => {
      await createMutation.mutateAsync(data);
    },
    [createMutation]
  );

  const handleUpdateTemplate = useCallback(
    async (id: string, data: Partial<CreateTemplateRequest>) => {
      await updateMutation.mutateAsync({ id, data });
    },
    [updateMutation]
  );

  const handleDeleteTemplate = useCallback(
    async (id: string) => {
      if (!confirm(i18n.t('pages.template_management_page.k16'))) return;
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  const handleDuplicateTemplate = useCallback(
    async (id: string) => {
      await duplicateMutation.mutateAsync(id);
    },
    [duplicateMutation]
  );

  const handleToggleStatus = useCallback(
    async (id: string) => {
      await toggleStatusMutation.mutateAsync(id);
    },
    [toggleStatusMutation]
  );

  const filteredTemplates = useMemo(
    () =>
      templates.filter(
        (t) =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [templates, searchQuery]
  );

  const getCategoryName = useCallback(
    (template: Template) =>
      categories.find((c) => c.id === template.category_id)?.name ||
      template.category_name ||
      i18n.t('pages.template_management_page.k39'),
    [categories]
  );

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.AD_HOC.TEMPLATES_BASE,
      exact: false,
      refetchType: 'active',
    });
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.AD_HOC.TEMPLATE_CATEGORIES_BASE,
      exact: false,
      refetchType: 'active',
    });
  }, [queryClient]);

  const columns: ColumnDef<Template>[] = useMemo(
    () => [
      {
        id: 'name',
        label: i18n.t('pages.template_management_page.k6'),
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontWeight: 500 }}>{row.name}</Typography>
            <Chip
              label={
                row.isactive
                  ? i18n.t('pages.template_management_page.k38')
                  : i18n.t('pages.template_management_page.k37')
              }
              size='small'
              sx={{
                bgcolor: row.isactive ? 'success.100' : 'grey.100',
                color: row.isactive ? 'success.700' : 'grey.700',
              }}
            />
          </Box>
        ),
      },
      {
        id: 'code',
        label: i18n.t('pages.template_management_page.k7'),
        render: (row) => (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {row.code}
          </Typography>
        ),
      },
      {
        id: 'category',
        label: i18n.t('pages.template_management_page.k8'),
        render: (row) => (
          <Chip
            label={getCategoryName(row)}
            size='small'
            sx={{ bgcolor: 'primary.50', color: 'primary.700' }}
          />
        ),
      },
      {
        id: 'module',
        label: i18n.t('pages.template_management_page.k9'),
        render: (row) => <Typography variant='body2'>{row.module}</Typography>,
      },
      {
        id: 'variables',
        label: i18n.t('pages.template_management_page.k1'),
        render: (row) => <Typography variant='body2'>{row.variables?.length || 0}</Typography>,
      },
    ],
    [getCategoryName]
  );

  const renderRowActions = useCallback(
    (row: Template) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Tooltip
          title={
            row.isactive
              ? i18n.t('pages.template_management_page.k27')
              : i18n.t('pages.template_management_page.k26')
          }
        >
          <span>
            <IconButton
              onClick={() => handleToggleStatus(row.id)}
              disabled={isMutating}
              sx={{
                color: row.isactive ? 'success.main' : 'grey.400',
              }}
              aria-label={
                row.isactive
                  ? i18n.t('pages.template_management_page.k25')
                  : i18n.t('pages.template_management_page.k24')
              }
            >
              {row.isactive ? (
                <ToggleRight sx={{ width: 20, height: 20 }} />
              ) : (
                <ToggleLeft sx={{ width: 20, height: 20 }} />
              )}
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={i18n.t('pages.template_management_page.k30')}>
          <IconButton
            onClick={() => {
              setSelectedTemplate(row);
              setShowPreviewModal(true);
            }}
            disabled={isMutating}
            sx={{ color: 'primary.main' }}
            aria-label={i18n.t('pages.template_management_page.k29')}
          >
            <Eye sx={{ width: 16, height: 16 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title={i18n.t('pages.template_management_page.k32')}>
          <span>
            <IconButton
              onClick={() => handleDuplicateTemplate(row.id)}
              disabled={isMutating}
              sx={{ color: 'success.main' }}
              aria-label={i18n.t('pages.template_management_page.k31')}
            >
              <Copy sx={{ width: 16, height: 16 }} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={i18n.t('pages.template_management_page.k34')}>
          <IconButton
            onClick={() => {
              setSelectedTemplate(row);
              setShowEditModal(true);
            }}
            disabled={isMutating}
            sx={{ color: 'primary.main' }}
            aria-label={i18n.t('pages.template_management_page.k33')}
          >
            <Edit sx={{ width: 16, height: 16 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title={i18n.t('pages.template_management_page.k36')}>
          <span>
            <IconButton
              onClick={() => handleDeleteTemplate(row.id)}
              disabled={isMutating}
              sx={{ color: 'error.main' }}
              aria-label={i18n.t('pages.template_management_page.k35')}
            >
              <Trash2 sx={{ width: 16, height: 16 }} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    ),
    [handleToggleStatus, handleDuplicateTemplate, handleDeleteTemplate, isMutating]
  );

  const actions = useMemo(
    () => [
      {
        label: i18n.t('pages.template_management_page.k19'),
        onClick: () => setShowCreateModal(true),
        icon: <Plus sx={{ width: 16, height: 16 }} />,
        variant: 'contained' as const,
      },
    ],
    []
  );

  const renderCardView = useCallback(
    (data: Template[]) => (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(2, 1fr)',
            lg: 'repeat(3, 1fr)',
          },
          gap: 3,
        }}
      >
        {data.map((template) => (
          <Card
            key={template.id}
            sx={{
              bgcolor: 'grey.50',
              '&:hover': { boxShadow: 3 },
            }}
          >
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  mb: 2,
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: 'primary.100',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FileText sx={{ width: 24, height: 24, color: 'primary.main' }} />
                </Box>
                <Tooltip
                  title={
                    template.isactive
                      ? i18n.t('pages.template_management_page.k27')
                      : i18n.t('pages.template_management_page.k26')
                  }
                >
                  <span>
                    <IconButton
                      onClick={() => handleToggleStatus(template.id)}
                      disabled={isMutating}
                      sx={{
                        color: template.isactive ? 'success.main' : 'grey.400',
                        '&:hover': {
                          bgcolor: template.isactive ? 'success.light' : 'grey.200',
                        },
                      }}
                      aria-label={
                        template.isactive
                          ? i18n.t('pages.template_management_page.k25')
                          : i18n.t('pages.template_management_page.k24')
                      }
                    >
                      {template.isactive ? (
                        <ToggleRight sx={{ width: 20, height: 20 }} />
                      ) : (
                        <ToggleLeft sx={{ width: 20, height: 20 }} />
                      )}
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>

              <Typography
                variant='h6'
                sx={{ fontWeight: 600, mb: 0.5 }}
              >
                {template.name}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ mb: 2 }}
              >
                {template.code}
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5,
                  mb: 2,
                }}
              >
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('pages.template_management_page.k5')}
                  {getCategoryName(template)}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('pages.template_management_page.k0')}
                  {template.module}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('pages.template_management_page.k1')}
                  {template.variables?.length || 0}
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 0.5,
                  pt: 2,
                  borderTop: 1,
                  borderColor: 'divider',
                }}
              >
                <Tooltip title={i18n.t('pages.template_management_page.k30')}>
                  <IconButton
                    onClick={() => {
                      setSelectedTemplate(template);
                      setShowPreviewModal(true);
                    }}
                    disabled={isMutating}
                    sx={{ color: 'primary.main' }}
                    aria-label={i18n.t('pages.template_management_page.k29')}
                  >
                    <Eye sx={{ width: 16, height: 16 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title={i18n.t('pages.template_management_page.k32')}>
                  <span>
                    <IconButton
                      onClick={() => handleDuplicateTemplate(template.id)}
                      disabled={isMutating}
                      sx={{ color: 'success.main' }}
                      aria-label={i18n.t('pages.template_management_page.k31')}
                    >
                      <Copy sx={{ width: 16, height: 16 }} />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title={i18n.t('pages.template_management_page.k34')}>
                  <IconButton
                    onClick={() => {
                      setSelectedTemplate(template);
                      setShowEditModal(true);
                    }}
                    disabled={isMutating}
                    sx={{ color: 'primary.main' }}
                    aria-label={i18n.t('pages.template_management_page.k33')}
                  >
                    <Edit sx={{ width: 16, height: 16 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title={i18n.t('pages.template_management_page.k36')}>
                  <span>
                    <IconButton
                      onClick={() => handleDeleteTemplate(template.id)}
                      disabled={isMutating}
                      sx={{ color: 'error.main' }}
                      aria-label={i18n.t('pages.template_management_page.k35')}
                    >
                      <Trash2 sx={{ width: 16, height: 16 }} />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
    ),
    [getCategoryName, handleToggleStatus, handleDuplicateTemplate, handleDeleteTemplate, isMutating]
  );

  const headerContent = useMemo(
    () => (
      <Card sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            placeholder={i18n.t('pages.template_management_page.k2')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size='small'
            sx={{ flex: 1, minWidth: 200 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position='start'>
                    <Search sx={{ width: 20, height: 20, color: 'grey.400' }} />
                  </InputAdornment>
                ),
              },
            }}
          />

          <FormControl
            size='small'
            sx={{ minWidth: 150 }}
          >
            <InputLabel>{i18n.t('pages.template_management_page.k20')}</InputLabel>
            <Select
              value={selectedCategory}
              label={i18n.t('pages.template_management_page.k21')}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <MenuItem value=''>{i18n.t('pages.template_management_page.k22')}</MenuItem>
              {categories.map((cat) => (
                <MenuItem
                  key={cat.id}
                  value={cat.code}
                >
                  {cat.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', border: 1, borderColor: 'divider' }}>
            <Button
              variant={viewMode === 'grid' ? 'contained' : 'text'}
              onClick={() => setViewMode('grid')}
              sx={{ borderRadius: 0 }}
              aria-label={i18n.t('pages.template_management_page.k24')}
            >
              <Grid sx={{ width: 20, height: 20 }} />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'contained' : 'text'}
              onClick={() => setViewMode('list')}
              sx={{ borderRadius: 0 }}
              aria-label={i18n.t('pages.template_management_page.k25')}
            >
              <List sx={{ width: 20, height: 20 }} />
            </Button>
          </Box>

          <Button
            variant='outlined'
            onClick={handleRefresh}
          >
            {i18n.t('pages.template_management_page.k3')}
          </Button>
        </Box>
      </Card>
    ),
    [searchQuery, selectedCategory, categories, viewMode, handleRefresh]
  );

  return (
    <>
      <ListPageTemplate<Template>
        title={i18n.t('pages.template_management_page.k17')}
        subtitle={i18n.t('pages.template_management_page.k18')}
        columns={columns}
        data={filteredTemplates}
        loading={loading}
        actions={actions}
        renderRowActions={renderRowActions}
        viewMode={viewMode === 'grid' ? 'card' : 'table'}
        viewModes={['table']}
        renderCardView={renderCardView}
        emptyMessage={i18n.t('pages.template_management_page.k23')}
        emptyIcon={<FileText sx={{ width: 48, height: 48, color: 'grey.400' }} />}
        headerContent={headerContent}
      />

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <TemplateFormModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTemplate}
          categories={categories}
        />
      )}

      {showEditModal && selectedTemplate && (
        <TemplateFormModal
          template={selectedTemplate}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTemplate(null);
          }}
          onSubmit={(data) => handleUpdateTemplate(selectedTemplate.id, data)}
          categories={categories}
        />
      )}

      {/* Preview Modal */}
      {showPreviewModal && selectedTemplate && (
        <TemplatePreviewModal
          template={selectedTemplate}
          onClose={() => {
            setShowPreviewModal(false);
            setSelectedTemplate(null);
          }}
        />
      )}
    </>
  );
};

// Template Form Modal Component
interface TemplateFormModalProps {
  template?: Template;
  onClose: () => void;
  onSubmit: (data: CreateTemplateRequest) => void;
  categories: TemplateCategory[];
}

const TemplateFormModal: React.FC<TemplateFormModalProps> = ({
  template,
  onClose,
  onSubmit,
  categories,
}) => {
  const [formData, setFormData] = useState<CreateTemplateRequest>({
    name: template?.name || '',
    code: template?.code || '',
    category_id: template?.category_id,
    module: template?.module || '',
    description: template?.description || '',
    content: template?.content || '',
    variables: template?.variables || [],
    isactive: template?.isactive ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth='md'
      fullWidth
      slotProps={{
        paper: { sx: { maxHeight: '90vh' } },
      }}
    >
      <DialogTitle>
        {template
          ? i18n.t('pages.template_management_page.k46')
          : i18n.t('pages.template_management_page.k45')}
      </DialogTitle>
      <DialogContent sx={{ overflowY: 'auto' }}>
        <Box
          component='form'
          onSubmit={handleSubmit}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}
        >
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              label={i18n.t('pages.template_management_page.k6')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder={i18n.t('pages.template_management_page.k47')}
              size='small'
            />
            <TextField
              label={i18n.t('pages.template_management_page.k7')}
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
              placeholder={i18n.t('pages.template_management_page.k48')}
              size='small'
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <FormControl
              size='small'
              required
            >
              {i18n.t('pages.template_management_page.k2')}
              <Select
                value={formData.category_id || ''}
                label={i18n.t('pages.template_management_page.k8')}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              >
                <MenuItem value=''>{i18n.t('pages.template_management_page.k49')}</MenuItem>
                {categories.map((cat) => (
                  <MenuItem
                    key={cat.id}
                    value={cat.id}
                  >
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl
              size='small'
              required
            >
              {i18n.t('pages.template_management_page.k3')}
              <Select
                value={formData.module}
                label={i18n.t('pages.template_management_page.k9')}
                onChange={(e) => setFormData({ ...formData, module: e.target.value })}
              >
                <MenuItem value=''>{i18n.t('pages.template_management_page.k50')}</MenuItem>
                <MenuItem value='ERP'>ERP</MenuItem>
                <MenuItem value='HRM'>HRM</MenuItem>
                <MenuItem value='CRM'>CRM</MenuItem>
                <MenuItem value='QMS'>QMS</MenuItem>
                <MenuItem value='LIMS'>LIMS</MenuItem>
                <MenuItem value={i18n.t('pages.template_management_page.k51')}>
                  {i18n.t('pages.template_management_page.k52')}
                </MenuItem>
              </Select>
            </FormControl>
          </Box>

          <TextField
            label={i18n.t('pages.template_management_page.k53')}
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            multiline
            rows={2}
            placeholder={i18n.t('pages.template_management_page.k54')}
            size='small'
          />

          <TextField
            label={i18n.t('pages.template_management_page.k10')}
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            required
            multiline
            rows={10}
            placeholder={i18n.t('pages.template_management_page.k11')}
            size='small'
            sx={{ fontFamily: 'monospace' }}
          />
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {i18n.t('pages.template_management_page.k4')} {'{{variable_name}}'}{' '}
            {i18n.t('pages.template_management_page.k5')}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button
          variant='outlined'
          onClick={onClose}
        >
          {i18n.t('pages.template_management_page.k12')}
        </Button>
        <Button
          variant='contained'
          onClick={handleSubmit}
        >
          {template
            ? i18n.t('pages.template_management_page.k56')
            : i18n.t('pages.template_management_page.k55')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Template Preview Modal Component
interface TemplatePreviewModalProps {
  template: Template;
  onClose: () => void;
}

const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({ template, onClose }) => {
  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth='lg'
      fullWidth
      slotProps={{
        paper: { sx: { maxHeight: '90vh' } },
      }}
    >
      <DialogTitle>{i18n.t('pages.template_management_page.k57')}</DialogTitle>
      <DialogContent sx={{ overflowY: 'auto' }}>
        <Box sx={{ mb: 3 }}>
          <Typography
            variant='h6'
            sx={{ fontWeight: 'bold', mb: 1 }}
          >
            {template.name}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              gap: 3,
              color: 'text.secondary',
              fontSize: designTokens.typography.fontSize.scale['0.875rem'],
            }}
          >
            <Typography variant='body2'>
              {i18n.t('pages.template_management_page.templatecode_0')}
            </Typography>
            <Typography variant='body2'>
              {i18n.t('report.template_management.category_label')}
              {template.category_name || i18n.t('pages.template_management_page.k0')}
            </Typography>
            <Typography variant='body2'>
              {i18n.t('pages.template_management_page.templatemodule_1')}
            </Typography>
          </Box>
          {template.description && (
            <Typography
              color='text.secondary'
              sx={{ mt: 1 }}
            >
              {template.description}
            </Typography>
          )}
        </Box>

        <Card sx={{ bgcolor: 'grey.50', p: 2, mb: 3 }}>
          <Typography sx={{ fontWeight: 'semibold', mb: 1 }}>
            {i18n.t('pages.template_management_page.k59')}
          </Typography>
          <Box
            component='pre'
            sx={{
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              fontSize: designTokens.typography.fontSize.scale['0.875rem'],
              color: 'text.secondary',
            }}
          >
            {template.content}
          </Box>
        </Card>

        {template.variables && template.variables.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography sx={{ fontWeight: 'semibold', mb: 1 }}>
              {i18n.t('pages.template_management_page.k60')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {template.variables.map((variable, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 1.5,
                    bgcolor: 'grey.50',
                    borderRadius: 1,
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: 'monospace',
                      color: 'primary.main',
                    }}
                  >
                    {'{{'}
                    {variable.key}
                    {'}}'}
                  </Typography>
                  <Typography color='text.secondary'>{variable.label}</Typography>
                  <Chip
                    label={variable.type}
                    size='small'
                    sx={{ fontSize: designTokens.typography.fontSize.scale['0.75rem'] }}
                  />
                  {variable.required && (
                    <Typography
                      sx={{
                        color: 'error.main',
                        fontSize: designTokens.typography.fontSize.scale['0.75rem'],
                      }}
                    >
                      {i18n.t('pages.template_management_page.k61')}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button
          variant='outlined'
          onClick={onClose}
        >
          {i18n.t('pages.template_management_page.k14')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TemplateManagementPage;
