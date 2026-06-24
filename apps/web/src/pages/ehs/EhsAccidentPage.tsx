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
} from '@mui/material';
import { Button } from '@mui/material';
import {
  Plus,
  Eye,
  AlertCircle,
  AlertTriangle,
  FileText,
  Search,
  Filter,
  MapPin,
  User,
} from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import type { ColumnDef } from '@tanstack/react-table';

interface Accident {
  id: string;
  accident_no: string;
  accident_type: string;
  severity: string;
  location: string;
  occurred_at: string;
  reporter: string;
  status: string;
}

const mockAccidents: Accident[] = [
  {
    id: '1',
    accident_no: 'AC2024001',
    accident_type: '物体打击',
    severity: '轻微',
    location: 'A栋2层车间',
    occurred_at: '2024-01-15 10:30',
    reporter: '张三',
    status: '处理中',
  },
  {
    id: '2',
    accident_no: 'AC2024002',
    accident_type: '机械伤害',
    severity: '严重',
    location: 'B栋1层生产线',
    occurred_at: '2024-01-16 14:20',
    reporter: '李四',
    status: '调查中',
  },
  {
    id: '3',
    accident_no: 'AC2024003',
    accident_type: '高处坠落',
    severity: '严重',
    location: 'C栋维护通道',
    occurred_at: '2024-01-17 09:15',
    reporter: '王五',
    status: '已结案',
  },
  {
    id: '4',
    accident_no: 'AC2024004',
    accident_type: '触电事故',
    severity: '轻微',
    location: 'D栋配电室',
    occurred_at: '2024-01-18 16:45',
    reporter: '赵六',
    status: '处理中',
  },
  {
    id: '5',
    accident_no: 'AC2024005',
    accident_type: '火灾事故',
    severity: '严重',
    location: 'E栋仓库',
    occurred_at: '2024-01-19 11:00',
    reporter: '钱七',
    status: '调查中',
  },
];

