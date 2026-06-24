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
  Typography,
} from '@mui/material';
import { Button } from '@mui/material';
import { Plus, Edit, Eye, Download, Upload, FlaskConical, Filter } from 'lucide-react';
import {
  ListPageTemplate,
  type ColumnDef,
  type FilterConfig,
  type RowAction,
} from '@/components/templates';

interface Sample {
  id: string;
  sample_no: string;
  name: string;
  test_items: string;
  status: string;
  received_date: string;
  test_result: string;
}

const mockSamples: Sample[] = [
  {
    id: '1',
    sample_no: 'S202401001',
    name: '水质样品A',
    test_items: 'pH值、溶解氧',
    status: '已完成',
    received_date: '2024-01-15',
    test_result: '合格',
  },
  {
    id: '2',
    sample_no: 'S202401002',
    name: '土壤样品B',
    test_items: '重金属含量',
    status: '检测中',
    received_date: '2024-01-16',
    test_result: '-',
  },
  {
    id: '3',
    sample_no: 'S202401003',
    name: '空气样品C',
    test_items: 'PM2.5、PM10',
    status: '待检测',
    received_date: '2024-01-17',
    test_result: '-',
  },
  {
    id: '4',
    sample_no: 'S202401004',
    name: '食品样品D',
    test_items: '添加剂、农药残留',
    status: '已完成',
    received_date: '2024-01-18',
    test_result: '合格',
  },
  {
    id: '5',
    sample_no: 'S202401005',
    name: '药品样品E',
    test_items: '有效成分含量',
    status: '待接收',
    received_date: '2024-01-19',
    test_result: '-',
  },
];

