import React, { useState, useEffect, useMemo } from 'react';
import {Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Button,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Typography,
  Slider, useTheme} from '@mui/material';
import { Plus, Edit2, Trash2, Eye, Sliders } from 'lucide-react';
import { ListPageTemplate, type ColumnDef, type RowAction } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { useAppStore } from '@/store';
import { designTokens } from '@/theme/tokens';
import { logger } from '@/utils/logger';

const ct = designTokens.colors;

interface ScoringDimension {
  id: string;
  dimension_code: string;
  name: string;
  weight: number;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  active: { label: '启用', bg: 'success.lighter', color: 'success.700' },
  inactive: { label: '禁用', bg: 'error.lighter', color: ct.error[700] },
};

const mockDimensions: ScoringDimension[] = [
  {
    id: '1',
    dimension_code: 'DIM-001',
    name: '产品质量',
    weight: 30,
    description: '评估供应商提供产品的质量合格率和质量稳定性',
    status: 'active',
    created_at: '2025-01-10',
    updated_at: '2025-06-01',
  },
  {
    id: '2',
    dimension_code: 'DIM-002',
    name: '交期准时率',
    weight: 25,
    description: '评估供应商按时交付的能力',
    status: 'active',
    created_at: '2025-01-10',
    updated_at: '2025-06-01',
  },
  {
    id: '3',
    dimension_code: 'DIM-003',
    name: '价格竞争力',
    weight: 20,
    description: '评估供应商报价的合理性和竞争力',
    status: 'active',
    created_at: '2025-01-10',
    updated_at: '2025-06-01',
  },
  {
    id: '4',
    dimension_code: 'DIM-004',
    name: '服务水平',
    weight: 10,
    description: '评估供应商售后服务和响应速度',
    status: 'active',
    created_at: '2025-02-01',
    updated_at: '2025-05-30',
  },
  {
    id: '5',
    dimension_code: 'DIM-005',
    name: '技术能力',
    weight: 8,
    description: '评估供应商的研发能力和技术创新水平',
    status: 'active',
    created_at: '2025-02-01',
    updated_at: '2025-05-30',
  },
  {
    id: '6',
    dimension_code: 'DIM-006',
    name: '环保合规',
    weight: 7,
    description: '评估供应商在环保和合规方面的表现',
    status: 'active',
    created_at: '2025-03-01',
    updated_at: '2025-05-28',
  },
  {
    id: '7',
    dimension_code: 'DIM-007',
    name: '风险管理',
    weight: 5,
    description: '评估供应商的风险控制能力和财务状况',
    status: 'inactive',
    created_at: '2025-03-15',
    updated_at: '2025-05-20',
  },
  {
    id: '8',
    dimension_code: 'DIM-008',
    name: '协同合作',
    weight: 5,
    description: '评估供应商与企业的协同合作意愿和能力',
    status: 'active',
    created_at: '2025-04-01',
    updated_at: '2025-06-01',
  },
];

interface DimensionFormData {
  dimension_code: string;
  name: string;
  weight: number;
  description: string;
  status: string;
}

const defaultFormData: DimensionFormData = {
  dimension_code: '',
  name: '',
  weight: 10,
  description: '',
  status: 'active',
};

