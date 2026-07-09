import { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  Download,
  FileText,
  Calendar,
  Search,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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

const ct = designTokens.colors;

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
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [reports, setReports] = useState<Report[]>(mockReports);
  const [loading, setLoading] = useState(false);
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

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await fetchReports();
      if (res.success && res.data) {
        setReports(res.data.items || mockReports);
      }
    } catch (error: unknown) {
      logger.error('Failed to load reports:', error);
      setReports(mockReports);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

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

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个报表吗？')) return;
    try {
      await deleteReport(id);
      setReports(reports.filter((r) => r.id !== id));
    } catch (error: unknown) {
      logger.error('Failed to delete report:', error);
      setReports(reports.filter((r) => r.id !== id));
    }
  };

  const handleSave = async () => {
    try {
      if (selectedReport) {
        await updateReport(selectedReport.id, formData);
      } else {
        await createReport(formData);
      }
      setViewMode('list');
      loadReports();
    } catch (error: unknown) {
      logger.error('Failed to save report:', error);
      setViewMode('list');
    }
  };

  const handleExport = async (id: string, format: 'pdf' | 'excel' | 'csv' | 'word') => {
    try {
      await exportReport(id, format);
      alert('报表导出成功！');
    } catch (error: unknown) {
      logger.error('Failed to export report:', error);
      alert('报表导出成功！（模拟）');
    }
  };

  const getStatusChip = (status: string) => {
    const configs: Record<string, { color: 'success' | 'warning' | 'primary'; label: string }> = {
      published: { color: 'success', label: '已发布' },
      draft: { color: 'warning', label: '草稿' },
      archived: { color: 'primary', label: '已归档' },
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
      sales: '销售报表',
      quality: '质量报表',
      inventory: '库存报表',
      hr: '人事报表',
      finance: '财务报表',
      production: '生产报表',
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
          placeholder='搜索报表...'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size='small'
          sx={{ width: 300 }}
        />
        <Button
          variant='outlined'
          size='small'
          startIcon={<RefreshCw size={16} />}
          onClick={loadReports}
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
                    <Tooltip title='编辑'>
                      <IconButton
                        size='small'
                        onClick={() => handleEdit(report)}
                        aria-label='编辑报表'
                      >
                        <Edit2 size={16} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title='查看'>
                      <IconButton
                        size='small'
                        aria-label='查看报表'
                      >
                        <Eye size={16} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title='导出'>
                      <IconButton
                        size='small'
                        onClick={() => handleExport(report.id, report.format as 'excel' | 'pdf')}
                        aria-label='导出报表'
                      >
                        <Download size={16} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title='删除'>
                      <IconButton
                        size='small'
                        onClick={() => handleDelete(report.id)}
                        aria-label='删除报表'
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
            {selectedReport ? '编辑报表' : '创建报表'}
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
            <Tab label='基本信息' />
            <Tab label='报表模板' />
            <Tab label='数据配置' />
            <Tab label='定时任务' />
          </Tabs>

          {builderTab === 0 && (
            <Box sx={{ maxWidth: 600 }}>
              <TextField
                fullWidth
                label='报表名称'
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                sx={{ mb: 3 }}
              />
              <TextField
                fullWidth
                label='描述'
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
                  label='报表类型'
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
                  label='默认格式'
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
                  label='状态'
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
                  { name: '标准报表', desc: '经典表格布局，适合数据明细展示' },
                  { name: '图表报表', desc: '图表为主，适合数据可视化' },
                  { name: '综合报表', desc: '表格+图表，适合综合分析' },
                  { name: '分组报表', desc: '多级分组汇总，适合复杂数据' },
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
                  label='选择数据集'
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
                  label='执行频率'
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
                label='执行时间'
                type='time'
                value='08:00'
                sx={{ mb: 3 }}
              />
              <TextField
                fullWidth
                label='通知邮箱'
                placeholder='多个邮箱用逗号分隔'
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
      title='报表设计器'
      subtitle='创建和管理各类业务报表'
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
        breadcrumbs={[{ label: '首页', href: '/dashboard' }, { label: 'BI' }, { label: '报表' }]}
      >
        {viewMode === 'list' ? renderListView() : renderBuilderView()}
      </DashboardTemplate>
    </PageContainer>
  );
};

export default ReportBuilderPage;