const LimsSamplePage: React.FC = () => {
  const navigate = useNavigate();
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    test_items: '',
    status: '待接收',
  });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    loadSamples();
  }, []);

  const loadSamples = async () => {
    setLoading(true);
    setTimeout(() => {
      setSamples(mockSamples);
      setLoading(false);
    }, 500);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      待接收: { bg: 'grey.100', color: 'text.secondary' },
      待检测: { bg: '#fef9c3', color: '#ca8a04' },
      检测中: { bg: '#dbeafe', color: 'primary.dark' },
      已完成: { bg: 'success.lighter', color: 'success.dark' },
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

  const columns: ColumnDef<Sample>[] = [
    { id: 'sample_no', label: '样品编号' },
    { id: 'name', label: '样品名称' },
    { id: 'test_items', label: '检测项目' },
    {
      id: 'status',
      label: '状态',
      render: (row) => getStatusBadge(row.status),
    },
    { id: 'received_date', label: '接收日期' },
    { id: 'test_result', label: '检测结果' },
  ];

  const rowActions: RowAction<Sample>[] = [
    {
      label: '查看',
      icon: <Eye style={{ width: 16, height: 16 }} />,
      onClick: (row) => handleView(row),
    },
    {
      label: '编辑',
      icon: <Edit style={{ width: 16, height: 16 }} />,
      onClick: (row) => handleEdit(row),
    },
  ];

  const filters: FilterConfig[] = [
    {
      id: 'status',
      label: '状态',
      type: 'select',
      options: [
        { label: '全部', value: 'all' },
        { label: '待接收', value: '待接收' },
        { label: '待检测', value: '待检测' },
        { label: '检测中', value: '检测中' },
        { label: '已完成', value: '已完成' },
      ],
      value: statusFilter,
      onChange: (value) => setStatusFilter(value),
    },
  ];

  const filteredSamples = samples.filter((sample) => {
    const matchesSearch =
      sample.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sample.sample_no.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sample.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const paginatedData = filteredSamples.slice(page * pageSize, page * pageSize + pageSize);

  const handleView = (sample: Sample) => {
    setSelectedSample(sample);
    setShowDetailModal(true);
  };

  const handleEdit = (sample: Sample) => {
    setSelectedSample(sample);
    setFormData({
      name: sample.name,
      test_items: sample.test_items,
      status: sample.status,
    });
    setShowCreateModal(true);
  };

  const handleCreate = () => {
    setSelectedSample(null);
    setFormData({ name: '', test_items: '', status: '待接收' });
    setShowCreateModal(true);
  };

  const handleSave = () => {
    if (selectedSample) {
      setSamples((prev) =>
        prev.map((s) =>
          s.id === selectedSample.id
            ? {
                ...s,
                name: formData.name,
                test_items: formData.test_items,
                status: formData.status,
              }
            : s
        )
      );
    } else {
      const newSample: Sample = {
        id: String(Date.now()),
        sample_no: `S${Date.now()}`,
        name: formData.name,
        test_items: formData.test_items,
        status: formData.status,
        received_date: new Date().toISOString().split('T')[0],
        test_result: '-',
      };
      setSamples((prev) => [newSample, ...prev]);
    }
    setShowCreateModal(false);
  };

  const stats = {
    total: samples.length,
    pending: samples.filter((s) => s.status === '待接收' || s.status === '待检测').length,
    inProgress: samples.filter((s) => s.status === '检测中').length,
    completed: samples.filter((s) => s.status === '已完成').length,
  };

  const statsCards = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Card sx={{ bgcolor: '#f0fdfa' }}>
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
              <FlaskConical sx={{ width: 20, height: 20, color: 'info.main' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                样品总数
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
                bgcolor: 'warning.light',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Filter sx={{ width: 20, height: 20, color: '#ca8a04' }} />
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
              <FlaskConical sx={{ width: 20, height: 20, color: 'primary.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                检测中
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
                bgcolor: 'success.lighter',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FlaskConical sx={{ width: 20, height: 20, color: 'success.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                已完成
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.completed}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f0fdfa 0%, #f8fafc 100%)',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              border: 4,
              borderColor: 'info.main',
              borderTopColor: '#0891b2',
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
        background: 'linear-gradient(135deg, #f0fdfa 0%, #f8fafc 100%)',
      }}
    >
      <ListPageTemplate
        title='样品管理'
        subtitle='Sample Management'
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: 'LIMS' },
          { label: '样品管理' },
        ]}
        backButton={{ onClick: () => navigate('/dashboard') }}
        columns={columns}
        data={paginatedData}
        loading={loading}
        getRowId={(row) => row.id}
        filters={filters}
        searchable
        searchPlaceholder='搜索样品编号或名称...'
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        pagination={{
          page,
          pageSize,
          total: filteredSamples.length,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
        }}
        actions={[
          {
            label: '导入',
            icon: <Upload style={{ width: 18, height: 18 }} />,
            variant: 'outlined',
          },
          {
            label: '导出',
            icon: <Download style={{ width: 18, height: 18 }} />,
            variant: 'outlined',
          },
          {
            label: '样品登记',
            icon: <Plus style={{ width: 18, height: 18 }} />,
            onClick: handleCreate,
            variant: 'contained',
          },
        ]}
        rowActions={rowActions}
        headerContent={statsCards}
      />

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{selectedSample ? '编辑样品' : '样品登记'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label='样品名称 *'
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder='请输入样品名称'
            />
            <TextField
              fullWidth
              label='检测项目'
              value={formData.test_items}
              onChange={(e) => setFormData({ ...formData, test_items: e.target.value })}
              placeholder='请输入检测项目，多个用逗号分隔'
            />
            <TextField
              fullWidth
              select
              label='状态'
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value='待接收'>待接收</option>
              <option value='待检测'>待检测</option>
              <option value='检测中'>检测中</option>
              <option value='已完成'>已完成</option>
            </TextField>
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
            sx={{ bgcolor: 'info.main' }}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>样品详情</DialogTitle>
        <DialogContent>
          {selectedSample && (
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
                  样品编号
                </Box>
                <Box sx={{ fontWeight: 500 }}>{selectedSample.sample_no}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  样品名称
                </Box>
                <Box sx={{ fontWeight: 500 }}>{selectedSample.name}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  检测项目
                </Box>
                <Box>{selectedSample.test_items}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  状态
                </Box>
                <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedSample.status)}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  接收日期
                </Box>
                <Box>{selectedSample.received_date}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  检测结果
                </Box>
                <Box>{selectedSample.test_result}</Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
          <Button
            variant='contained'
            onClick={() => {
              setShowDetailModal(false);
              handleEdit(selectedSample!);
            }}
            sx={{ bgcolor: 'info.main' }}
          >
            编辑
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LimsSamplePage;