const EhsAccidentPage: React.FC = () => {
  const navigate = useNavigate();
  const [accidents, setAccidents] = useState<Accident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAccident, setSelectedAccident] = useState<Accident | null>(null);
  const [formData, setFormData] = useState({
    accident_type: '物体打击',
    severity: '轻微',
    location: '',
    occurred_at: '',
    reporter: '',
    description: '',
  });

  useEffect(() => {
    loadAccidents();
  }, []);

  const loadAccidents = async () => {
    setLoading(true);
    setTimeout(() => {
      setAccidents(mockAccidents);
      setLoading(false);
    }, 500);
  };

  const getSeverityBadge = (severity: string) => {
    const severityMap: Record<string, { bg: string; color: string }> = {
      轻微: { bg: '#fef9c3', color: '#ca8a04' },
      严重: { bg: 'error.lighter', color: 'error.dark' },
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
      处理中: { bg: '#dbeafe', color: 'primary.dark' },
      调查中: { bg: '#fef9c3', color: '#ca8a04' },
      已结案: { bg: 'success.lighter', color: 'success.dark' },
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
    { accessorKey: 'accident_type', header: '事故类型' },
    {
      accessorKey: 'severity',
      header: '严重程度',
      cell: ({ row }) => getSeverityBadge(row.original.severity),
    },
    { accessorKey: 'location', header: '地点' },
    { accessorKey: 'occurred_at', header: '发生时间' },
    { accessorKey: 'reporter', header: '报告人' },
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
      accident.accident_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      accident.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || accident.accident_type === typeFilter;
    const matchesSeverity = severityFilter === 'all' || accident.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || accident.status === statusFilter;
    return matchesSearch && matchesType && matchesSeverity && matchesStatus;
  });

  const handleView = (accident: Accident) => {
    setSelectedAccident(accident);
    setShowDetailModal(true);
  };

  const handleCreate = () => {
    setFormData({
      accident_type: '物体打击',
      severity: '轻微',
      location: '',
      occurred_at: '',
      reporter: '',
      description: '',
    });
    setShowCreateModal(true);
  };

  const handleSave = () => {
    const newAccident: Accident = {
      id: String(Date.now()),
      accident_no: `AC${Date.now()}`,
      accident_type: formData.accident_type,
      severity: formData.severity,
      location: formData.location,
      occurred_at: formData.occurred_at || new Date().toLocaleString('zh-CN'),
      reporter: formData.reporter,
      status: '处理中',
    };
    setAccidents((prev) => [newAccident, ...prev]);
    setShowCreateModal(false);
  };

  const stats = {
    total: accidents.length,
    inProgress: accidents.filter((a) => a.status === '处理中').length,
    investigating: accidents.filter((a) => a.status === '调查中').length,
    closed: accidents.filter((a) => a.status === '已结案').length,
    serious: accidents.filter((a) => a.severity === '严重').length,
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
            gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(5, 1fr)' },
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
                    bgcolor: '#dbeafe',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FileText sx={{ width: 20, height: 20, color: 'primary.dark' }} />
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                  >
                    处理中
                  </Typography>
                  <Typography
                    variant='h5'
                    sx={{ fontWeight: 700, color: 'slate.900' }}
                  >
                    {stats.inProgress}
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
                    bgcolor: 'warning.light',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AlertTriangle sx={{ width: 20, height: 20, color: '#ca8a04' }} />
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
                placeholder='搜索事故编号或地点...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ minWidth: 250 }}
                slotProps={{
                  input: {
                    startAdornment: <Search style={{ width: 18, height: 18, marginRight: 8 }} />,
                  },
                }}
              />
              <TextField
                size='small'
                select
                label='事故类型'
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                sx={{ minWidth: 150 }}
              >
                <option value='all'>全部</option>
                <option value='物体打击'>物体打击</option>
                <option value='机械伤害'>机械伤害</option>
                <option value='高处坠落'>高处坠落</option>
                <option value='触电事故'>触电事故</option>
                <option value='火灾事故'>火灾事故</option>
              </TextField>
              <TextField
                size='small'
                select
                label='严重程度'
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                sx={{ minWidth: 150 }}
              >
                <option value='all'>全部</option>
                <option value='轻微'>轻微</option>
                <option value='严重'>严重</option>
              </TextField>
              <TextField
                size='small'
                select
                label='状态'
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={{ minWidth: 150 }}
              >
                <option value='all'>全部</option>
                <option value='处理中'>处理中</option>
                <option value='调查中'>调查中</option>
                <option value='已结案'>已结案</option>
              </TextField>
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
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>事故上报</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              select
              label='事故类型'
              value={formData.accident_type}
              onChange={(e) => setFormData({ ...formData, accident_type: e.target.value })}
            >
              <option value='物体打击'>物体打击</option>
              <option value='机械伤害'>机械伤害</option>
              <option value='高处坠落'>高处坠落</option>
              <option value='触电事故'>触电事故</option>
              <option value='火灾事故'>火灾事故</option>
            </TextField>
            <TextField
              fullWidth
              select
              label='严重程度'
              value={formData.severity}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
            >
              <option value='轻微'>轻微</option>
              <option value='严重'>严重</option>
            </TextField>
            <TextField
              fullWidth
              label='发生地点'
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder='请输入事故发生地点'
            />
            <TextField
              fullWidth
              label='报告人'
              value={formData.reporter}
              onChange={(e) => setFormData({ ...formData, reporter: e.target.value })}
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
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>事故详情</DialogTitle>
        <DialogContent>
          {selectedAccident && (
            <Box
              sx={{
                pt: 2,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 2,
              }}
            >
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  事故编号
                </Box>
                <Box sx={{ fontWeight: 500 }}>{selectedAccident.accident_no}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  事故类型
                </Box>
                <Box>{selectedAccident.accident_type}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  严重程度
                </Box>
                <Box sx={{ mt: 0.5 }}>{getSeverityBadge(selectedAccident.severity)}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  状态
                </Box>
                <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedAccident.status)}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  发生地点
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <MapPin style={{ width: 16, height: 16 }} />
                  {selectedAccident.location}
                </Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  发生时间
                </Box>
                <Box>{selectedAccident.occurred_at}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  报告人
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <User style={{ width: 16, height: 16 }} />
                  {selectedAccident.reporter}
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EhsAccidentPage;
