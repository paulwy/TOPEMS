import { useState, useEffect } from 'react';
import styles from './ReportBuilderPage.module.css';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Eye, Download, FileText, RefreshCw } from 'lucide-react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  TextField,
  Tabs,
  Tab,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Grid,
  useTheme,
} from '@mui/material';
import i18n from '@/i18n';
import { PageContainer } from '@/components/common';
import {
  DashboardTemplate,
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
} from '@/components/templates';
import { type Report } from '@/api/bi';
import { fetchReports, createReport, updateReport, deleteReport, exportReport } from '@/api/report';
import { logger } from '@/utils/logger';
import { QUERY_KEYS } from '@/lib/reactQuery';

type ViewMode = 'list' | 'builder';
const ReportBuilderPage = () => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [builderTab, setBuilderTab] = useState(0);
  const [formData, setFormData] = useState<Partial<Report>>({
    name: '',
    description: '',
    report_type: 'sales',
    type: 'sales',
    config: {},
    status: 'draft',
    format: 'excel',
  });
  const reportsQuery = useQuery<Report[]>({
    queryKey: QUERY_KEYS.AD_HOC.BI_REPORTS_BASE,
    queryFn: async () => {
      const res = await fetchReports();
      if (!res.success || !res.data) {
        throw new Error(res.message || i18n.t('bi.report_builder_page.error_load'));
      }
      return (res.data as unknown as Report[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const reports = reportsQuery.data ?? [];
  const loading = reportsQuery.isLoading;
  useEffect(() => {
    if (reportsQuery.isError) {
      logger.error('Failed to load reports:', reportsQuery.error);
    }
  }, [reportsQuery.isError, reportsQuery.error]);
  const filteredReports = reports.filter(
    (r) =>
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const handleCreate = () => {
    setSelectedReport(null);
    setFormData({
      name: '',
      description: '',
      report_type: 'sales',
      type: 'sales',
      config: {},
      status: 'draft',
      format: 'excel',
    });
    setViewMode('builder');
    setBuilderTab(0);
  };
  const handleEdit = (report: Report) => {
    setSelectedReport(report);
    setFormData(report);
    setViewMode('builder');
    setBuilderTab(0);
  };
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.BI_REPORTS_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
    onError: (error: unknown) => {
      logger.error('Failed to delete report:', error);
    },
  });
  const saveMutation = useMutation({
    mutationFn: async ({
      selectedReport,
      formData,
    }: {
      selectedReport: Report | null;
      formData: Partial<Report>;
    }) => {
      if (selectedReport) {
        return await updateReport(selectedReport.id, formData);
      }
      return await createReport(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.BI_REPORTS_BASE,
        exact: false,
        refetchType: 'active',
      });
      setViewMode('list');
    },
    onError: (error: unknown) => {
      logger.error('Failed to save report:', error);
      setViewMode('list');
    },
  });
  const exportMutation = useMutation({
    mutationFn: ({ id, format }: { id: string; format: 'pdf' | 'excel' | 'csv' | 'word' }) =>
      exportReport(id, format),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.BI_REPORTS_BASE,
        exact: false,
        refetchType: 'active',
      });
      alert(i18n.t('bi.report_builder_page.k12'));
    },
    onError: (error: unknown) => {
      logger.error('Failed to export report:', error);
      alert(i18n.t('bi.report_builder_page.k13'));
    },
  });
  const handleDelete = (id: string) => {
    if (!confirm(i18n.t('bi.report_builder_page.confirm'))) return;
    deleteMutation.mutate(id);
  };
  const handleSave = () => {
    saveMutation.mutate({ selectedReport, formData });
  };
  const handleExport = (id: string, format: 'pdf' | 'excel' | 'csv' | 'word') => {
    exportMutation.mutate({ id, format });
  };
  const getStatusChip = (status: string) => {
    const configs: Record<string, { color: 'success' | 'warning' | 'primary'; label: string }> = {
      published: { color: 'success', label: i18n.t('bi.report_builder_page.status_published') },
      draft: { color: 'warning', label: i18n.t('bi.report_builder_page.status_draft') },
      archived: { color: 'primary', label: i18n.t('bi.report_builder_page.status_archived') },
    };
    const config = configs[status] || configs.draft;
    return (
      <Chip
        label={config.label}
        size='small'
        color={config.color}
        variant='outlined'
      />
    );
  };
  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      sales: i18n.t('bi.report_builder_page.sales_report_type'),
      quality: i18n.t('bi.report_builder_page.quality_report_status'),
      inventory: i18n.t('bi.report_builder_page.inventory_report_type'),
      hr: i18n.t('bi.report_builder_page.hr_report_type'),
      finance: i18n.t('bi.report_builder_page.finance_report_type'),
      production: i18n.t('bi.report_builder_page.production'),
    };
    return types[type] || type;
  };
  const renderListView = () => {
    const reportColumns: ColumnDef<Report>[] = [
      {
        id: 'name',
        label: i18n.t('bi.report_builder_page.k16'),
        render: (report) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1,
                backgroundColor: theme.palette.warning[50],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText sx={{ color: 'warning.main', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ fontWeight: 600 }}
              >
                {report.name}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {report.description}
              </Typography>
            </Box>
          </Box>
        ),
      },
      {
        id: 'type',
        label: i18n.t('bi.report_builder_page.k17'),
        render: (report) => getTypeLabel(report.type || ''),
      },
      {
        id: 'format',
        label: i18n.t('bi.report_builder_page.k18'),
        render: (report) => (
          <Chip
            label={report.format?.toUpperCase()}
            size='small'
            variant='outlined'
          />
        ),
      },
      {
        id: 'status',
        label: i18n.t('bi.report_builder_page.k19'),
        render: (report) => getStatusChip(report.status || 'draft'),
      },
      {
        id: 'created_by',
        label: i18n.t('bi.report_builder_page.k20'),
        render: (report) => report.created_by || '-',
      },
      {
        id: 'updated_at',
        label: i18n.t('bi.report_builder_page.k21'),
        render: (report) =>
          report.updated_at ? new Date(report.updated_at).toLocaleDateString() : '-',
      },
    ];
    const reportRowActions: RowAction<Report>[] = [
      {
        key: 'edit',
        label: i18n.t('bi.report_builder_page.edit'),
        icon: <Edit2 size={16} />,
        onClick: (report) => handleEdit(report),
      },
      {
        key: 'export',
        label: i18n.t('bi.report_builder_page.export'),
        icon: <Download size={16} />,
        onClick: (report) => handleExport(report.id, report.format as 'excel' | 'pdf'),
      },
      {
        key: 'delete',
        label: i18n.t('bi.report_builder_page.delete'),
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (report) => handleDelete(report.id),
      },
    ];
    return (
      <Box sx={{ p: 3 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 4,
          }}
        >
          <Typography
            variant='h4'
            sx={{ fontWeight: 700 }}
          >
            {i18n.t('pages.report_builder_page.k0')}
          </Typography>
          <Button
            variant='contained'
            startIcon={<Plus />}
            onClick={handleCreate}
          >
            {i18n.t('pages.report_builder_page.k1')}
          </Button>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <TextField
            placeholder={i18n.t('bi.report_builder_page.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size='small'
            sx={{ width: 300 }}
          />
          <Button
            variant='outlined'
            size='small'
            startIcon={<RefreshCw size={16} />}
            onClick={() => reportsQuery.refetch()}
          >
            {i18n.t('pages.report_builder_page.k2')}
          </Button>
        </Box>
        <ListPageTemplate
          columns={reportColumns}
          data={filteredReports}
          loading={loading}
          getRowId={(row) => row.id}
          rowActions={reportRowActions}
          emptyMessage={i18n.t('bi.report_builder_page.k15')}
          emptyIcon={<FileText sx={{ width: 64, height: 64, opacity: 0.5 }} />}
          emptyActionButton={{
            label: i18n.t('pages.report_builder_page.k3'),
            icon: <Plus />,
            onClick: handleCreate,
          }}
        />
      </Box>
    );
  };
  const renderBuilderView = () => (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant='outlined'
            size='small'
            onClick={() => setViewMode('list')}
          >
            {i18n.t('pages.report_builder_page.k4')}
          </Button>
          <Typography
            variant='h5'
            sx={{ fontWeight: 600 }}
          >
            {selectedReport
              ? i18n.t('bi.report_builder_page.edit_1')
              : i18n.t('bi.report_builder_page.create')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant='outlined'
            startIcon={<Eye size={16} />}
          >
            {i18n.t('pages.report_builder_page.k5')}
          </Button>
          <Button
            variant='outlined'
            onClick={() => setViewMode('list')}
          >
            {i18n.t('pages.report_builder_page.k6')}
          </Button>
          <Button
            variant='contained'
            onClick={handleSave}
          >
            {i18n.t('pages.report_builder_page.k7')}
          </Button>
        </Box>
      </Box>
      <Card
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider' }}
      >
        <CardContent>
          <Tabs
            value={builderTab}
            onChange={(_, v) => setBuilderTab(v)}
            sx={{ mb: 3 }}
          >
            <Tab label={i18n.t('bi.report_builder_page.info')} />
            <Tab label={i18n.t('bi.report_builder_page.datasource_tab')} />
            <Tab label={i18n.t('bi.report_builder_page.field_config_tab')} />
            <Tab label={i18n.t('bi.report_builder_page.schedule_tab')} />
          </Tabs>
          {builderTab === 0 && (
            <Box sx={{ maxWidth: 600 }}>
              <TextField
                fullWidth
                label={i18n.t('bi.report_builder_page.name')}
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                sx={{ mb: 3 }}
              />
              <TextField
                fullWidth
                label={i18n.t('bi.report_builder_page.description')}
                multiline
                rows={3}
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                sx={{ mb: 3 }}
              />
              <FormControl
                fullWidth
                sx={{ mb: 3 }}
              >
                <InputLabel>{i18n.t('bi.report_builder_page.k23')}</InputLabel>
                <Select
                  value={formData.type || 'sales'}
                  label={i18n.t('bi.report_builder_page.type')}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value, report_type: e.target.value })
                  }
                >
                  <MenuItem value='sales'>{i18n.t('bi.report_builder_page.k24')}</MenuItem>
                  <MenuItem value='quality'>{i18n.t('bi.report_builder_page.k25')}</MenuItem>
                  <MenuItem value='inventory'>{i18n.t('bi.report_builder_page.k26')}</MenuItem>
                  <MenuItem value='hr'>{i18n.t('bi.report_builder_page.k27')}</MenuItem>
                  <MenuItem value='finance'>{i18n.t('bi.report_builder_page.k28')}</MenuItem>
                  <MenuItem value='production'>{i18n.t('bi.report_builder_page.k29')}</MenuItem>
                </Select>
              </FormControl>
              <FormControl
                fullWidth
                sx={{ mb: 3 }}
              >
                <InputLabel>{i18n.t('bi.report_builder_page.k30')}</InputLabel>
                <Select
                  value={formData.format || 'excel'}
                  label={i18n.t('bi.report_builder_page.default_format_label')}
                  onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                >
                  <MenuItem value='excel'>Excel</MenuItem>
                  <MenuItem value='pdf'>PDF</MenuItem>
                  <MenuItem value='csv'>CSV</MenuItem>
                  <MenuItem value='word'>Word</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>{i18n.t('bi.report_builder_page.k31')}</InputLabel>
                <Select
                  value={formData.status || 'draft'}
                  label={i18n.t('bi.report_builder_page.status')}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as 'draft' | 'published' | 'archived',
                    })
                  }
                >
                  <MenuItem value='draft'>{i18n.t('bi.report_builder_page.k32')}</MenuItem>
                  <MenuItem value='published'>{i18n.t('bi.report_builder_page.k33')}</MenuItem>
                  <MenuItem value='archived'>{i18n.t('bi.report_builder_page.k34')}</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
          {builderTab === 1 && (
            <Box>
              <Typography
                variant='subtitle1'
                sx={{ mb: 2 }}
              >
                {i18n.t('pages.report_builder_page.k8')}
              </Typography>
              <Grid
                container
                spacing={2}
              >
                {[
                  {
                    name: i18n.t('bi.report_builder_page.monthly_sales_report'),
                    desc: i18n.t('bi.report_builder_page.sales_report_desc'),
                  },
                  {
                    name: i18n.t('bi.report_builder_page.quality_weekly_report'),
                    desc: i18n.t('bi.report_builder_page.quality_report_desc'),
                  },
                  {
                    name: i18n.t('bi.report_builder_page.inventory_monthly_report'),
                    desc: i18n.t('bi.report_builder_page.inventory_report_desc'),
                  },
                  {
                    name: i18n.t('bi.report_builder_page.hr_monthly_report'),
                    desc: i18n.t('bi.report_builder_page.hr_report_desc'),
                  },
                ].map((template, idx) => (
                  <Grid
                    size={{ xs: 12, sm: 6, md: 3 }}
                    key={idx}
                  >
                    <Card
                      sx={{
                        cursor: 'pointer',
                        border: idx === 0 ? '2px solid indigo.main' : '1px solid',
                        borderColor: idx === 0 ? 'primary.main' : 'divider',
                        transition: 'all 0.3s',
                        '&:hover': {
                          boxShadow: 2,
                        },
                      }}
                    >
                      <CardContent>
                        <Box
                          sx={{
                            height: 100,
                            backgroundColor: theme.palette.grey[50],
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 2,
                          }}
                        >
                          <FileText
                            size={32}
                            style={{ color: theme.palette.grey[500] }}
                          />
                        </Box>
                        <Typography
                          variant='subtitle2'
                          sx={{ fontWeight: 600 }}
                        >
                          {template.name}
                        </Typography>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {template.desc}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
          {builderTab === 2 && (
            <Box>
              <Typography
                variant='subtitle1'
                sx={{ mb: 2 }}
              >
                {i18n.t('pages.report_builder_page.k9')}
              </Typography>
              <FormControl
                fullWidth
                sx={{ mb: 3, maxWidth: 400 }}
              >
                <InputLabel>{i18n.t('bi.report_builder_page.k35')}</InputLabel>
                <Select
                  value=''
                  label={i18n.t('bi.report_builder_page.select_dataset_label')}
                  onChange={() => {}}
                >
                  <MenuItem value='ds-001'>{i18n.t('bi.report_builder_page.k36')}</MenuItem>
                  <MenuItem value='ds-002'>{i18n.t('bi.report_builder_page.k37')}</MenuItem>
                  <MenuItem value='ds-003'>{i18n.t('bi.report_builder_page.k38')}</MenuItem>
                </Select>
              </FormControl>
              <Box sx={{ mt: 3, p: 3, backgroundColor: theme.palette.grey[50], borderRadius: 1 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('pages.report_builder_page.k10')}
                </Typography>
              </Box>
            </Box>
          )}
          {builderTab === 3 && (
            <Box sx={{ maxWidth: 600 }}>
              <Typography
                variant='subtitle1'
                sx={{ mb: 2 }}
              >
                {i18n.t('pages.report_builder_page.k11')}
              </Typography>
              <FormControl
                fullWidth
                sx={{ mb: 3 }}
              >
                <InputLabel>{i18n.t('bi.report_builder_page.k39')}</InputLabel>
                <Select
                  value='daily'
                  label={i18n.t('bi.report_builder_page.execution_frequency_label')}
                  onChange={() => {}}
                >
                  <MenuItem value='daily'>{i18n.t('bi.report_builder_page.k40')}</MenuItem>
                  <MenuItem value='weekly'>{i18n.t('bi.report_builder_page.k41')}</MenuItem>
                  <MenuItem value='monthly'>{i18n.t('bi.report_builder_page.k42')}</MenuItem>
                  <MenuItem value='hourly'>{i18n.t('bi.report_builder_page.k43')}</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label={i18n.t('bi.report_builder_page.time')}
                type='time'
                value='08:00'
                sx={{ mb: 3 }}
              />
              <TextField
                fullWidth
                label={i18n.t('bi.report_builder_page.email')}
                placeholder={i18n.t('bi.report_builder_page.email_1')}
                sx={{ mb: 3 }}
              />
              <Box sx={{ mt: 3, p: 3, backgroundColor: theme.palette.grey[50], borderRadius: 1 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('pages.report_builder_page.k12')}
                </Typography>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
  return (
    <PageContainer
      title={i18n.t('bi.report_builder_page.report_builder_title')}
      subtitle={i18n.t('bi.report_builder_page.create_1')}
      headerProps={{
        pageIcon: <FileText className={styles.il1} />,
        pageGradient: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
      }}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        autoTitle={false}
        title=''
        subtitle=''
        breadcrumbs={[
          { label: i18n.t('bi.report_builder_page.home'), href: '/dashboard' },
          { label: 'BI' },
          { label: i18n.t('bi.report_builder_page.report_tab') },
        ]}
      >
        {viewMode === 'list' ? renderListView() : renderBuilderView()}
      </DashboardTemplate>
    </PageContainer>
  );
};
export default ReportBuilderPage;
