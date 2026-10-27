import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Edit2,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  LayoutDashboard,
  FolderOpen,
  BarChart3,
} from 'lucide-react';
import i18n from '@/i18n';
import {
  Box,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  useTheme,
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
import { CardListTemplate, type CardRenderConfig, type CardAction } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { logger } from '@/utils/logger';
import { QUERY_KEYS } from '@/lib/reactQuery';

type ViewMode = 'list' | 'editor';
type TabType = 'dashboards' | 'templates';
interface CreateDialogState {
  open: boolean;
  useTemplate: boolean;
  selectedTemplateId: string | null;
  name: string;
  description: string;
}
const BIDashboardPage = () => {
  const theme = useTheme();
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
  const dashboardsQuery = useQuery<Dashboard[]>({
    queryKey: QUERY_KEYS.AD_HOC.BI_DASHBOARDS_BASE,
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
    queryKey: QUERY_KEYS.AD_HOC.BI_DASHBOARD_TEMPLATES_BASE,
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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.BI_DASHBOARDS_BASE,
        exact: false,
        refetchType: 'active',
      });
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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.BI_DASHBOARDS_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
    onError: (error: unknown) => {
      logger.error('Failed to delete dashboard:', error);
    },
  });
  const cloneMutation = useMutation({
    mutationFn: (id: string) => cloneDashboard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.BI_DASHBOARDS_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
    onError: (error: unknown) => {
      logger.error('Failed to clone dashboard:', error);
    },
  });
  const togglePublicMutation = useMutation({
    mutationFn: (dashboard: Dashboard) =>
      updateDashboard(dashboard.id, { is_public: !dashboard.is_public }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.BI_DASHBOARDS_BASE,
        exact: false,
        refetchType: 'active',
      });
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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.BI_DASHBOARDS_BASE,
        exact: false,
        refetchType: 'active',
      });
      setViewMode('list');
    },
    onError: (error: unknown) => {
      logger.error('Failed to save dashboard:', error);
    },
  });
  const handleCreateDashboard = () => {
    const data: Partial<Dashboard> = {
      name: createDialog.name || i18n.t('bi.bi_dashboard_page.name_label'),
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
    if (!confirm(i18n.t('bi.bi_dashboard_page.confirm'))) return;
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

  // CardListTemplate 配置
  const cardConfig: CardRenderConfig = {
    title: (item) => (item as unknown as Dashboard).name,
    description: (item) => (item as unknown as Dashboard).description || '',
    icon: <LayoutDashboard />,
    iconBgColor: 'indigo.light',
    meta: [
      {
        field: 'created_at',
        label: '',
        format: (value) => new Date(value as string).toLocaleDateString(),
      },
    ],
    status: {
      field: 'is_public',
      options: {
        true: { label: i18n.t('bi.bi_dashboard_page.public_badge'), color: 'primary' },
      },
    },
  };

  const cardActions: CardAction[] = [
    {
      label: i18n.t('bi.bi_dashboard_page.edit'),
      icon: <Edit2 />,
      onClick: (item) => handleOpenEditor(item as unknown as Dashboard),
    },
    {
      label: i18n.t('bi.bi_dashboard_page.clone'),
      icon: <Copy />,
      onClick: (item) => handleCloneDashboard((item as unknown as Dashboard).id),
    },
    {
      label: i18n.t('bi.bi_dashboard_page.visibility'),
      icon: (item) => ((item as unknown as Dashboard).is_public ? <Eye /> : <EyeOff />),
      onClick: (item) => handleTogglePublic(item as unknown as Dashboard),
    },
    {
      label: i18n.t('bi.bi_dashboard_page.delete'),
      icon: <Trash2 />,
      color: 'error',
      onClick: (item) => handleDeleteDashboard((item as unknown as Dashboard).id),
    },
  ];

  return (
    <PageContainer
      title={i18n.t('bi.bi_dashboard_page.bi_heading')}
      subtitle={i18n.t('bi.bi_dashboard_page.subtitle')}
      headerProps={{
        pageIcon: <BarChart3 style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${theme.palette.secondary[400]} 0%, ${theme.palette.secondary[600]} 100%)`,
      }}
      padding={false}
      maxWidth={false}
    >
      <Box sx={{ p: 3 }}>
        {/* Tab 栏 */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{ minWidth: 200 }}
          >
            <Tab
              value='dashboards'
              label={i18n.t('bi.bi_dashboard_page.dashboard_tab')}
              icon={<LayoutDashboard size={18} />}
              iconPosition='start'
            />
            <Tab
              value='templates'
              label={i18n.t('bi.bi_dashboard_page.template_tab')}
              icon={<FolderOpen size={18} />}
              iconPosition='start'
            />
          </Tabs>
        </Box>

        {activeTab === 'templates' ? (
          <DashboardTemplateManager
            onDashboardCreated={() => {
              setActiveTab('dashboards');
              queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.AD_HOC.BI_DASHBOARDS_BASE,
                exact: false,
                refetchType: 'active',
              });
            }}
          />
        ) : (
          <CardListTemplate
            title=''
            subtitle=''
            data={filteredDashboards as unknown as Record<string, unknown>[]}
            cardConfig={cardConfig}
            cardActions={cardActions}
            loading={loading}
            search={{
              value: searchTerm,
              onChange: setSearchTerm,
              placeholder: i18n.t('bi.bi_dashboard_page.search'),
            }}
            addButton={{
              text: i18n.t('pages.bi_dashboard_page.k0'),
              icon: <Plus />,
              onClick: () => setCreateDialog({ ...createDialog, open: true }),
            }}
            emptyState={{
              title: i18n.t('bi.bi_dashboard_page.k0'),
              description: i18n.t('bi.bi_dashboard_page.k1'),
              actionLabel: i18n.t('pages.bi_dashboard_page.k3'),
              onAction: () => setCreateDialog({ ...createDialog, open: true }),
            }}
            onCardClick={(item) => handleOpenEditor(item as unknown as Dashboard)}
            gridColumns={{ xs: 1, sm: 1, md: 1, lg: 1, xl: 3 }}
            showStatsOverview={false}
            showViewToggle={false}
          />
        )}
      </Box>

      {/* 创建 Dialog（保留：含模板单选列表，模板不提供） */}
      <Dialog
        open={createDialog.open}
        onClose={() => setCreateDialog({ ...createDialog, open: false })}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{i18n.t('bi.bi_dashboard_page.k6')}</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <TextField
            label={i18n.t('bi.bi_dashboard_page.name')}
            fullWidth
            value={createDialog.name}
            onChange={(e) => setCreateDialog({ ...createDialog, name: e.target.value })}
            sx={{ mb: 3 }}
          />
          <TextField
            label={i18n.t('bi.bi_dashboard_page.description')}
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
            <Typography variant='body1'>{i18n.t('bi.bi_dashboard_page.k7')}</Typography>
          </Box>
          {createDialog.useTemplate && templates.length > 0 && (
            <Box
              sx={{
                border: `1px solid ${theme.palette.action.selected}`,
                borderRadius: 1,
                p: 2,
              }}
            >
              <Typography
                variant='body2'
                sx={{ mb: 2, fontWeight: 500 }}
              >
                {i18n.t('pages.bi_dashboard_page.k4')}
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
            {i18n.t('pages.bi_dashboard_page.k5')}
          </Button>
          <Button
            variant='contained'
            onClick={handleCreateDashboard}
            disabled={
              !createDialog.name || (createDialog.useTemplate && !createDialog.selectedTemplateId)
            }
          >
            {i18n.t('pages.bi_dashboard_page.k6')}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};
export default BIDashboardPage;
