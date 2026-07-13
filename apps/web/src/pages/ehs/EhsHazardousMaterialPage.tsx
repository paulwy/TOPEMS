import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Button,
} from '@mui/material';
import {
  Plus,
  Eye,
  Edit,
  FlaskConical,
  AlertTriangle,
  Package,
  Clock,
  FileWarning,
} from 'lucide-react';
import { ListPageTemplate, type ColumnDef, type RowAction } from '@/components/templates';
import { PageContainer } from '@/components/common/PageContainerV2';
import { ehsApi } from '@/api/ehs';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

interface HazardousMaterial {
  id: string;
  material_code: string;
  name: string;
  category: string;
  cas_no: string;
  quantity: number;
  unit: string;
  storage_location: string;
  danger_level: string;
  expiry_date: string;
  description?: string;
  created_at?: string;
}

const categoryOptions = [
  { label: '易燃', value: '易燃' },
  { label: '易爆', value: '易爆' },
  { label: '有毒', value: '有毒' },
  { label: '腐蚀', value: '腐蚀' },
  { label: '氧化', value: '氧化' },
  { label: '放射性', value: '放射性' },
];

const dangerLevelOptions = [
  { label: '一级', value: '一级' },
  { label: '二级', value: '二级' },
  { label: '三级', value: '三级' },
  { label: '四级', value: '四级' },
];

const unitOptions = [
  { label: 'kg', value: 'kg' },
  { label: 'L', value: 'L' },
  { label: '瓶', value: '瓶' },
  { label: '桶', value: '桶' },
  { label: '箱', value: '箱' },
  { label: '袋', value: '袋' },
];

