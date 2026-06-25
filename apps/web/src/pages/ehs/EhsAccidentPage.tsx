import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Card,
  CardContent,
  CardHeader,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Button } from '@mui/material';
import {
  Plus,
  Eye,
  AlertCircle,
  AlertTriangle,
  FileText,
  Search,
  MapPin,
  User,
  Calendar,
  Trash2,
  Edit3,
} from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { ehsApi } from '@/api/ehs';
import type { Accident, AccidentDetail } from '@/api/ehs';
import { useAppStore } from '@/store';
import { apiLogger } from '@/utils/logger';

const EhsAccidentPage: React.FC = () => {
  const navigate = useNavigate();
  const [accidents, setAccidents] = useState<Accident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAccident, setSelectedAccident] = useState<AccidentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [formData, setFormData] = useState({

    title: '',
    description: '',
    accident_type: '',
    severity: 'minor',
    location: '',
    occurred_at: '',
    reported_by: '',
    casualties: 0,
    economic_loss: 0,
  });
  const addNotification = useAppStore((state) => state.addNotification);

  useEffect(() => {
    loadAccidents();
  }, []);

  const loadAccidents = async () => {
    try {
      setLoading(true);
      const response = await ehsApi.listAccidents({ page_size: 100 });
      if (response.success && response.data) {
        const data = response.data as any;
        const accidentsData = Array.isArray(data) ? data : data.data || [];
        const adapted = accidentsData.map((item: Accident) => ({
          ...item,
          status: translateStatus(item.status),
          severity: translateSeverity(item.severity),
        }));
        setAccidents(adapted);
      } else {
        setAccidents([]);
      }
    } catch (err: unknown) {
      apiLogger.error('加载事故记录失败:', err);
      addNotification({ title: '错误', message: '加载事故记录失败', type: 'error' });
      setAccidents([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAccidentDetail = async (accidentId: string) => {
    try {
      setDetailLoading(true);
      const response = await ehsApi.getAccident(accidentId);
      if (response.success && response.data) {
        const data = response.data as any;
        const detailData: AccidentDetail = {
          ...data,
          accident: {
            ...data.accident,
            status: translateStatus(data.accident.status),
            severity: translateSeverity(data.accident.severity),
          },
        };
        setSelectedAccident(detailData);
      }
    } catch (err: unknown) {
      apiLogger.error('加载事故详情失败:', err);
      addNotification({ title: '错误', message: '加载事故详情失败', type: 'error' });
    } finally {
      setDetailLoading(false);
    }
  };

  const translateStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '待处理',
      investigating: '调查中',
      processing: '处理中',
      resolved: '已解决',
      closed: '已结案',
    };
    return statusMap[status] || status;
  };

  const translateSeverity = (severity: string) => {
    const severityMap: Record<string, string> = {
      minor: '轻微',
      moderate: '一般',
      serious: '严重',
      fatal: '致命',
    };
    return severityMap[severity] || severity;
  };

  const getSeverityBadge = (severity: string) => {
    const severityMap: Record<string, { bg: string; color: string }> = {
      轻微: { bg: 'success.lighter', color: 'success.dark' },
      一般: { bg: '#fef9c3', color: '#ca8a04' },
      严重: { bg: 'error.lighter', color: 'error.dark' },
      致命: { bg: 'error.light', color: 'error.darker' },
    };
    const colors = severityMap[severity] || { bg: 'grey.100', color: 'text.secondary' };
    return (
      <Chip
        label={severity}
        size='small'
        sx={{
          backgroundColor: colors.bg,
          color: colors.color,
          fontWeight: 500,
        }}
      />
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      待处理: { bg: '#fef9c3', color: '#ca8a04' },
      调查中: { bg: '#dbeafe', color: 'primary.dark' },
      处理中: { bg: 'warning.light', color: 'warning.dark' },
      已解决: { bg: 'success.lighter', color: 'success.dark' },
      已结案: { bg: 'grey.100', color: 'text.secondary' },
    };
    const colors = statusMap[status] || { bg: 'grey.100', color: 'text.secondary' };
    return (
      <Chip
        label={status}
        size='small'
        sx={{
          backgroundColor: colors.bg,
          color: colors.color,
          fontWeight: 500,
        }}
      />
    );
  };

  const columns: ColumnDef<Accident>[] = [
    { accessorKey: 'accident_no', header: '事故编号' },
    {
      accessorKey: 'title',
      header: '事故标题',
      cell: ({ row }) => (
        <Typography sx={{ fontWeight: 500, color: 'slate.900' }}>
          {row.original.title}
        </Typography>
      ),
    },
    {
      accessorKey: 'accident_type',
      header: '事故类型',
      cell: ({ row }) => row.original.accident_type || '-',
    },
    {
      accessorKey: 'severity',
      header: '严重程度',
      cell: ({ row }) => getSeverityBadge(row.original.severity),
    },
    {
      accessorKey: 'location',
      header: '地点',
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <MapPin style={{ width: 14, height: 14 }} />
          {row.original.location || '-'}
        </Box>
      ),
    },
    {
      accessorKey: 'occurred_at',
      header: '发生时间',
      cell: ({ row }) =>
        row.original.occurred_at
          ? new Date(row.original.occurred_at).toLocaleString('zh-CN')
          : '-',
    },
    {
      accessorKey: 'reported_by',
      header: '报告人',
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <User style={{ width: 14, height: 14 }} />
          {row.original.reported_by || '-'}
        </Box>
      ),
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size='small'
            onClick={() => handleView(row.original)}
            startIcon={<Eye style={{ width: 16, height: 16 }} />}
          >
            详情
          </Button>
        </Box>
      ),
    },
  ];

  const filteredAccidents = accidents.filter((accident) => {
    const matchesSearch =
      accident.accident_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      accident.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (accident.location && accident.location.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSeverity = severityFilter === 'all' || accident.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || accident.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const handleView = async (accident: Accident) => {
    await loadAccidentDetail(accident.id);
    setShowDetailModal(true);
  };

  const handleCreate = () => {
    setFormData({
      title: '',
      description: '',
      accident_type: '',
      severity: 'minor',
      location: '',
      occurred_at: '',
      reported_by: '',
      casualties: 0,
      economic_loss: 0,
    });
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      addNotification({ title: '错误', message: '请输入事故标题', type: 'error' });
      return;
    }
    try {
      await ehsApi.createAccident({
        title: formData.title,
        description: formData.description || null,
        accident_type: formData.accident_type || null,
        severity: formData.severity,
        location: formData.location || null,
        occurred_at: formData.occurred_at || null,
        casualties: formData.casualties || null,
        economic_loss: formData.economic_loss || null,
        reported_by: formData.reported_by || null,
      });
      addNotification({ title: '成功', message: '事故上报成功', type: 'success' });
      setShowCreateModal(false);
      loadAccidents();
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '上报失败', type: 'error' });
      apiLogger.error('创建事故记录失败:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此事故记录吗？')) return;
    try {
      await ehsApi.deleteAccident(id);
      addNotification({ title: '成功', message: '删除成功', type: 'success' });
      setShowDetailModal(false);
      loadAccidents();
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '删除失败', type: 'error' });
      apiLogger.error('删除事故记录失败:', err);
    }
  };

  const stats = {
    total: accidents.length,
    pending: accidents.filter((a) => a.status === '待处理').length,
    investigating: accidents.filter((a) => a.status === '调查中').length,
    processing: accidents.filter((a) => a.status === '处理中').length,
    closed: accidents.filter((a) => a.status === '已结案').length,
    serious: accidents.filter((a) => a.severity === '严重' || a.severity === '致命').length,
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, error.light 0%, #f8fafc 100%)',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              border: 4,
              borderColor: 'error.main',
              borderTopColor: 'error.dark',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              mx: 'auto',
              mb: 2,
            }}
          />
          <Typography sx={{ color: 'slate.600' }}>加载中...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, error.light 0%, #f8fafc 100%)',
      }}
    >
      <Box
        component='header'
        sx={{
          bgcolor: 'background.paper',
          boxShadow: 1,
          borderBottom: 1,
          borderColor: 'divider',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 } }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              height: 64,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  background: 'linear-gradient(135deg, error.main 0%, error.dark 100%)',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertCircle sx={{ width: 24, height: 24, color: 'white' }} />
              </Box>
              <Box>
                <Typography
                  variant='h6'
                  sx={{
                    fontWeight: 700,
                    color: 'slate.900',
                    fontSize: '1.25rem',
                  }}
                >
                  事故记录
                </Typography>
                <Typography
                  variant='caption'
                  sx={{ color: 'slate.500', fontSize: '0.75rem' }}
                >
                  Accident Records
                </Typography>
              </Box>
            </Box>
            <Button
              variant='contained'
              startIcon={<Plus style={{ width: 18, height: 18 }} />}
              onClick={handleCreate}
              sx={{ bgcolor: 'error.main', '&:hover': { bgcolor: 'error.dark' } }}
            >
              事故上报
            </Button>
          </Box>
        </Box>
      </Box>

      <Box
        component='main'
        sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
            gap: 2,
            mb: 4,
          }}
        >
          <Card sx={{ bgcolor: 'error.light' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: 'error.lighter',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AlertCircle sx={{ width: 20, height: 20, color: 'error.main' }} />
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                  >
                    事故总数
                  </Typography>
                  <Typography
                    variant='h5'
                    sx={{ fontWeight: 700, color: 'slate.900' }}
                  >
                    {stats.total}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: '#fef9c3',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FileText sx={{ width: 20, height: 20, color: '#ca8a04' }} />
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                  >
                    待处理
                  </Typography>
                  <Typography
                    variant='h5'
                    sx={{ fontWeight: 700, color: 'slate.900' }}
                  >
                    {stats.pending}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: '#dbeafe',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AlertTriangle sx={{ width: 20, height: 20, color: 'primary.dark' }} />
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                  >
                    调查中
                  </Typography>
                  <Typography
                    variant='h5'
                    sx={{ fontWeight: 700, color: 'slate.900' }}
                  >
                    {stats.investigating}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: 'success.lighter',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FileText sx={{ width: 20, height: 20, color: 'success.dark' }} />
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                  >
                    已结案
                  </Typography>
                  <Typography
                    variant='h5'
                    sx={{ fontWeight: 700, color: 'slate.900' }}
                  >
                    {stats.closed}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: 'error.lighter',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AlertTriangle sx={{ width: 20, height: 20, color: 'error.dark' }} />
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                  >
                    严重事故
                  </Typography>
                  <Typography
                    variant='h5'
                    sx={{ fontWeight: 700, color: 'slate.900' }}
                  >
                    {stats.serious}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Card>
          <CardHeader
            sx={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              pb: 0,
            }}
          >
            <Typography
              variant='h6'
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <AlertCircle style={{ width: 20, height: 20, color: 'error.main' }} />
              事故列表
            </Typography>
          </CardHeader>
          <CardContent>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
              <TextField
                size='small'
                placeholder='搜索事故编号、标题或地点...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ minWidth: 250 }}
                slotProps={{
                  input: {
                    startAdornment: <Search style={{ width: 18, height: 18, marginRight: 8 }} />,
                  },
                }}
              />
              <FormControl size='small' sx={{ minWidth: 150 }}>
                <InputLabel>严重程度</InputLabel>
                <Select
                  value={severityFilter}
                  label='严重程度'
                  onChange={(e) => setSeverityFilter(e.target.value)}
                >
                  <MenuItem value='all'>全部</MenuItem>
                  <MenuItem value='轻微'>轻微</MenuItem>
                  <MenuItem value='一般'>一般</MenuItem>
                  <MenuItem value='严重'>严重</MenuItem>
                  <MenuItem value='致命'>致命</MenuItem>
                </Select>
              </FormControl>
              <FormControl size='small' sx={{ minWidth: 150 }}>
                <InputLabel>状态</InputLabel>
                <Select
                  value={statusFilter}
                  label='状态'
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value='all'>全部</MenuItem>
                  <MenuItem value='待处理'>待处理</MenuItem>
                  <MenuItem value='调查中'>调查中</MenuItem>
                  <MenuItem value='处理中'>处理中</MenuItem>
                  <MenuItem value='已结案'>已结案</MenuItem>
                </Select>
              </FormControl>
              <Button
                size='small'
                variant='outlined'
                onClick={loadAccidents}
                startIcon={<FileText style={{ width: 16, height: 16 }} />}
              >
                刷新
              </Button>
            </Box>
            <DataTable
              columns={columns}
              data={filteredAccidents}
              enablePagination
            />
          </CardContent>
        </Card>
      </Box>

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>事故上报</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label='事故标题 *'
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder='请输入事故标题'
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label='事故类型'
                value={formData.accident_type}
                onChange={(e) => setFormData({ ...formData, accident_type: e.target.value })}
                placeholder='如：物体打击、机械伤害等'
              />
              <FormControl fullWidth>
                <InputLabel>严重程度 *</InputLabel>
                <Select
                  value={formData.severity}
                  label='严重程度'
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                >
                  <MenuItem value='minor'>轻微</MenuItem>
                  <MenuItem value='moderate'>一般</MenuItem>
                  <MenuItem value='serious'>严重</MenuItem>
                  <MenuItem value='fatal'>致命</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <TextField
              fullWidth
              label='发生地点'
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder='请输入事故发生地点'
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label='报告人'
                value={formData.reported_by}
                onChange={(e) => setFormData({ ...formData, reported_by: e.target.value })}
                placeholder='请输入报告人姓名'
              />
              <TextField
                fullWidth
                type='datetime-local'
                label='发生时间'
                value={formData.occurred_at}
                onChange={(e) => setFormData({ ...formData, occurred_at: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                type='number'
                label='伤亡人数'
                value={formData.casualties}
                onChange={(e) =>
                  setFormData({ ...formData, casualties: parseInt(e.target.value) || 0 })
                }
              />
              <TextField
                fullWidth
                type='number'
                label='经济损失（万元）'
                value={formData.economic_loss}
                onChange={(e) =>
                  setFormData({ ...formData, economic_loss: parseFloat(e.target.value) || 0 })
                }
              />
            </Box>
            <TextField
              fullWidth
              label='事故描述'
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder='请详细描述事故经过'
              multiline
              rows={4}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowCreateModal(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleSave}
            sx={{ bgcolor: 'error.main' }}
          >
            上报
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>事故详情</DialogTitle>
        <DialogContent>
          {detailLoading ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  border: 3,
                  borderColor: 'error.main',
                  borderTopColor: 'error.dark',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  mx: 'auto',
                  mb: 2,
                }}
              />
              <Typography sx={{ color: 'slate.600' }}>加载中...</Typography>
            </Box>
          ) : selectedAccident?.accident ? (
            <Box sx={{ pt: 2 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 2,
                  mb: 3,
                }}
              >
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    事故编号
                  </Typography>
                  <Typography sx={{ fontWeight: 500 }}>
                    {selectedAccident.accident.accident_no}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    事故标题
                  </Typography>
                  <Typography>{selectedAccident.accident.title}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    事故类型
                  </Typography>
                  <Typography>{selectedAccident.accident.accident_type || '-'}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    严重程度
                  </Typography>
                  <Typography sx={{ mt: 0.5 }}>
                    {getSeverityBadge(selectedAccident.accident.severity)}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    发生地点
                  </Typography>
                  <Typography sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <MapPin style={{ width: 16, height: 16 }} />
                    {selectedAccident.accident.location || '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    发生时间
                  </Typography>
                  <Typography sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Calendar style={{ width: 16, height: 16 }} />
                    {selectedAccident.accident.occurred_at
                      ? new Date(selectedAccident.accident.occurred_at).toLocaleString('zh-CN')
                      : '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    报告人
                  </Typography>
                  <Typography sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <User style={{ width: 16, height: 16 }} />
                    {selectedAccident.accident.reported_by || '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    状态
                  </Typography>
                  <Typography sx={{ mt: 0.5 }}>
                    {getStatusBadge(selectedAccident.accident.status)}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    伤亡人数
                  </Typography>
                  <Typography>{selectedAccident.accident.casualties ?? 0} 人</Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    经济损失
                  </Typography>
                  <Typography>{selectedAccident.accident.economic_loss ?? 0} 万元</Typography>
                </Box>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600, mb: 1 }}
                >
                  事故描述
                </Typography>
                <Typography>{selectedAccident.accident.description || '暂无描述'}</Typography>
              </Box>

              {selectedAccident.investigation && (
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography
                      variant='subtitle2'
                      sx={{ fontWeight: 600, mb: 2 }}
                    >
                      调查信息
                    </Typography>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 2,
                      }}
                    >
                      <Box>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                          调查状态
                        </Typography>
                        <Typography>{selectedAccident.investigation.status || '-'}</Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                          调查团队
                        </Typography>
                        <Typography>
                          {Array.isArray(selectedAccident.investigation.team)
                            ? selectedAccident.investigation.team.join(', ')
                            : '-'}
                        </Typography>
                      </Box>
                      <Box sx={{ gridColumn: '1 / -1' }}>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                          调查发现
                        </Typography>
                        <Typography>{selectedAccident.investigation.findings || '-'}</Typography>
                      </Box>
                      <Box sx={{ gridColumn: '1 / -1' }}>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                          根本原因
                        </Typography>
                        <Typography>{selectedAccident.investigation.root_cause || '-'}</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              )}

              {selectedAccident.treatment && (
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography
                      variant='subtitle2'
                      sx={{ fontWeight: 600, mb: 2 }}
                    >
                      处理措施
                    </Typography>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 2,
                        mb: 2,
                      }}
                    >
                      <Box>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                          处理状态
                        </Typography>
                        <Typography>{selectedAccident.treatment.status || '-'}</Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                          负责人
                        </Typography>
                        <Typography>{selectedAccident.treatment.responsible || '-'}</Typography>
                      </Box>
                    </Box>
                    {selectedAccident.treatment.actions &&
                      selectedAccident.treatment.actions.length > 0 && (
                        <Box>
                          <Typography
                            sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 1 }}
                          >
                            处理行动
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {selectedAccident.treatment.actions.map((action, index) => (
                              <Box
                                key={index}
                                sx={{
                                  p: 2,
                                  border: 1,
                                  borderColor: 'divider',
                                  borderRadius: 1,
                                }}
                              >
                                <Typography sx={{ fontWeight: 500 }}>{action.description}</Typography>
                                <Box
                                  sx={{
                                    display: 'flex',
                                    gap: 2,
                                    mt: 1,
                                    fontSize: '0.875rem',
                                    color: 'text.secondary',
                                  }}
                                >
                                  <span>负责人：{action.responsible || '-'}</span>
                                  <span>期限：{action.deadline || '-'}</span>
                                  <span>状态：{action.status || '-'}</span>
                                </Box>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      )}
                  </CardContent>
                </Card>
              )}

              {selectedAccident.review && (
                <Card>
                  <CardContent>
                    <Typography
                      variant='subtitle2'
                      sx={{ fontWeight: 600, mb: 2 }}
                    >
                      结案评审
                    </Typography>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 2,
                      }}
                    >
                      <Box>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                          评审人
                        </Typography>
                        <Typography>{selectedAccident.review.reviewer || '-'}</Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                          评审时间
                        </Typography>
                        <Typography>
                          {selectedAccident.review.reviewed_at
                            ? new Date(selectedAccident.review.reviewed_at).toLocaleString('zh-CN')
                            : '-'}
                        </Typography>
                      </Box>
                      <Box sx={{ gridColumn: '1 / -1' }}>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                          总结
                        </Typography>
                        <Typography>{selectedAccident.review.summary || '-'}</Typography>
                      </Box>
                      {selectedAccident.review.lessons_learned &&
                        selectedAccident.review.lessons_learned.length > 0 && (
                          <Box sx={{ gridColumn: '1 / -1' }}>
                            <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                              经验教训
                            </Typography>
                            <Box component='ul' sx={{ m: 0, pl: 2 }}>
                              {selectedAccident.review.lessons_learned.map((lesson, index) => (
                                <li key={index}>{lesson}</li>
                              ))}
                            </Box>
                          </Box>
                        )}
                      {selectedAccident.review.recommendations &&
                        selectedAccident.review.recommendations.length > 0 && (
                          <Box sx={{ gridColumn: '1 / -1' }}>
                            <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                              改进建议
                            </Typography>
                            <Box component='ul' sx={{ m: 0, pl: 2 }}>
                              {selectedAccident.review.recommendations.map((rec, index) => (
                                <li key={index}>{rec}</li>
                              ))}
                            </Box>
                          </Box>
                        )}
                    </Box>
                  </CardContent>
                </Card>
              )}
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 6, color: 'slate.500' }}>
              暂无详情数据
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedAccident?.accident && (
            <Button
              variant='text'
              color='error'
              onClick={() => handleDelete(selectedAccident.accident.id)}
              startIcon={<Trash2 style={{ width: 16, height: 16 }} />}
            >
              删除
            </Button>
          )}
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EhsAccidentPage;
