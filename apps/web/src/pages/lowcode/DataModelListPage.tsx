import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Search,
  Plus,
  Database,
  Edit,
  Trash2,
  Upload,
  RefreshCw,
} from 'lucide-react';
import { PageContainer } from '@/components/common';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
} from '@/components/templates';
import {
  listDataModels,
  createDataModel,
  deleteDataModel,
  publishModel,
} from '../../api/lowcode';
import type { DataModel } from '../../api/lowcode/types';
import { useNavigate } from 'react-router-dom';

const DataModelListPage = () => {
  const navigate = useNavigate();
  const [models, setModels] = useState<DataModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newModel, setNewModel] = useState({ name: '', label: '', description: '' });

  useEffect(() => {
    loadModels();
  }, [page, pageSize, statusFilter]);

  const loadModels = async () => {
    setLoading(true);
    try {
      const res = await listDataModels({
        page: page + 1,
        pageSize,
        status: statusFilter || undefined,
        search: searchTerm || undefined,
      });
      if (res.success) {
        setModels(res.data.items || []);
        setTotal(res.data.total || 0);
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPage(0);
  };

  const handleCreateModel = async () => {
    try {
      const res = await createDataModel(newModel);
      if (res.success) {
        setCreateDialogOpen(false);
        loadModels();
      }
    } catch (error) {
      console.error('Failed to create model:', error);
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    if (window.confirm('确定要删除这个数据模型吗？')) {
      try {
        await deleteDataModel(modelId);
        loadModels();
      } catch (error) {
        console.error('Failed to delete model:', error);
      }
    }
  };

  const handlePublishModel = async (modelId: string) => {
    try {
      await publishModel(modelId);
      loadModels();
    } catch (error) {
      console.error('Failed to publish model:', error);
    }
  };

  const columns: ColumnDef<DataModel>[] = [
    {
      id: 'label',
      label: '模型名称',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1,
              bgcolor: 'secondary.light',
              color: 'secondary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Database style={{ width: 20, height: 20 }} />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <span style={{ fontWeight: 500 }}>{row.label}</span>
              <Chip
                label={row.status === 'published' ? '已发布' : '草稿'}
                size="small"
                color={row.status === 'published' ? 'success' : 'default'}
                variant="outlined"
              />
            </Box>
            <span style={{ fontSize: 12, color: 'text.secondary' }}>{row.name}</span>
          </Box>
        </Box>
      ),
    },
    {
      id: 'description',
      label: '描述',
      render: (row) => row.description || '-',
    },
    {
      id: 'fieldCount',
      label: '字段数',
      width: 100,
      align: 'center',
      render: (row) => row.fields?.length || 0,
    },
    {
      id: 'updatedAt',
      label: '更新时间',
      width: 180,
      render: (row) => new Date(row.updatedAt).toLocaleString('zh-CN'),
    },
  ];

  const rowActions: RowAction<DataModel>[] = [
    {
      label: '设计',
      icon: <Edit style={{ width: 16, height: 16 }} />,
      onClick: (row) => navigate(`/lowcode/models/${row.id}`),
    },
    {
      label: '发布',
      icon: <Upload style={{ width: 16, height: 16 }} />,
      onClick: (row) => handlePublishModel(row.id),
      show: (row) => row.status !== 'published',
    },
    {
      label: '删除',
      icon: <Trash2 style={{ width: 16, height: 16 }} />,
      onClick: (row) => handleDeleteModel(row.id),
      color: 'error',
    },
  ];

  return (
    <PageContainer
      title="数据模型"
      subtitle="管理所有数据模型"
      loading={loading}
      headerActions={
        <Button
          variant="contained"
          startIcon={<Plus style={{ width: 18, height: 18 }} />}
          onClick={() => setCreateDialogOpen(true)}
        >
          新建模型
        </Button>
      }
    >
      <ListPageTemplate
        data={models}
        columns={columns}
        rowActions={rowActions}
        total={total}
        page={page}
        pageSize={pageSize}
        loading={loading}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        searchValue={searchTerm}
        onSearchChange={handleSearch}
        searchPlaceholder="搜索模型名称..."
        filterContent={
          <FormControl size="small" sx={{ width: 150 }}>
            <InputLabel>状态</InputLabel>
            <Select
              value={statusFilter}
              label="状态"
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            >
              <MenuItem value="">全部</MenuItem>
              <MenuItem value="draft">草稿</MenuItem>
              <MenuItem value="published">已发布</MenuItem>
              <MenuItem value="archived">已归档</MenuItem>
            </Select>
          </FormControl>
        }
        onRowClick={(row) => navigate(`/lowcode/models/${row.id}`)}
      />

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新建数据模型</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="模型名称"
              value={newModel.name}
              onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
              size="small"
              helperText="英文标识，用于代码引用"
            />
            <TextField
              label="模型显示名"
              value={newModel.label}
              onChange={(e) => setNewModel({ ...newModel, label: e.target.value })}
              size="small"
            />
            <TextField
              label="描述"
              value={newModel.description}
              onChange={(e) => setNewModel({ ...newModel, description: e.target.value })}
              size="small"
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreateModel}>创建</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default DataModelListPage;