const EhsHazardousMaterialPage: React.FC = () => {
  const [materials, setMaterials] = useState<HazardousMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dangerLevelFilter, setDangerLevelFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showMSDSModal, setShowMSDSModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<HazardousMaterial | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<HazardousMaterial | null>(null);
  const [msdsData, setMsdsData] = useState<any>(null);
  const [msdsLoading, setMsdsLoading] = useState(false);
  const [formData, setFormData] = useState({
    material_code: '',
    name: '',
    category: '',
    hazard_class: '',
    cas_no: '',
    quantity: '',
    unit: '',
    storage_location: '',
    danger_level: '',
    expiry_date: '',
    description: '',
  });

  const addNotification = useNotificationStore((state) => state.addNotification);

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = useCallback(async () => {
    try {
      setLoading(true);
      const response = await ehsApi.hazardousMaterials.listHazardousMaterials({ pagesize: 100 });
      if (response.success && response.data) {
        const data = response.data as any;
        const materialsData = Array.isArray(data) ? data : data.data || [];
        setMaterials(materialsData as HazardousMaterial[]);
      } else {
        setMaterials([]);
      }
    } catch (err: unknown) {
      apiLogger.error('加载危化品列表失败:', err);
      addNotification({ title: '错误', message: '加载危化品列表失败', type: 'error' });
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  const getDangerLevelChip = (level: string) => {
    const levelMap: Record<string, { bg: string; color: string }> = {
      一级: { bg: 'error.lighter', color: 'error.dark' },
      二级: { bg: 'warning.100', color: ct.yellow[600] },
      三级: { bg: 'primary.100', color: 'primary.dark' },
      四级: { bg: 'success.lighter', color: 'success.dark' },
    };
    const colors = levelMap[level] || { bg: 'grey.100', color: 'text.secondary' };
    return (
      <Chip
        label={level}
        size='small'
        sx={{
          backgroundColor: colors.bg,
          color: colors.color,
          fontWeight: 500,
        }}
      />
    );
  };

  const getCategoryChip = (category: string) => {
    const categoryMap: Record<string, { bg: string; color: string }> = {
      易燃: { bg: 'error.100', color: 'error.700' },
      易爆: { bg: 'warning.100', color: ct.yellow[600] },
      有毒: { bg: ct.secondary[100], color: 'secondary.700' },
      腐蚀: { bg: ct.pink[100], color: ct.pink[700] },
      氧化: { bg: 'warning.100', color: 'warning.700' },
      放射性: { bg: 'secondary.100', color: 'secondary.600' },
    };
    const colors = categoryMap[category] || { bg: 'grey.100', color: 'text.secondary' };
    return (
      <Chip
        label={category}
        size='small'
        sx={{
          backgroundColor: colors.bg,
          color: colors.color,
          fontWeight: 500,
        }}
      />
    );
  };

  const getExpiryStatus = (expiryDate: string) => {
    if (!expiryDate) return null;
    const now = new Date();
    const expiry = new Date(expiryDate);
    const daysDiff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff <= 0) return { text: '已过期', color: 'error.dark' as const };
    if (daysDiff <= 30) return { text: '临期', color: 'warning.dark' as const };
    return { text: '正常', color: 'success.dark' as const };
  };

  const filteredMaterials = useMemo(() => {
    return materials.filter((item) => {
      const matchesSearch =
        item.material_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.cas_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.storage_location?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !categoryFilter || item.category === categoryFilter;
      const matchesDangerLevel = !dangerLevelFilter || item.danger_level === dangerLevelFilter;
      return matchesSearch && matchesCategory && matchesDangerLevel;
    });
  }, [materials, searchQuery, categoryFilter, dangerLevelFilter]);

  const paginatedMaterials = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredMaterials.slice(start, start + pageSize);
  }, [filteredMaterials, currentPage]);

  const stats = useMemo(
    () => ({
      total: materials.length,
      expiring: materials.filter((m) => {
        const status = getExpiryStatus(m.expiry_date);
        return status && (status.text === '临期' || status.text === '已过期');
      }).length,
      severe: materials.filter((m) => m.danger_level === '一级' || m.danger_level === '二级')
        .length,
      thisMonth: materials.filter((m) => {
        if (!m.created_at) return false;
        const d = new Date(m.created_at);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length,
    }),
    [materials]
  );

  const columns: ColumnDef<HazardousMaterial>[] = [
    {
      id: 'material_code',
      label: '编码',
      width: 130,
      sortable: true,
      render: (row) => (
        <Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
          {row.material_code}
        </Typography>
      ),
    },
    {
      id: 'name',
      label: '名称',
      width: 150,
      sortable: true,
      render: (row) => <Typography sx={{ fontWeight: 500 }}>{row.name}</Typography>,
    },
    {
      id: 'category',
      label: '分类',
      width: 100,
      align: 'center',
      render: (row) => getCategoryChip(row.category),
    },
    {
      id: 'cas_no',
      label: 'CAS号',
      width: 120,
      render: (row) => (
        <Typography sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
          {row.cas_no || '-'}
        </Typography>
      ),
    },
    {
      id: 'quantity',
      label: '库存量',
      width: 100,
      align: 'right',
      render: (row) => (
        <Typography sx={{ fontWeight: 500 }}>
          {row.quantity ?? 0} {row.unit || ''}
        </Typography>
      ),
    },
    {
      id: 'storage_location',
      label: '存放位置',
      width: 140,
      render: (row) => row.storage_location || '-',
    },
    {
      id: 'danger_level',
      label: '危险等级',
      width: 100,
      align: 'center',
      render: (row) => getDangerLevelChip(row.danger_level),
    },
    {
      id: 'expiry_date',
      label: '有效期',
      width: 130,
      sortable: true,
      render: (row) => {
        const status = getExpiryStatus(row.expiry_date);
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Clock style={{ width: 14, height: 14 }} />
            <Typography sx={{ fontSize: '0.875rem' }}>
              {row.expiry_date ? new Date(row.expiry_date).toLocaleDateString('zh-CN') : '-'}
            </Typography>
            {status && status.text !== '正常' && (
              <Chip
                label={status.text}
                size='small'
                sx={{
                  backgroundColor: status.text === '已过期' ? 'error.lighter' : 'warning.100',
                  color: status.color,
                  fontWeight: 500,
                  height: 20,
                  fontSize: '0.7rem',
                }}
              />
            )}
          </Box>
        );
      },
    },
  ];

  const rowActions: RowAction<HazardousMaterial>[] = [
    {
      label: '查看',
      icon: <Eye size={16} />,
      onClick: (row) => {
        setSelectedMaterial(row);
        setShowDetailModal(true);
      },
      color: 'primary',
    },
    {
      label: '编辑',
      icon: <Edit size={16} />,
      onClick: (row) => {
        setEditingMaterial(row);
        setFormData({
          material_code: row.material_code || '',
          name: row.name || '',
          category: row.category || '',
          hazard_class: (row as any).hazard_class || '',
          cas_no: row.cas_no || '',
          quantity: String(row.quantity ?? ''),
          unit: row.unit || '',
          storage_location: row.storage_location || '',
          danger_level: row.danger_level || '',
          expiry_date: row.expiry_date ? row.expiry_date.split('T')[0] : '',
          description: row.description || '',
        });
        setShowCreateModal(true);
      },
      color: 'primary',
    },
    {
      label: 'MSDS',
      icon: <FileWarning size={16} />,
      onClick: async (row) => {
        try {
          setMsdsLoading(true);
          setSelectedMaterial(row);
          const response = await ehsApi.hazardousMaterials.getMSDSByMaterialId(row.id);
          if (response.success && response.data) {
            setMsdsData(response.data);
          } else {
            setMsdsData(null);
          }
        } catch (err: unknown) {
          apiLogger.error('加载MSDS数据失败:', err);
          addNotification({ title: '错误', message: '加载MSDS数据失败', type: 'error' });
          setMsdsData(null);
        } finally {
          setMsdsLoading(false);
          setShowMSDSModal(true);
        }
      },
      color: 'primary',
    },
  ];

  const StatCard: React.FC<{
    label: string;
    value: number;
    icon: React.ReactNode;
    bgColor: string;
    iconBgColor: string;
    iconColor: string;
  }> = ({ label, value, icon, bgColor, iconBgColor, iconColor }) => (
    <Card sx={{ bgcolor: bgColor }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              bgcolor: iconBgColor,
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box sx={{ color: iconColor, display: 'flex' }}>{icon}</Box>
          </Box>
          <Box>
            <Typography
              variant='body2'
              sx={{ color: 'slate.600', fontSize: '0.875rem' }}
            >
              {label}
            </Typography>
            <Typography
              variant='h5'
              sx={{ fontWeight: 700, color: 'slate.900' }}
            >
              {value}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const headerContent = useMemo(
    () => (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <StatCard
          label='物品总数'
          value={stats.total}
          icon={<FlaskConical />}
          bgColor='error.light'
          iconBgColor='error.lighter'
          iconColor='error.main'
        />
        <StatCard
          label='临期预警'
          value={stats.expiring}
          icon={<AlertTriangle />}
          bgColor='background.paper'
          iconBgColor='warning.100'
          iconColor={ct.yellow[600]}
        />
        <StatCard
          label='严重危化品数'
          value={stats.severe}
          icon={<Package />}
          bgColor='background.paper'
          iconBgColor='error.100'
          iconColor='error.700'
        />
        <StatCard
          label='本月入库'
          value={stats.thisMonth}
          icon={<Clock />}
          bgColor='background.paper'
          iconBgColor='primary.100'
          iconColor='primary.dark'
        />
      </Box>
    ),
    [stats]
  );

  const resetFormData = () => {
    setFormData({
      material_code: '',
      name: '',
      category: '',
      hazard_class: '',
      cas_no: '',
      quantity: '',
      unit: '',
      storage_location: '',
      danger_level: '',
      expiry_date: '',
      description: '',
    });
    setEditingMaterial(null);
  };

  const handleCreate = () => {
    resetFormData();
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    if (!formData.material_code.trim()) {
      addNotification({ title: '错误', message: '请输入编码', type: 'error' });
      return;
    }
    if (!formData.name.trim()) {
      addNotification({ title: '错误', message: '请输入名称', type: 'error' });
      return;
    }
    if (!formData.storage_location.trim()) {
      addNotification({ title: '错误', message: '请输入存放位置', type: 'error' });
      return;
    }
    try {
      const payload = {
        material_code: formData.material_code,
        name: formData.name,
        category: formData.category,
        hazard_class: formData.hazard_class,
        cas_no: formData.cas_no || null,
        quantity: formData.quantity ? Number(formData.quantity) : null,
        unit: formData.unit || null,
        storage_location: formData.storage_location,
        danger_level: formData.danger_level || null,
        expiry_date: formData.expiry_date || null,
        description: formData.description || null,
      };
      if (editingMaterial) {
        await ehsApi.hazardousMaterials.updateHazardousMaterial(editingMaterial.id, payload);
        addNotification({ title: '成功', message: '危化品信息更新成功', type: 'success' });
      } else {
        await ehsApi.hazardousMaterials.createHazardousMaterial(payload);
        addNotification({ title: '成功', message: '危化品入库成功', type: 'success' });
      }
      setShowCreateModal(false);
      loadMaterials();
    } catch (err: unknown) {
      addNotification({
        title: '错误',
        message: editingMaterial ? '更新失败' : '入库失败',
        type: 'error',
      });
      apiLogger.error('保存危化品失败:', err);
    }
  };

  const headerActions = [
    {
      label: '入库登记',
      icon: <Plus sx={{ width: 16, height: 16 }} />,
      onClick: handleCreate,
      variant: 'contained' as const,
      color: 'error' as const,
    },
  ];

  return (
    <PageContainer
      headerProps={{
        actions: headerActions,
        pageIcon: <FlaskConical sx={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.error.main} 0%, ${ct.error[600]} 100%)`,
      }}
      maxWidth='xl'
    >
      <ListPageTemplate
        title=''
        columns={columns}
        data={paginatedMaterials}
        loading={loading}
        pagination={{
          page: currentPage,
          pageSize,
          total: filteredMaterials.length,
          onPageChange: setCurrentPage,
        }}
        searchable
        searchPlaceholder='搜索编码、名称、CAS号或存放位置...'
        searchValue={searchQuery}
        onSearch={(value) => {
          setSearchQuery(value);
          setCurrentPage(0);
        }}
        filters={[
          {
            id: 'category',
            label: '分类',
            type: 'select',
            value: categoryFilter,
            onChange: (value) => {
              setCategoryFilter(String(value));
              setCurrentPage(0);
            },
            options: [{ label: '全部', value: '' }, ...categoryOptions],
          },
          {
            id: 'danger_level',
            label: '危险等级',
            type: 'select',
            value: dangerLevelFilter,
            onChange: (value) => {
              setDangerLevelFilter(String(value));
              setCurrentPage(0);
            },
            options: [{ label: '全部', value: '' }, ...dangerLevelOptions],
          },
        ]}
        rowActions={rowActions}
        onRefresh={loadMaterials}
        showRowNumber
        headerContent={headerContent}
      />

      {/* Create/Edit Dialog */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{editingMaterial ? '编辑危化品' : '入库登记'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label='编码 *'
                value={formData.material_code}
                onChange={(e) => setFormData({ ...formData, material_code: e.target.value })}
                placeholder='请输入危化品编码'
              />
              <TextField
                fullWidth
                label='名称 *'
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder='请输入危化品名称'
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>分类</InputLabel>
                <Select
                  value={formData.category}
                  label='分类'
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {categoryOptions.map((opt) => (
                    <MenuItem
                      key={opt.value}
                      value={opt.value}
                    >
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label='CAS号'
                value={formData.cas_no}
                onChange={(e) => setFormData({ ...formData, cas_no: e.target.value })}
                placeholder='请输入CAS号'
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                type='number'
                label='库存量'
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder='0'
              />
              <FormControl fullWidth>
                <InputLabel>单位</InputLabel>
                <Select
                  value={formData.unit}
                  label='单位'
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                >
                  {unitOptions.map((opt) => (
                    <MenuItem
                      key={opt.value}
                      value={opt.value}
                    >
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label='存放位置 *'
                value={formData.storage_location}
                onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                placeholder='请输入存放位置'
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>危险等级</InputLabel>
                <Select
                  value={formData.danger_level}
                  label='危险等级'
                  onChange={(e) => setFormData({ ...formData, danger_level: e.target.value })}
                >
                  {dangerLevelOptions.map((opt) => (
                    <MenuItem
                      key={opt.value}
                      value={opt.value}
                    >
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                type='date'
                label='有效期'
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } } as any}
              />
            </Box>
            <TextField
              fullWidth
              label='描述'
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder='请输入描述'
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
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>危化品详情</DialogTitle>
        <DialogContent>
          {selectedMaterial ? (
            <Box sx={{ pt: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    编码
                  </Typography>
                  <Typography sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                    {selectedMaterial.material_code}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    名称
                  </Typography>
                  <Typography sx={{ fontWeight: 500 }}>{selectedMaterial.name}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    分类
                  </Typography>
                  <Typography sx={{ mt: 0.5 }}>
                    {getCategoryChip(selectedMaterial.category)}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    CAS号
                  </Typography>
                  <Typography sx={{ fontFamily: 'monospace' }}>
                    {selectedMaterial.cas_no || '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    库存量
                  </Typography>
                  <Typography sx={{ fontWeight: 500 }}>
                    {selectedMaterial.quantity ?? 0} {selectedMaterial.unit || ''}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    存放位置
                  </Typography>
                  <Typography>{selectedMaterial.storage_location || '-'}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    危险等级
                  </Typography>
                  <Typography sx={{ mt: 0.5 }}>
                    {getDangerLevelChip(selectedMaterial.danger_level)}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    有效期
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Clock style={{ width: 16, height: 16 }} />
                    <Typography>
                      {selectedMaterial.expiry_date
                        ? new Date(selectedMaterial.expiry_date).toLocaleDateString('zh-CN')
                        : '-'}
                    </Typography>
                    {(() => {
                      const status = getExpiryStatus(selectedMaterial.expiry_date);
                      return status && status.text !== '正常' ? (
                        <Chip
                          label={status.text}
                          size='small'
                          sx={{
                            backgroundColor:
                              status.text === '已过期' ? 'error.lighter' : 'warning.100',
                            color: status.color,
                            fontWeight: 500,
                          }}
                        />
                      ) : null;
                    })()}
                  </Box>
                </Box>
              </Box>
              <Box>
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600, mb: 1 }}
                >
                  描述
                </Typography>
                <Typography>{selectedMaterial.description || '暂无描述'}</Typography>
              </Box>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 6, color: 'slate.500' }}>暂无详情数据</Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* MSDS Dialog */}
      <Dialog
        open={showMSDSModal}
        onClose={() => setShowMSDSModal(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>MSDS - {selectedMaterial?.name || '化学品安全技术说明书'}</DialogTitle>
        <DialogContent>
          {msdsLoading ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  border: 3,
                  borderColor: 'primary.main',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  mx: 'auto',
                  mb: 2,
                }}
              />
              <Typography sx={{ color: 'slate.600' }}>加载MSDS数据中...</Typography>
            </Box>
          ) : msdsData ? (
            <Box sx={{ pt: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    化学品名称
                  </Typography>
                  <Typography sx={{ fontWeight: 500 }}>{msdsData.chemical_name || '-'}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    CAS号
                  </Typography>
                  <Typography sx={{ fontFamily: 'monospace' }}>{msdsData.cas_no || '-'}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    分子式
                  </Typography>
                  <Typography>{msdsData.molecular_formula || '-'}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    分子量
                  </Typography>
                  <Typography>{msdsData.molecular_weight || '-'}</Typography>
                </Box>
              </Box>
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600, mb: 1 }}
                >
                  危险性概述
                </Typography>
                <Typography>{msdsData.hazards_summary || '暂无信息'}</Typography>
              </Box>
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600, mb: 1 }}
                >
                  急救措施
                </Typography>
                <Typography>{msdsData.first_aid || '暂无信息'}</Typography>
              </Box>
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600, mb: 1 }}
                >
                  消防措施
                </Typography>
                <Typography>{msdsData.fire_fighting || '暂无信息'}</Typography>
              </Box>
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600, mb: 1 }}
                >
                  泄漏应急处理
                </Typography>
                <Typography>{msdsData.leak_handling || '暂无信息'}</Typography>
              </Box>
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600, mb: 1 }}
                >
                  储存注意事项
                </Typography>
                <Typography>{msdsData.storage_notes || '暂无信息'}</Typography>
              </Box>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 6, color: 'slate.500' }}>暂无MSDS数据</Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowMSDSModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default EhsHazardousMaterialPage;
