import React, { useState } from 'react';
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
} from '@mui/material';
import { Settings, Plus, Edit, Delete, Search, Layers, Package, Zap, Shield } from 'lucide-react';

interface ProductConfig {
  id: string;
  name: string;
  code: string;
  status: 'active' | 'draft' | 'archived';
  attributes: {
    color: string;
    size: string;
    material: string;
    grade: string;
  };
  options: string[];
  createdAt: string;
}

interface ConfigAttribute {
  name: string;
  type: 'select' | 'text' | 'number' | 'boolean';
  values?: string[];
  required: boolean;
}

export const PdmProductConfigPage: React.FC = () => {
  const [selectedConfig, setSelectedConfig] = useState('CFG001');
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);

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

  const productConfigs: ProductConfig[] = [
    {
      id: 'CFG001',
      name: '标准配置 A',
      code: 'CFG-A-001',
      status: 'active',
      attributes: {
        color: '蓝色',
        size: 'M',
        material: '塑料',
        grade: 'A级',
      },
      options: ['快速发货', '免费配送', '质量保证'],
      createdAt: '2024-01-15 10:00:00',
    },
    {
      id: 'CFG002',
      name: '高级配置 B',
      code: 'CFG-B-001',
      status: 'active',
      attributes: {
        color: '黑色',
        size: 'L',
        material: '金属',
        grade: 'A级',
      },
      options: ['快速发货', '免费配送', '质量保证', '专属客服'],
      createdAt: '2024-01-14 09:00:00',
    },
    {
      id: 'CFG003',
      name: '经济配置 C',
      code: 'CFG-C-001',
      status: 'draft',
      attributes: {
        color: '白色',
        size: 'S',
        material: '塑料',
        grade: 'B级',
      },
      options: ['标准配送'],
      createdAt: '2024-01-13 14:00:00',
    },
    {
      id: 'CFG004',
      name: '定制配置 D',
      code: 'CFG-D-001',
      status: 'active',
      attributes: {
        color: '红色',
        size: 'XL',
        material: '玻璃',
        grade: 'A级',
      },
      options: ['定制服务', '专属包装', '优先发货'],
      createdAt: '2024-01-12 11:00:00',
    },
  ];

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

  const stats = [
    {
      label: '配置总数',
      value: '24',
      icon: <Settings size={20} />,
      color: 'primary',
    },
    {
      label: '启用配置',
      value: '18',
      icon: <Zap size={20} />,
      color: 'success',
    },
    {
      label: '草稿配置',
      value: '4',
      icon: <Package size={20} />,
      color: 'warning',
    },
    {
      label: '归档配置',
      value: '2',
      icon: <Shield size={20} />,
      color: 'error',
    },
  ];

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
          onClick={() => setOpenDialog(true)}
        >
          创建配置
        </Button>
      </Box>

      <Grid
        container
        spacing={3}
        sx={{ mb: 4 }}
      >
        {stats.map((stat) => (
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
                    {productConfigs.map((config) => (
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
                              {config.attributes.color} / {config.attributes.size}
                            </Typography>
                            <Typography
                              variant='caption'
                              color='text.secondary'
                            >
                              {config.attributes.material} / {config.attributes.grade}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {config.options.map((option, idx) => (
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
                            <IconButton size='small'>
                              <Edit size={16} />
                            </IconButton>
                            <IconButton
                              size='small'
                              color='error'
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
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
      >
        <DialogTitle>创建产品配置</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <TextField
              label='配置名称'
              placeholder='输入配置名称'
              fullWidth
            />
            <TextField
              label='配置编码'
              placeholder='输入配置编码'
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>状态</InputLabel>
              <Select
                defaultValue='draft'
                label='状态'
              >
                <MenuItem value='draft'>草稿</MenuItem>
                <MenuItem value='active'>启用</MenuItem>
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
                    defaultValue=''
                    label='颜色'
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
                    defaultValue=''
                    label='尺寸'
                  >
                    <MenuItem value='S'>S</MenuItem>
                    <MenuItem value='M'>M</MenuItem>
                    <MenuItem value='L'>L</MenuItem>
                    <MenuItem value='XL'>XL</MenuItem>
                    <MenuItem value='XXL'>XXL</MenuItem>
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
              <FormControlLabel
                control={<Checkbox />}
                label='快速发货'
              />
              <FormControlLabel
                control={<Checkbox />}
                label='免费配送'
              />
              <FormControlLabel
                control={<Checkbox />}
                label='质量保证'
              />
              <FormControlLabel
                control={<Checkbox />}
                label='专属客服'
              />
            </FormGroup>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>取消</Button>
          <Button variant='contained'>创建配置</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PdmProductConfigPage;
