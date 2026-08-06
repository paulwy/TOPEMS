import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Edit2,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Grid3X3,
  LayoutDashboard,
  FolderOpen,
  Filter,
  SortDesc,
  BarChart3,
} from 'lucide-react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  Divider,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  IconButton,
  Tooltip,
  Skeleton,
  Tabs,
  Tab,
} from '@mui/material';
import {
  fetchDashboards,
  createDashboard,
  deleteDashboard,
  cloneDashboard,
  updateDashboard,
  fetchDashboardTemplates,
  createDashboardFromTemplate,
  type Dashboard,
  type DashboardTemplate,
} from '@/api/bi';
import {
  DashboardEditor,
  type DashboardWidget,
  type DashboardConfig,
} from '@/components/bi/DashboardEditor';
import { DashboardTemplateManager } from '@/components/bi/DashboardTemplateManager';
import { DashboardTemplate as DashboardLayout } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { logger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

import { useTranslation } from 'react-i18next';

const ct = designTokens.colors;

type ViewMode = 'list' | 'editor';
type TabType = 'dashboards' | 'templates';

interface CreateDialogState {
  open: boolean;
  useTemplate: boolean;
  selectedTemplateId: string | null;
  name: string;
  description: string;
}

interface DashboardSaveConfig {
  name: string;
  description: string;
  widgets: DashboardWidget[];
}

const BIDashboardPage = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [activeTab, setActiveTab] = useState<TabType>('dashboards');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(null);
  const [createDialog, setCreateDialog] = useState<CreateDialogState>({
    open: false,
    useTemplate: false,
    selectedTemplateId: null,
    name: '',
    description: '',
  });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [contextDashboard, setContextDashboard] = useState<Dashboard | null>(null);

  const dashboardsQuery = useQuery<Dashboard[]>({
    queryKey: ['bi-dashboards'],
    queryFn: async () => {
      const res = await fetchDashboards();
      if (res.success && res.data) {
        return res.data.items || [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const templatesQuery = useQuery<DashboardTemplate[]>({
    queryKey: ['bi-dashboard-templates'],
    queryFn: async () => {
      const res = await fetchDashboardTemplates();
      if (res.success && res.data) {
        return res.data.items || [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const dashboards = dashboardsQuery.data ?? [];
  const templates = templatesQuery.data ?? [];
  const loading = dashboardsQuery.isLoading;

  useEffect(() => {
    if (dashboardsQuery.isError) {
      logger.error('Failed to load dashboards:', dashboardsQuery.error);
    }
    if (templatesQuery.isError) {
      logger.error('Failed to load templates:', templatesQuery.error);
    }
  }, [
    dashboardsQuery.isError,
    dashboardsQuery.error,
    templatesQuery.isError,
    templatesQuery.error,
  ]);

  const createMutation = useMutation({
    mutationFn: async ({
      data,
      useTemplate,
      templateId,
    }: {
      data: Partial<Dashboard>;
      useTemplate: boolean;
      templateId: string | null;
    }) => {
      if (useTemplate && templateId) {
        return await createDashboardFromTemplate(templateId, data);
      }
      return await createDashboard(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bi-dashboards'] });
      setCreateDialog({
        open: false,
        useTemplate: false,
        selectedTemplateId: null,
        name: '',
        description: '',
      });
    },
    onError: (error: unknown) => {
      logger.error('Failed to create dashboard:', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDashboard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bi-dashboards'] });
    },
    onError: (error: unknown) => {
      logger.error('Failed to delete dashboard:', error);
    },
  });

  const cloneMutation = useMutation({
    mutationFn: (id: string) => cloneDashboard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bi-dashboards'] });
    },
    onError: (error: unknown) => {
      logger.error('Failed to clone dashboard:', error);
    },
  });

  const togglePublicMutation = useMutation({
    mutationFn: (dashboard: Dashboard) =>
      updateDashboard(dashboard.id, { is_public: !dashboard.is_public }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bi-dashboards'] });
    },
    onError: (error: unknown) => {
      logger.error('Failed to update dashboard:', error);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({
      config,
      selectedDashboard,
    }: {
      config: DashboardConfig;
      selectedDashboard: Dashboard | null;
    }) => {
      const data: Partial<Dashboard> = {
        name: config.name,
        description: config.description || '',
        layout: { widgets: config.widgets },
      };
      if (selectedDashboard) {
        return await updateDashboard(selectedDashboard.id, data);
      }
      return await createDashboard({
        ...data,
        owner_id: 'current-user',
        is_public: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bi-dashboards'] });
      setViewMode('list');
    },
    onError: (error: unknown) => {
      logger.error('Failed to save dashboard:', error);
    },
  });

  const actionLoading =
    createMutation.isPending ||
    deleteMutation.isPending ||
    cloneMutation.isPending ||
    togglePublicMutation.isPending ||
    saveMutation.isPending;

  const handleCreateDashboard = () => {
    const data: Partial<Dashboard> = {
      name: createDialog.name || t('bi.bi_dashboard_page.text_d5e229'),
      description: createDialog.description,
      owner_id: 'current-user',
      is_public: false,
    };
    createMutation.mutate({
      data,
      useTemplate: createDialog.useTemplate,
      templateId: createDialog.selectedTemplateId,
    });
  };

  const handleDeleteDashboard = (id: string) => {
    if (!confirm(t('bi.bi_dashboard_page.confirm'))) return;
    deleteMutation.mutate(id);
  };

  const handleCloneDashboard = (id: string) => {
    cloneMutation.mutate(id);
  };

  const handleTogglePublic = (dashboard: Dashboard) => {
    togglePublicMutation.mutate(dashboard);
  };

  const handleOpenEditor = (dashboard?: Dashboard) => {
    setSelectedDashboard(dashboard || null);
    setViewMode('editor');
  };

  const handleSaveDashboard = (config: DashboardConfig) => {
    saveMutation.mutate({ config, selectedDashboard });
  };

  const filteredDashboards = dashboards.filter(
    (d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleContextMenu = (event: React.MouseEvent<HTMLElement>, dashboard: Dashboard) => {
    event.preventDefault();
    setAnchorEl(event.currentTarget);
    setContextDashboard(dashboard);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setContextDashboard(null);
  };

  if (viewMode === 'editor') {
    return (
      <DashboardEditor
        initialConfig={
          selectedDashboard?.layout
            ? {
                id: selectedDashboard.id,
                name: selectedDashboard.name,
                description: selectedDashboard.description || '',
                widgets: (selectedDashboard.layout?.widgets as DashboardWidget[]) || [],
              }
            : undefined
        }
        onSave={handleSaveDashboard}
        onCancel={() => {
          setViewMode('list');
          setSelectedDashboard(null);
        }}
      />
    );
  }

  return (
    <PageContainer
      title={t('bi.bi_dashboard_page.text_286397')}
      subtitle={t('bi.bi_dashboard_page.create')}
      headerProps={{
        pageIcon: <BarChart3 style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.secondary[400]} 0%, ${ct.secondary[600]} 100%)`,
      }}
      padding={false}
      maxWidth={false}
    >
      <DashboardLayout
        title=''
        subtitle=''
        breadcrumbs={[
          { label: t('bi.bi_dashboard_page.home'), href: '/dashboard' },
          { label: 'BI' },
          { label: t('bi.bi_dashboard_page.text_286397') },
        ]}
      >
        <Box sx={{ p: 3 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 4,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Tabs
                value={activeTab}
                onChange={(_, newValue) => setActiveTab(newValue)}
                sx={{ minWidth: 200 }}
              >
                <Tab
                  value='dashboards'
                  label={t('bi.bi_dashboard_page.text_3fa8b3')}
                  icon={<LayoutDashboard size={18} />}
                  iconPosition='start'
                />
                <Tab
                  value='templates'
                  label={t('bi.bi_dashboard_page.text_59cf15')}
                  icon={<FolderOpen size={18} />}
                  iconPosition='start'
                />
              </Tabs>
            </Box>
            {activeTab === 'dashboards' && (
              <Button
                variant='contained'
                startIcon={<Plus />}
                onClick={() => setCreateDialog({ ...createDialog, open: true })}
              >
                创建仪表盘
              </Button>
            )}
          </Box>

          {activeTab === 'templates' ? (
            <DashboardTemplateManager
              onDashboardCreated={() => {
                setActiveTab('dashboards');
                queryClient.invalidateQueries({ queryKey: ['bi-dashboards'] });
              }}
            />
          ) : (
            <>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 4,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <TextField
                    placeholder={t('bi.bi_dashboard_page.search')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    size='small'
                    sx={{ width: 300 }}
                  />
                  <Button
                    variant='outlined'
                    size='small'
                    startIcon={<Filter />}
                  >
                    筛选
                  </Button>
                  <Button
                    variant='outlined'
                    size='small'
                    startIcon={<SortDesc />}
                  >
                    排序
                  </Button>
                </Box>
              </Box>

              {loading ? (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 3,
                  }}
                >
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardContent>
                        <Skeleton sx={{ width: '60%', mb: 2 }} />
                        <Skeleton sx={{ width: '100%', height: 120 }} />
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              ) : filteredDashboards.length === 0 ? (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 12,
                    color: 'text.secondary',
                  }}
                >
                  <Grid3X3 sx={{ width: 64, height: 64, mb: 3, opacity: 0.5 }} />
                  <Typography variant='h6'>暂无仪表盘</Typography>
                  <Typography variant='body2'>点击上方按钮创建您的第一个仪表盘</Typography>
                  <Button
                    variant='contained'
                    startIcon={<Plus />}
                    sx={{ mt: 3 }}
                    onClick={() => setCreateDialog({ ...createDialog, open: true })}
                  >
                    创建仪表盘
                  </Button>
                </Box>
              ) : (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 3,
                  }}
                >
                  {filteredDashboards.map((dashboard) => (
                    <Card
                      key={dashboard.id}
                      sx={{
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        '&:hover': {
                          boxShadow: 3,
                          transform: 'translateY(-2px)',
                        },
                      }}
                      onClick={() => handleOpenEditor(dashboard)}
                      onContextMenu={(e) => handleContextMenu(e, dashboard)}
                    >
                      {dashboard.is_public && (
                        <Chip
                          label={t('bi.bi_dashboard_page.text_b6a098')}
                          size='small'
                          color='primary'
                          sx={{ position: 'absolute', top: 8, right: 8 }}
                        />
                      )}
                      <CardContent sx={{ pb: 2 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            mb: 2,
                          }}
                        >
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: 1,
                              backgroundColor: 'indigo.light',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <LayoutDashboard sx={{ color: 'indigo.main' }} />
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              variant='h6'
                              sx={{
                                fontWeight: 600,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {dashboard.name}
                            </Typography>
                            <Typography
                              variant='caption'
                              sx={{ color: 'text.secondary' }}
                            >
                              {new Date(dashboard.created_at).toLocaleDateString()}
                            </Typography>
                          </Box>
                        </Box>
                        {dashboard.description && (
                          <Typography
                            variant='body2'
                            sx={{
                              color: 'text.secondary',
                              mb: 2,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {dashboard.description}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={t('bi.bi_dashboard_page.text_d09504')}
                            size='small'
                            variant='outlined'
                          />
                          <Chip
                            label={t('bi.bi_dashboard_page.text_7e6875')}
                            size='small'
                            variant='outlined'
                          />
                        </Box>
                      </CardContent>
                      <CardActions sx={{ justifyContent: 'flex-end', gap: 1 }}>
                        <Tooltip title={t('bi.bi_dashboard_page.edit')}>
                          <IconButton
                            size='small'
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditor(dashboard);
                            }}
                            aria-label='编辑'
                          >
                            <Edit2 sx={{ width: 18, height: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('bi.bi_dashboard_page.text_25fe25')}>
                          <IconButton
                            size='small'
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCloneDashboard(dashboard.id);
                            }}
                            aria-label='复制'
                          >
                            <Copy sx={{ width: 18, height: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip
                          title={
                            dashboard.is_public
                              ? t('bi.bi_dashboard_page.text_a81fcd')
                              : t('bi.bi_dashboard_page.text_8b4b56')
                          }
                        >
                          <IconButton
                            size='small'
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePublic(dashboard);
                            }}
                            aria-label='查看'
                          >
                            {dashboard.is_public ? (
                              <Eye sx={{ width: 18, height: 18 }} />
                            ) : (
                              <EyeOff sx={{ width: 18, height: 18 }} />
                            )}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('bi.bi_dashboard_page.delete')}>
                          <IconButton
                            size='small'
                            color='error'
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDashboard(dashboard.id);
                            }}
                            aria-label='删除'
                          >
                            <Trash2 sx={{ width: 18, height: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </CardActions>
                    </Card>
                  ))}
                </Box>
              )}

              <Dialog
                open={createDialog.open}
                onClose={() => setCreateDialog({ ...createDialog, open: false })}
                maxWidth='sm'
                fullWidth
              >
                <DialogTitle>创建仪表盘</DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                  <TextField
                    label={t('bi.bi_dashboard_page.name')}
                    fullWidth
                    value={createDialog.name}
                    onChange={(e) => setCreateDialog({ ...createDialog, name: e.target.value })}
                    sx={{ mb: 3 }}
                  />
                  <TextField
                    label={t('bi.bi_dashboard_page.description')}
                    multiline
                    rows={2}
                    fullWidth
                    value={createDialog.description}
                    onChange={(e) =>
                      setCreateDialog({
                        ...createDialog,
                        description: e.target.value,
                      })
                    }
                    sx={{ mb: 3 }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <input
                      type='checkbox'
                      checked={createDialog.useTemplate}
                      onChange={(e) =>
                        setCreateDialog({
                          ...createDialog,
                          useTemplate: e.target.checked,
                          selectedTemplateId: null,
                        })
                      }
                    />
                    <Typography variant='body1'>从模板创建</Typography>
                  </Box>
                  {createDialog.useTemplate && templates.length > 0 && (
                    <Box
                      sx={{
                        border: '1px solid rgba(0,0,0,0.1)',
                        borderRadius: 1,
                        p: 2,
                      }}
                    >
                      <Typography
                        variant='body2'
                        sx={{ mb: 2, fontWeight: 500 }}
                      >
                        选择模板
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {templates.map((template) => (
                          <Box
                            key={template.id}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 2,
                              p: 2,
                              borderRadius: 1,
                              cursor: 'pointer',
                              backgroundColor:
                                createDialog.selectedTemplateId === template.id
                                  ? 'indigo.light'
                                  : 'transparent',
                              '&:hover': { backgroundColor: 'action.hover' },
                            }}
                            onClick={() =>
                              setCreateDialog({
                                ...createDialog,
                                selectedTemplateId: template.id,
                              })
                            }
                          >
                            <input
                              type='radio'
                              checked={createDialog.selectedTemplateId === template.id}
                              onChange={() =>
                                setCreateDialog({
                                  ...createDialog,
                                  selectedTemplateId: template.id,
                                })
                              }
                            />
                            <FolderOpen sx={{ color: 'indigo.main' }} />
                            <div>
                              <Typography
                                variant='body1'
                                sx={{ fontWeight: 500 }}
                              >
                                {template.name}
                              </Typography>
                              {template.description && (
                                <Typography
                                  variant='caption'
                                  sx={{ color: 'text.secondary' }}
                                >
                                  {template.description}
                                </Typography>
                              )}
                            </div>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setCreateDialog({ ...createDialog, open: false })}>
                    取消
                  </Button>
                  <Button
                    variant='contained'
                    onClick={handleCreateDashboard}
                    disabled={
                      !createDialog.name ||
                      (createDialog.useTemplate && !createDialog.selectedTemplateId)
                    }
                  >
                    创建
                  </Button>
                </DialogActions>
              </Dialog>

              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleCloseMenu}
              >
                {contextDashboard && (
                  <>
                    <MenuItem
                      onClick={() => {
                        handleOpenEditor(contextDashboard);
                        handleCloseMenu();
                      }}
                    >
                      <Edit2 sx={{ mr: 2 }} />
                      编辑
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        handleCloneDashboard(contextDashboard.id);
                        handleCloseMenu();
                      }}
                    >
                      <Copy sx={{ mr: 2 }} />
                      克隆
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        handleTogglePublic(contextDashboard);
                        handleCloseMenu();
                      }}
                    >
                      {contextDashboard.is_public ? (
                        <EyeOff sx={{ mr: 2 }} />
                      ) : (
                        <Eye sx={{ mr: 2 }} />
                      )}
                      {contextDashboard.is_public
                        ? t('bi.bi_dashboard_page.text_a81fcd')
                        : t('bi.bi_dashboard_page.text_8b4b56')}
                    </MenuItem>
                    <Divider />
                    <MenuItem
                      onClick={() => {
                        handleDeleteDashboard(contextDashboard.id);
                        handleCloseMenu();
                      }}
                      sx={{ color: 'error.main' }}
                    >
                      <Trash2 sx={{ mr: 2 }} />
                      删除
                    </MenuItem>
                  </>
                )}
              </Menu>
            </>
          )}
        </Box>
      </DashboardLayout>
    </PageContainer>
  );
};

export default BIDashboardPage;
