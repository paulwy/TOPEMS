import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Button,
} from '@mui/material';
import { Settings, Plus, Edit, Delete, Zap, Package, Shield } from 'lucide-react';
import { pdmApi } from '@/api/pdm';
import type { ProductConfig } from '@/api/pdm';
import { useAppStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { PageContainer } from '@/components/common';

interface ConfigAttribute {
  name: string;
  type: 'select' | 'text' | 'number' | 'boolean';
  values?: string[];
  required: boolean;
}

interface FormData {
  name: string;
  code: string;
  status: string;
  attributes: {
    color: string;
    size: string;
    material: string;
    grade: string;
  };
  options: string[];
}

export const PdmProductConfigPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [configs, setConfigs] = useState<ProductConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingConfig, setEditingConfig] = useState<ProductConfig | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    code: '',
    status: 'draft',
    attributes: {
      color: '',
      size: '',
      material: '',
      grade: '',
    },
    options: [],
  });
  const addNotification = useAppStore((state) => state.addNotification);

  const configAttributes: ConfigAttribute[] = [
    {
      name: '颜色',
      type: 'select',
      values: ['红色', '蓝色', '绿色', '黑色', '白色'],
      required: true,
    },
    {
      name: '尺寸',
      type: 'select',
      values: ['S', 'M', 'L', 'XL', 'XXL'],
      required: true,
    },
    {
      name: '材质',
      type: 'select',
      values: ['塑料', '金属', '玻璃', '木材'],
      required: true,
    },
    {
      name: '等级',
      type: 'select',
      values: ['A级', 'B级', 'C级'],
      required: false,
    },
    { name: '自定义标签', type: 'text', required: false },
    { name: '单价', type: 'number', required: true },
    { name: '是否可定制', type: 'boolean', required: false },
  ];

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const response = await pdmApi.listProductConfigs();
      if (response.success && response.data) {
        const data = response.data as any;
        const items = Array.isArray(data) ? data : data.configs || [];
        setConfigs(items);
      } else {
        setConfigs([]);
      }
    } catch (err: unknown) {
      apiLogger.error('加载产品配置数据失败:', err);
      setConfigs([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'draft':
        return 'warning';
      case 'archived':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return '启用';
      case 'draft':
        return '草稿';
      case 'archived':
        return '归档';
      default:
        return status;
    }
  };

  const handleEdit = (config: ProductConfig) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      code: config.code,
      status: config.status,
      attributes: config.attributes,
      options: config.options || [],
    });
    setOpenDialog(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await pdmApi.deleteProductConfig(id);
      addNotification({ title: '成功', message: '配置删除成功', type: 'success' });
      loadConfigs();
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '删除失败', type: 'error' });
      apiLogger.error('删除产品配置失败:', err);
    }
  };

  const handleCreate = () => {
    setEditingConfig(null);
    setFormData({
      name: '',
      code: '',
      status: 'draft',
      attributes: {
        color: '',
        size: '',
        material: '',
        grade: '',
      },
      options: [],
    });
    setOpenDialog(true);
  };

  const handleSave = async () => {
    try {
      const requestData = {
        name: formData.name,
        code: formData.code,
        status: formData.status,
        attributes: formData.attributes,
        options: formData.options,
      };

      if (editingConfig) {
        await pdmApi.updateProductConfig(editingConfig.id, requestData);
        addNotification({ title: '成功', message: '配置更新成功', type: 'success' });
      } else {
        await pdmApi.createProductConfig(requestData);
        addNotification({ title: '成功', message: '配置创建成功', type: 'success' });
      }
      setOpenDialog(false);
      setEditingConfig(null);
      loadConfigs();
    } catch (err: unknown) {
      addNotification({
        title: '错误',
        message: editingConfig ? '更新失败' : '创建失败',
        type: 'error',
      });
      apiLogger.error('保存产品配置失败:', err);
    }
  };

  const handleOptionChange = (option: string, checked: boolean) => {
    if (checked) {
      setFormData({ ...formData, options: [...formData.options, option] });
    } else {
      setFormData({ ...formData, options: formData.options.filter((o) => o !== option) });
    }
  };

  const filteredConfigs = useMemo(() => {
    return configs.filter((config) => {
      const matchesSearch =
        !searchTerm ||
        config.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        config.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !statusFilter || config.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [configs, searchTerm, statusFilter]);

  const stats = useMemo(
    () => ({
      total: configs.length,
      active: configs.filter((c) => c.status === 'active').length,
      draft: configs.filter((c) => c.status === 'draft').length,
      archived: configs.filter((c) => c.status === 'archived').length,
    }),
    [configs]
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '草稿', value: 'draft' },
          { label: '启用', value: 'active' },
          { label: '归档', value: 'archived' },
        ],
      },
    ],
    []
  );

  const handleFilterChange = useCallback((values: Record<string, any>) => {
    setStatusFilter(values.status || '');
  }, []);

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const columns: ColumnDef<ProductConfig>[] = useMemo(
    () => [
      { id: 'name', label: '配置名称', minWidth: 140 },
      { id: 'code', label: '配置编码', minWidth: 120 },
      {
        id: 'attributes',
        label: '属性',
        minWidth: 160,
        render: (row) => (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <span style={{ fontSize: '0.875rem' }}>
              {row.attributes?.color || '-'} / {row.attributes?.size || '-'}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#888' }}>
              {row.attributes?.material || '-'} / {row.attributes?.grade || '-'}
            </span>
          </Box>
        ),
      },
      {
        id: 'options',
        label: '选项',
        minWidth: 160,
        render: (row) => (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {(row.options || []).map((option, idx) => (
              <Chip
                key={idx}
                size='small'
                label={option}
                variant='outlined'
              />
            ))}
          </Box>
        ),
      },
      {
        id: 'status',
        label: '状态',
        minWidth: 100,
        align: 'center',
        render: (row) => (
          <Chip
            size='small'
            label={getStatusLabel(row.status)}
            color={getStatusColor(row.status) as any}
          />
        ),
      },
    ],
    []
  );

  const rowActions: RowAction<ProductConfig>[] = useMemo(
    () => [
      {
        label: '编辑',
        icon: <Edit size={16} />,
        color: 'primary',
        onClick: (row) => handleEdit(row),
      },
      {
        label: '删除',
        icon: <Delete size={16} />,
        color: 'error',
        onClick: (row) => handleDelete(row.id),
        confirm: true,
        confirmMessage: '确定要删除这个配置吗？',
      },
    ],
    []
  );

  const headerContent = (
    <Box>
      <Grid
        container
        spacing={3}
        sx={{ mb: 2 }}
      >
        {[
          { label: '配置总数', value: stats.total, icon: <Settings size={20} />, color: 'primary' },
          { label: '启用配置', value: stats.active, icon: <Zap size={20} />, color: 'success' },
          { label: '草稿配置', value: stats.draft, icon: <Package size={20} />, color: 'warning' },
          { label: '归档配置', value: stats.archived, icon: <Shield size={20} />, color: 'error' },
        ].map((stat) => (
          <Grid
            size={{ xs: 6, sm: 3 }}
            key={stat.label}
          >
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  mb: 1,
                  color: `${stat.color}.main`,
                }}
              >
                {stat.icon}
                <Box sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>{stat.label}</Box>
              </Box>
              <Box sx={{ fontWeight: 'bold', fontSize: '1.5rem' }}>{stat.value}</Box>
            </Box>
          </Grid>
        ))}
      </Grid>

      <Box
        sx={{
          p: 2,
          borderRadius: 2,
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          mb: 2,
        }}
      >
        <Box sx={{ fontWeight: 600, mb: 2 }}>属性定义</Box>
        <Grid
          container
          spacing={2}
        >
          {configAttributes.map((attr) => (
            <Grid
              size={{ xs: 12, sm: 6, md: 4 }}
              key={attr.name}
            >
              <Box
                sx={{
                  p: 2,
                  borderRadius: 1,
                  backgroundColor: attr.required ? 'primary.50' : 'grey.50',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 1,
                  }}
                >
                  <Box sx={{ fontWeight: 500 }}>{attr.name}</Box>
                  <Chip
                    size='small'
                    label={attr.required ? '必填' : '选填'}
                    color={attr.required ? 'primary' : 'default'}
                  />
                </Box>
                <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                  类型: {attr.type}
                  {attr.values && attr.values.length > 0 && (
                    <span> - 可选值: {attr.values.join(', ')}</span>
                  )}
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );

  return (
    <PageContainer
      title='产品配置管理'
      subtitle='管理产品的配置选项和属性定义'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={filteredConfigs}
        loading={loading}
        searchable
        searchPlaceholder='搜索配置名称或编码...'
        onSearch={handleSearch}
        filters={filters}
        filtersValue={{ status: statusFilter }}
        onFilterChange={handleFilterChange}
        rowActions={rowActions}
        actions={[
          {
            label: '创建配置',
            icon: <Plus size={16} />,
            onClick: handleCreate,
            variant: 'contained',
          },
        ]}
        onRefresh={loadConfigs}
        headerContent={headerContent}
        emptyMessage='暂无配置数据'
      />

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{editingConfig ? '编辑产品配置' : '创建产品配置'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <TextField
              label='配置名称 *'
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder='输入配置名称'
              fullWidth
              required
            />
            <TextField
              label='配置编码 *'
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder='输入配置编码'
              fullWidth
              required
            />
            <FormControl fullWidth>
              <InputLabel>状态</InputLabel>
              <Select
                value={formData.status}
                label='状态'
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <MenuItem value='draft'>草稿</MenuItem>
                <MenuItem value='active'>启用</MenuItem>
                <MenuItem value='archived'>归档</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ fontWeight: 500 }}>属性配置</Box>
            <Grid
              container
              spacing={3}
            >
              <Grid size={{ xs: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>颜色</InputLabel>
                  <Select
                    value={formData.attributes.color}
                    label='颜色'
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        attributes: { ...formData.attributes, color: e.target.value },
                      })
                    }
                  >
                    <MenuItem value='红色'>红色</MenuItem>
                    <MenuItem value='蓝色'>蓝色</MenuItem>
                    <MenuItem value='绿色'>绿色</MenuItem>
                    <MenuItem value='黑色'>黑色</MenuItem>
                    <MenuItem value='白色'>白色</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>尺寸</InputLabel>
                  <Select
                    value={formData.attributes.size}
                    label='尺寸'
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        attributes: { ...formData.attributes, size: e.target.value },
                      })
                    }
                  >
                    <MenuItem value='S'>S</MenuItem>
                    <MenuItem value='M'>M</MenuItem>
                    <MenuItem value='L'>L</MenuItem>
                    <MenuItem value='XL'>XL</MenuItem>
                    <MenuItem value='XXL'>XXL</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>材质</InputLabel>
                  <Select
                    value={formData.attributes.material}
                    label='材质'
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        attributes: { ...formData.attributes, material: e.target.value },
                      })
                    }
                  >
                    <MenuItem value='塑料'>塑料</MenuItem>
                    <MenuItem value='金属'>金属</MenuItem>
                    <MenuItem value='玻璃'>玻璃</MenuItem>
                    <MenuItem value='木材'>木材</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>等级</InputLabel>
                  <Select
                    value={formData.attributes.grade}
                    label='等级'
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        attributes: { ...formData.attributes, grade: e.target.value },
                      })
                    }
                  >
                    <MenuItem value='A级'>A级</MenuItem>
                    <MenuItem value='B级'>B级</MenuItem>
                    <MenuItem value='C级'>C级</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Box sx={{ fontWeight: 500 }}>可选服务</Box>
            <FormGroup>
              {['快速发货', '免费配送', '质量保证', '专属客服'].map((option) => (
                <FormControlLabel
                  key={option}
                  control={
                    <Checkbox
                      checked={formData.options.includes(option)}
                      onChange={(e) => handleOptionChange(option, e.target.checked)}
                    />
                  }
                  label={option}
                />
              ))}
            </FormGroup>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>取消</Button>
          <Button
            variant='contained'
            onClick={handleSave}
          >
            {editingConfig ? '更新配置' : '创建配置'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default PdmProductConfigPage;