const SrmScoringDimensionPage: React.FC = () => {
  const [dimensions, setDimensions] = useState<ScoringDimension[]>([]);
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<DimensionFormData>(defaultFormData);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const addNotification = useAppStore((state) => state.addNotification);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      setDimensions(mockDimensions);
    } catch (error: unknown) {
      logger.error('加载评分维度失败:', error);
      addNotification({ title: '加载失败', message: '加载评分维度失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_MAP[status] || { label: status, bg: 'grey.100', color: ct.text.secondary };
    return (
      <Chip
        label={config.label}
        size='small'
        sx={{ bgcolor: config.bg, color: config.color, fontWeight: 500 }}
      />
    );
  };

  const totalWeight = useMemo(
    () => dimensions.filter((d) => d.status === 'active').reduce((sum, d) => sum + d.weight, 0),
    [dimensions]
  );

  const columns: ColumnDef<ScoringDimension>[] = [
    {
      id: 'dimension_code',
      label: '维度编码',
      render: (row) => <Box sx={{ fontWeight: 500 }}>{row.dimension_code}</Box>,
    },
    { id: 'name', label: '维度名称' },
    {
      id: 'weight',
      label: '权重',
      align: 'right',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
          <Slider
            value={row.weight}
            max={100}
            sx={{ width: 80 }}
            size='small'
            disabled
          />
          <Typography
            variant='body2'
            sx={{ fontWeight: 600, minWidth: 40, textAlign: 'right' }}
          >
            {row.weight}%
          </Typography>
        </Box>
      ),
    },
    {
      id: 'description',
      label: '描述',
      render: (row) => (
        <Typography
          component='span'
          variant='body2'
          sx={{
            color: 'text.secondary',
            maxWidth: 200,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'block',
            whiteSpace: 'nowrap',
          }}
        >
          {row.description || '-'}
        </Typography>
      ),
    },
    { id: 'status', label: '状态', render: (row) => getStatusBadge(row.status) },
  ];

  const filteredDimensions = useMemo(
    () =>
      dimensions.filter(
        (d) =>
          d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.dimension_code.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [dimensions, searchTerm]
  );
  const paginatedData = filteredDimensions.slice(page * pageSize, page * pageSize + pageSize);

  const rowActions: RowAction<ScoringDimension>[] = [
    {
      label: '查看',
      icon: <Eye style={{ width: 16, height: 16 }} />,
      onClick: (row) =>
        addNotification({ title: '查看', message: `查看维度: ${row.name}`, type: 'info' }),
    },
    {
      label: '编辑',
      icon: <Edit2 style={{ width: 16, height: 16 }} />,
      color: 'primary',
      onClick: (row) => handleEdit(row),
    },
    {
      label: '删除',
      icon: <Trash2 style={{ width: 16, height: 16 }} />,
      color: 'error',
      onClick: (row) => {
        setDimensions((prev) => prev.filter((d) => d.id !== row.id));
        addNotification({ title: '成功', message: '评分维度删除成功', type: 'success' });
      },
    },
  ];

  const handleCreate = () => {
    setFormData(defaultFormData);
    setShowCreateModal(true);
  };
  const handleEdit = (row: ScoringDimension) => {
    setEditingId(row.id);
    setFormData({
      dimension_code: row.dimension_code,
      name: row.name,
      weight: row.weight,
      description: row.description,
      status: row.status,
    });
    setShowEditModal(true);
  };
  const handleSaveCreate = () => {
    const newDimension: ScoringDimension = {
      id: Date.now().toString(),
      ...formData,
      created_at: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString().split('T')[0],
    };
    setDimensions((prev) => [newDimension, ...prev]);
    setShowCreateModal(false);
    addNotification({ title: '成功', message: '评分维度创建成功', type: 'success' });
  };
  const handleSaveEdit = () => {
    setDimensions((prev) =>
      prev.map((d) =>
        d.id === editingId
          ? { ...d, ...formData, updated_at: new Date().toISOString().split('T')[0] }
          : d
      )
    );
    setShowEditModal(false);
    setEditingId(null);
    addNotification({ title: '成功', message: '评分维度更新成功', type: 'success' });
  };

  const renderFormFields = (
    data: DimensionFormData,
    onChange: (d: DimensionFormData) => void,
    editing: boolean
  ) => (
    <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        <TextField
          fullWidth
          label='维度编码 *'
          value={data.dimension_code}
          onChange={(e) => onChange({ ...data, dimension_code: e.target.value })}
          placeholder='请输入维度编码'
          disabled={editing}
        />
        <TextField
          fullWidth
          label='维度名称 *'
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          placeholder='请输入维度名称'
        />
      </Box>
      <Box>
        <Typography
          variant='body2'
          sx={{ mb: 1 }}
        >
          权重: {data.weight}%
        </Typography>
        <Slider
          value={data.weight}
          onChange={(_, value) => onChange({ ...data, weight: value as number })}
          min={0}
          max={100}
          step={1}
          valueLabelDisplay='auto'
          valueLabelFormat={(v) => `${v}%`}
        />
        <Typography
          variant='caption'
          color='text.secondary'
        >
          当前启用维度总权重: {totalWeight}%
        </Typography>
      </Box>
      <TextField
        fullWidth
        label='描述'
        value={data.description}
        onChange={(e) => onChange({ ...data, description: e.target.value })}
        placeholder='请输入描述'
        multiline
        rows={2}
      />
      <FormControl fullWidth>
        <InputLabel>状态</InputLabel>
        <Select
          value={data.status}
          label='状态'
          onChange={(e) => onChange({ ...data, status: e.target.value })}
        >
          <MenuItem value='active'>启用</MenuItem>
          <MenuItem value='inactive'>禁用</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );

  return (
    <PageContainer
      title='评分维度配置'
      subtitle='Scoring Dimension Configuration'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: 'SRM' },
          { label: '评分维度配置' },
        ]}
        columns={columns}
        data={paginatedData}
        loading={loading}
        getRowId={(row) => row.id}
        searchable
        searchPlaceholder='搜索维度名称或编码...'
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        pagination={{
          page,
          pageSize,
          total: filteredDimensions.length,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
        }}
        actions={[
          {
            label: '新增维度',
            icon: <Plus style={{ width: 18, height: 18 }} />,
            onClick: handleCreate,
            variant: 'contained',
          },
        ]}
        rowActions={rowActions}
        headerContent={
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 1,
            }}
          >
            <Sliders style={{ width: 18, height: 18, color: theme.palette.primary.main }} />
            <Typography
              variant='body2'
              color='text.secondary'
            >
              启用维度总权重:{' '}
              <Box
                component='span'
                sx={{
                  fontWeight: 700,
                  color: totalWeight === 100 ? 'success.dark' : 'warning.dark',
                }}
              >
                {totalWeight}%
              </Box>
              {totalWeight !== 100 && ' (建议总和为100%)'}
            </Typography>
          </Box>
        }
        emptyMessage='暂无评分维度数据'
      />
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>新增评分维度</DialogTitle>
        <DialogContent>{renderFormFields(formData, setFormData, false)}</DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowCreateModal(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleSaveCreate}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingId(null);
        }}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>编辑评分维度</DialogTitle>
        <DialogContent>{renderFormFields(formData, setFormData, true)}</DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => {
              setShowEditModal(false);
              setEditingId(null);
            }}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleSaveEdit}
          >
            更新
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default SrmScoringDimensionPage;
