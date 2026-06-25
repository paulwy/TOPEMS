import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormGroup,
  FormControlLabel,
  CircularProgress,
} from '@mui/material';
import { Settings, Plus, Edit, Delete, Search, Layers, Package, Zap, Shield } from 'lucide-react';
import { pdmApi } from '@/api/pdm';
import type { ProductConfig } from '@/api/pdm';
import { useAppStore } from '@/store';
import { apiLogger } from '@/utils/logger';

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
  const [selectedConfig, setSelectedConfig] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
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
        if (items.length > 0 && !selectedConfig) {
          setSelectedConfig(items[0].id);
        }
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
      addNotification({ title: '错误', message: editingConfig ? '更新失败' : '创建失败', type: 'error' });
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

  const filteredConfigs = configs.filter((config) => {
    return (
      config.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      config.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const stats = {
    total: configs.length,
    active: configs.filter((c) => c.status === 'active').length,
    draft: configs.filter((c) => c.status === 'draft').length,
    archived: configs.filter((c) => c.status === 'archived').length,
  };

  return (
    <Box sx={{ flex: 1 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4,
        }}
      >
        <div>
          <Typography
            variant='h4'
            sx={{ fontWeight: 'bold', mb: 1 }}
          >
            产品配置管理
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            管理产品的配置选项和属性定义
          </Typography>
        </div>
        <Button
          variant='contained'
          startIcon={<Plus />}
          onClick={handleCreate}
          sx={{ bgcolor: 'primary.main' }}
        >
          创建配置
        </Button>
      </Box>

      <Grid
        container
        spacing={3}
        sx={{ mb: 4 }}
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
            <Card>
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    mb: 2,
                  }}
                >
                  <Box sx={{ color: stat.color }}>{stat.icon}</Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {stat.label}
                  </Typography>
                </Box>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 'bold' }}
                >
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid
        container
        spacing={3}
      >
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card>
            <CardHeader title='属性定义' />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {configAttributes.map((attr) => (
                  <Box
                    key={attr.name}
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
                      <Typography
                        variant='body1'
                        sx={{ fontWeight: 500 }}
                      >
                        {attr.name}
                      </Typography>
                      <Chip
                        size='small'
                        label={attr.required ? '必填' : '选填'}
                        color={attr.required ? 'primary' : 'default'}
                      />
                    </Box>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      类型: {attr.type}
                      {attr.values && attr.values.length > 0 && (
                        <span> - 可选值: {attr.values.join(', ')}</span>
                      )}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <Card>
            <CardHeader
              title='配置列表'
              action={
                <TextField
                  placeholder='搜索配置...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size='small'
                  sx={{ width: 200 }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <Search
                          size={16}
                          sx={{ mr: 1 }}
                        />
                      ),
                    },
                  }}
                />
              }
            />
            <CardContent>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>配置名称</TableCell>
                        <TableCell>配置编码</TableCell>
                        <TableCell>属性</TableCell>
                        <TableCell>选项</TableCell>
                        <TableCell>状态</TableCell>
                        <TableCell>操作</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredConfigs.map((config) => (
                        <TableRow key={config.id}>
                          <TableCell>{config.name}</TableCell>
                          <TableCell>{config.code}</TableCell>
                          <TableCell>
                            <Box
                              sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 0.5,
                              }}
                            >
                              <Typography variant='caption'>
                                {config.attributes?.color || '-'} / {config.attributes?.size || '-'}
                              </Typography>
                              <Typography
                                variant='caption'
                                color='text.secondary'
                              >
                                {config.attributes?.material || '-'} / {config.attributes?.grade || '-'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {(config.options || []).map((option, idx) => (
                                <Chip
                                  key={idx}
                                  size='small'
                                  label={option}
                                  variant='outlined'
                                />
                              ))}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size='small'
                              label={getStatusLabel(config.status)}
                              color={getStatusColor(config.status)}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <IconButton size='small' onClick={() => handleEdit(config)}>
                                <Edit size={16} />
                              </IconButton>
                              <IconButton
                                size='small'
                                color='error'
                                onClick={() => handleDelete(config.id)}
                              >
                                <Delete size={16} />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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
            <Typography
              variant='body2'
              sx={{ fontWeight: 500 }}
            >
              属性配置
            </Typography>
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
                    onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, color: e.target.value } })}
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
                    onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, size: e.target.value } })}
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
                    onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, material: e.target.value } })}
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
                    onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, grade: e.target.value } })}
                  >
                    <MenuItem value='A级'>A级</MenuItem>
                    <MenuItem value='B级'>B级</MenuItem>
                    <MenuItem value='C级'>C级</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Typography
              variant='body2'
              sx={{ fontWeight: 500 }}
            >
              可选服务
            </Typography>
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
          <Button variant='contained' onClick={handleSave} sx={{ bgcolor: 'primary.main' }}>
            {editingConfig ? '更新配置' : '创建配置'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PdmProductConfigPage;