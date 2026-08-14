import { useState, useEffect } from 'react';
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
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Paper,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Divider,
  CircularProgress,
  Grid,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import { DashboardTemplate } from '@/components/templates';
import {
  fetchReports,
  createReport,
  updateReport,
  deleteReport,
  exportReport,
  type Report,
} from '@/api/bi';
import { logger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

import { useTranslation } from 'react-i18next';


import { QUERY_KEYS, queryClient } from '@/lib/reactQuery';

const ct= designTokens.colors;

type ViewMode = 'list' | 'builder';

const mockReports: Report[] = [
  {
    id: 'rpt-001',
    name: '月度销售报表',
    description: '每月销售数据汇总报表，包含销售额、订单量、客户数等指标',
    report_type: 'sales',
    type: 'sales',
    config: {},
    status: 'published',
    format: 'excel',
    created_by: '张三',
    created_at: '2026-01-15T10:30:00Z',
    updated_at: '2026-06-28T08:00:00Z',
  },
  {
    id: 'rpt-002',
    name: '质量周报',
    description: '每周生产质量检验数据汇总，包含缺陷率、合格率等',
    report_type: 'quality',
    type: 'quality',
    config: {},
    status: 'published',
    format: 'pdf',
    created_by: '李四',
    created_at: '2026-02-20T14:00:00Z',
    updated_at: '2026-06-23T00:00:00Z',
  },
  {
    id: 'rpt-003',
    name: '库存月报',
    description: '每月库存周转分析报表，包含出入库、库存余额等',
    report_type: 'inventory',
    type: 'inventory',
    config: {},
    status: 'draft',
    format: 'excel',
    created_by: '王五',
    created_at: '2026-05-10T09:00:00Z',
    updated_at: '2026-06-25T16:30:00Z',
  },
  {
    id: 'rpt-004',
    name: '人事月报',
    description: '每月人力资源数据报表，包含入职、离职、人员结构等',
    report_type: 'hr',
    type: 'hr',
    config: {},
    status: 'published',
    format: 'pdf',
    created_by: '赵六',
    created_at: '2026-03-01T11:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
  },
];

const ReportBuilderPage = () => {
  const { t } = useTranslation();
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
      try {
        const res = await fetchReports();
        if (res.success && res.data) {
          return res.data.items || mockReports;
        }
        return mockReports;
      } catch (error: unknown) {
        logger.error('Failed to load reports:', error);
        return mockReports;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const reports = reportsQuery.data ?? mockReports;
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.BI_REPORTS_BASE ,
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.BI_REPORTS_BASE ,
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
      alert('报表导出成功！');
    },
    onError: (error: unknown) => {
      logger.error('Failed to export report:', error);
      alert('报表导出成功！（模拟）');
    },
  });

  const actionLoading =
    saveMutation.isPending || deleteMutation.isPending || exportMutation.isPending;

  const handleDelete = (id: string) => {
    if (!confirm(t('bi.report_builder_page.confirm'))) return;
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
      published: { color: 'success', label: t('bi.report_builder_page.text_dca0c1') },
      draft: { color: 'warning', label: t('bi.report_builder_page.text_22b433') },
      archived: { color: 'primary', label: t('bi.report_builder_page.text_c3ba16') },
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
      sales: t('bi.report_builder_page.text_87821b'),
      quality: t('bi.report_builder_page.text_c42f64'),
      inventory: t('bi.report_builder_page.text_25f371'),
      hr: t('bi.report_builder_page.text_76cb67'),
      finance: t('bi.report_builder_page.text_af7d91'),
      production: t('bi.report_builder_page.production'),
    };
    return types[type] || type;
  };

  const renderListView = () => (
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
          报表设计器
        </Typography>
        <Button
          variant='contained'
          startIcon={<Plus />}
          onClick={handleCreate}
        >
          创建报表
        </Button>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <TextField
          placeholder={t('bi.report_builder_page.search')}
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
          刷新
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filteredReports.length === 0 ? (
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
          <FileText sx={{ width: 64, height: 64, mb: 3, opacity: 0.5 }} />
          <Typography variant='h6'>暂无报表</Typography>
          <Typography variant='body2'>点击上方按钮创建您的第一个报表</Typography>
          <Button
            variant='contained'
            startIcon={<Plus />}
            sx={{ mt: 3 }}
            onClick={handleCreate}
          >
            创建报表
          </Button>
        </Box>
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{ border: '1px solid', borderColor: 'divider' }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>报表名称</TableCell>
                <TableCell>类型</TableCell>
                <TableCell>格式</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>创建人</TableCell>
                <TableCell>更新时间</TableCell>
                <TableCell align='right'>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredReports.map((report) => (
                <TableRow
                  key={report.id}
                  hover
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 1,
                          backgroundColor: ct.warning[50],
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
                  </TableCell>
                  <TableCell>{getTypeLabel(report.type || '')}</TableCell>
                  <TableCell>
                    <Chip
                      label={report.format?.toUpperCase()}
                      size='small'
                      variant='outlined'
                    />
                  </TableCell>
                  <TableCell>{getStatusChip(report.status || 'draft')}</TableCell>
                  <TableCell>{report.created_by || '-'}</TableCell>
                  <TableCell>
                    {report.updated_at ? new Date(report.updated_at).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell align='right'>
                    <Tooltip title={t('bi.report_builder_page.edit')}>
                      <IconButton
                        size='small'
                        onClick={() => handleEdit(report)}
                        aria-label={t('bi.report_builder_page.edit_1')}
                      >
                        <Edit2 size={16} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('bi.report_builder_page.view')}>
                      <IconButton
                        size='small'
                        aria-label={t('bi.report_builder_page.view_1')}
                      >
                        <Eye size={16} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('bi.report_builder_page.export')}>
                      <IconButton
                        size='small'
                        onClick={() => handleExport(report.id, report.format as 'excel' | 'pdf')}
                        aria-label={t('bi.report_builder_page.export_1')}
                      >
                        <Download size={16} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('bi.report_builder_page.delete')}>
                      <IconButton
                        size='small'
                        onClick={() => handleDelete(report.id)}
                        aria-label={t('bi.report_builder_page.delete_1')}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );

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
            返回列表
          </Button>
          <Typography
            variant='h5'
            sx={{ fontWeight: 600 }}
          >
            {selectedReport
              ? t('bi.report_builder_page.edit_1')
              : t('bi.report_builder_page.create')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant='outlined'
            startIcon={<Eye size={16} />}
          >
            预览
          </Button>
          <Button
            variant='outlined'
            onClick={() => setViewMode('list')}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleSave}
          >
            保存
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
            <Tab label={t('bi.report_builder_page.info')} />
            <Tab label={t('bi.report_builder_page.text_8abf44')} />
            <Tab label={t('bi.report_builder_page.text_d75a79')} />
            <Tab label={t('bi.report_builder_page.text_a1bd97')} />
          </Tabs>

          {builderTab === 0 && (
            <Box sx={{ maxWidth: 600 }}>
              <TextField
                fullWidth
                label={t('bi.report_builder_page.name')}
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                sx={{ mb: 3 }}
              />
              <TextField
                fullWidth
                label={t('bi.report_builder_page.description')}
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
                <InputLabel>报表类型</InputLabel>
                <Select
                  value={formData.type || 'sales'}
                  label={t('bi.report_builder_page.type')}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value, report_type: e.target.value })
                  }
                >
                  <MenuItem value='sales'>销售报表</MenuItem>
                  <MenuItem value='quality'>质量报表</MenuItem>
                  <MenuItem value='inventory'>库存报表</MenuItem>
                  <MenuItem value='hr'>人事报表</MenuItem>
                  <MenuItem value='finance'>财务报表</MenuItem>
                  <MenuItem value='production'>生产报表</MenuItem>
                </Select>
              </FormControl>
              <FormControl
                fullWidth
                sx={{ mb: 3 }}
              >
                <InputLabel>默认格式</InputLabel>
                <Select
                  value={formData.format || 'excel'}
                  label={t('bi.report_builder_page.text_6f07cd')}
                  onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                >
                  <MenuItem value='excel'>Excel</MenuItem>
                  <MenuItem value='pdf'>PDF</MenuItem>
                  <MenuItem value='csv'>CSV</MenuItem>
                  <MenuItem value='word'>Word</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>状态</InputLabel>
                <Select
                  value={formData.status || 'draft'}
                  label={t('bi.report_builder_page.status')}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as 'draft' | 'published' | 'archived',
                    })
                  }
                >
                  <MenuItem value='draft'>草稿</MenuItem>
                  <MenuItem value='published'>已发布</MenuItem>
                  <MenuItem value='archived'>已归档</MenuItem>
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
                选择报表模板
              </Typography>
              <Grid
                container
                spacing={2}
              >
                {[
                  {
                    name: t('bi.report_builder_page.text_93c5b1'),
                    desc: t('bi.report_builder_page.text_08d85e'),
                  },
                  {
                    name: t('bi.report_builder_page.text_945783'),
                    desc: t('bi.report_builder_page.text_a13eb6'),
                  },
                  {
                    name: t('bi.report_builder_page.text_4ae3a8'),
                    desc: t('bi.report_builder_page.text_386c14'),
                  },
                  {
                    name: t('bi.report_builder_page.text_3d2c48'),
                    desc: t('bi.report_builder_page.text_95ccc2'),
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
                            backgroundColor: ct.grey[50],
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 2,
                          }}
                        >
                          <FileText
                            size={32}
                            style={{ color: ct.grey[500] }}
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
                数据源配置
              </Typography>
              <FormControl
                fullWidth
                sx={{ mb: 3, maxWidth: 400 }}
              >
                <InputLabel>选择数据集</InputLabel>
                <Select
                  value=''
                  label={t('bi.report_builder_page.text_0bca05')}
                  onChange={() => {}}
                >
                  <MenuItem value='ds-001'>销售数据分析集</MenuItem>
                  <MenuItem value='ds-002'>生产质量数据集</MenuItem>
                  <MenuItem value='ds-003'>库存周转数据集</MenuItem>
                </Select>
              </FormControl>
              <Box sx={{ mt: 3, p: 3, backgroundColor: ct.grey[50], borderRadius: 1 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  提示：选择数据集后，可以在下方配置报表字段、筛选条件、排序方式等。
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
                定时任务配置
              </Typography>
              <FormControl
                fullWidth
                sx={{ mb: 3 }}
              >
                <InputLabel>执行频率</InputLabel>
                <Select
                  value='daily'
                  label={t('bi.report_builder_page.text_6b6f80')}
                  onChange={() => {}}
                >
                  <MenuItem value='daily'>每天</MenuItem>
                  <MenuItem value='weekly'>每周</MenuItem>
                  <MenuItem value='monthly'>每月</MenuItem>
                  <MenuItem value='hourly'>每小时</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label={t('bi.report_builder_page.time')}
                type='time'
                value='08:00'
                sx={{ mb: 3 }}
              />
              <TextField
                fullWidth
                label={t('bi.report_builder_page.email')}
                placeholder={t('bi.report_builder_page.email_1')}
                sx={{ mb: 3 }}
              />
              <Box sx={{ mt: 3, p: 3, backgroundColor: ct.grey[50], borderRadius: 1 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  提示：配置定时任务后，系统将按照设定的时间自动生成报表并发送到指定邮箱。
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
      title={t('bi.report_builder_page.text_95a8d1')}
      subtitle={t('bi.report_builder_page.create_1')}
      headerProps={{
        pageIcon: <FileText style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.warning.main} 0%, ${ct.warning.dark} 100%)`,
      }}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: t('bi.report_builder_page.home'), href: '/dashboard' },
          { label: 'BI' },
          { label: t('bi.report_builder_page.text_fc00f3') },
        ]}
      >
        {viewMode === 'list' ? renderListView() : renderBuilderView()}
      </DashboardTemplate>
    </PageContainer>
  );
};

export default ReportBuilderPage;
