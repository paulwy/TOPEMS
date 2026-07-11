import React, { useState, useEffect, useMemo } from 'react';
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
  CircularProgress,
  Button,
} from '@mui/material';
import { Plus, Eye, Handshake, Users, TrendingUp, Award, Edit2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ListPageTemplate, type ColumnDef, type RowAction } from '@/components/templates';
import { srmApi } from '@/api/srm';
import type {
  Supplier,
  PerformanceSummary,
  ScoreLevelDistribution,
  CreateSupplierRequest,
} from '@/api/srm';
import { useAppStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { PageContainer } from '@/components/common';
import { SRM_PATHS } from '@/modules/srm/config';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const SrmSupplierPage: React.FC = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [performanceSummary, setPerformanceSummary] = useState<PerformanceSummary | null>(null);
  const [scoreDistribution, setScoreDistribution] = useState<ScoreLevelDistribution[]>([]);
  const [formData, setFormData] = useState<Partial<CreateSupplierRequest>>({
    supplier_no: '',
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    category: '',
    risklevel: 'medium',
    status: 'active',
  });
  const addNotification = useAppStore((state) => state.addNotification);

  useEffect(() => {
    loadSuppliers();
    loadPerformanceSummary();
    loadScoreDistribution();
  }, []);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const response = await srmApi.listSuppliers();
      if (response.success && response.data) {
        const data = response.data as any;
        const items = Array.isArray(data) ? data : data.suppliers || [];
        const adapted = items.map((item: { [key: string]: unknown }) => ({
          ...item,
          supplier_no: item.supplier_no || item.supplierNo || '',
          contact_phone: item.phone || item.contactPhone || item.contact_phone || '',
          status:
            item.status === 'active' ? '启用' : item.status === 'inactive' ? '禁用' : item.status,
        }));
        setSuppliers(adapted);
      } else {
        setSuppliers([]);
      }
    } catch (err: unknown) {
      apiLogger.error('加载供应商数据失败:', err);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPerformanceSummary = async () => {
    try {
      const response = await srmApi.getPerformanceSummary();
      if (response.success && response.data) {
        setPerformanceSummary(response.data);
      }
    } catch (err: unknown) {
      apiLogger.error('加载绩效汇总失败:', err);
    }
  };

  const loadScoreDistribution = async () => {
    try {
      const response = await srmApi.getScoreLevelDistribution();
      if (response.success && response.data) {
        setScoreDistribution(response.data.distribution);
      }
    } catch (err: unknown) {
      apiLogger.error('加载评分分布失败:', err);
    }
  };

  const getRiskStyle = (level: string) => {
    if (level === 'low') return { bgcolor: 'success.lighter', color: 'success.700', label: '低' };
    if (level === 'medium') return { bgcolor: 'warning.light', color: 'warning.700', label: '中' };
    return { bgcolor: 'error.lighter', color: 'error.darker', label: '高' };
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      启用: { bg: 'success.lighter', color: 'success.700' },
      禁用: { bg: 'error.lighter', color: 'error.darker' },
    };
    const colors = statusMap[status] || { bg: 'grey.100', color: ct.text.secondary };
    return (
      <Chip
        label={status}
        size='small'
        sx={{ bgcolor: colors.bg, color: colors.color, fontWeight: 500 }}
      />
    );
  };

  const RiskChip: React.FC<{ level: string }> = ({ level }) => {
    const style = getRiskStyle(level);
    return (
      <Chip
        label={style.label}
        size='small'
        sx={{ bgcolor: style.bgcolor, color: style.color, fontWeight: 500 }}
      />
    );
  };

  const columns: ColumnDef<Supplier>[] = useMemo(
    () => [
      { id: 'supplier_no', label: '编号' },
      { id: 'name', label: '名称' },
      { id: 'contact_person', label: '联系人' },
      { id: 'contact_phone', label: '电话' },
      { id: 'category', label: '类别' },
      {
        id: 'risklevel',
        label: '风险等级',
        render: (row) => <RiskChip level={row.risklevel || 'medium'} />,
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.status),
      },
    ],

    [suppliers]
  );

  const handleEdit = (row: Supplier) => {
    setEditingId(row.id);
    setFormData({
      supplier_no: row.supplier_no,
      name: row.name,
      contact_person: row.contact_person,
      phone: row.phone,
      email: row.email,
      address: row.address,
      category: row.category,
      risklevel: row.risklevel,
      status: row.status === '启用' ? 'active' : 'inactive',
      legal_name: row.legal_name,
    });
    setShowEditModal(true);
  };

  const handleDelete = async (row: Supplier) => {
    try {
      const response = await srmApi.deleteSupplier(row.id);
      if (response.success) {
        addNotification({ title: '成功', message: '供应商删除成功', type: 'success' });
        loadSuppliers();
        loadPerformanceSummary();
      } else {
        addNotification({ title: '错误', message: '删除失败', type: 'error' });
      }
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '删除失败', type: 'error' });
      apiLogger.error('删除供应商失败:', err);
    }
  };

  const rowActions: RowAction<Supplier>[] = useMemo(
    () => [
      {
        label: '详情',
        icon: <Eye style={{ width: 16, height: 16 }} />,
        onClick: (row) => navigate(SRM_PATHS.supplierDetail.replace(':id', row.id)),
      },
      {
        label: '编辑',
        icon: <Edit2 style={{ width: 16, height: 16 }} />,
        onClick: handleEdit,
      },
      {
        label: '删除',
        icon: <Trash2 style={{ width: 16, height: 16 }} />,
        onClick: handleDelete,
        color: 'error',
      },
      {
        label: '评估',
        icon: <Award style={{ width: 16, height: 16 }} />,
        onClick: (row) => navigate(`'/srm/evaluations'`),
      },
    ],
    [navigate]
  );

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      return (
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.supplier_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.contact_person && s.contact_person.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    });
  }, [suppliers, searchTerm]);

  const handleCreate = () => {
    setFormData({
      supplier_no: '',
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      category: '',
      risklevel: 'medium',
      status: 'active',
    });
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    try {
      await srmApi.createSupplier({
        supplier_no: formData.supplier_no || '',
        name: formData.name || '',
        contact_person: formData.contact_person,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        category: formData.category || '',
        risklevel: formData.risklevel || 'medium',
        status: formData.status || 'active',
        legal_name: formData.name,
      });
      addNotification({ title: '成功', message: '供应商创建成功', type: 'success' });
      setShowCreateModal(false);
      loadSuppliers();
      loadPerformanceSummary();
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '创建失败', type: 'error' });
      apiLogger.error('创建供应商失败:', err);
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    try {
      await srmApi.updateSupplier(editingId, {
        supplier_no: formData.supplier_no || '',
        name: formData.name || '',
        contact_person: formData.contact_person,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        category: formData.category || '',
        risklevel: formData.risklevel || 'medium',
        status: formData.status || 'active',
        legal_name: formData.name,
      });
      addNotification({ title: '成功', message: '供应商更新成功', type: 'success' });
      setShowEditModal(false);
      setEditingId(null);
      loadSuppliers();
      loadPerformanceSummary();
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '更新失败', type: 'error' });
      apiLogger.error('更新供应商失败:', err);
    }
  };

  const stats = useMemo(() => {
    return {
      total: suppliers.length,
      active: suppliers.filter((s) => s.status === '启用').length,
      lowRisk: suppliers.filter((s) => s.risklevel === 'low').length,
      highRisk: suppliers.filter((s) => s.risklevel === 'high').length,
    };
  }, [suppliers]);

  const getLevelColor = (level: string) => {
    const colorMap: Record<string, { bg: string; color: string }> = {
      A: { bg: 'success.lighter', color: 'success.700' },
      B: { bg: 'primary.100', color: 'primary.dark' },
      C: { bg: 'warning.light', color: 'warning.700' },
      D: { bg: 'warning.light', color: ct.warning[800] },
      E: { bg: 'error.lighter', color: 'error.darker' },
    };
    return colorMap[level] || { bg: 'grey.100', color: 'grey.600' };
  };

  const headerContent = useMemo(
    () => (
      <Box>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 2,
            mb: 4,
          }}
        >
          <Card sx={{ bgcolor: 'secondary.light' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: 'secondary.light',
                    borderRadius: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Users sx={{ width: 20, height: 20, color: ct.purple[500] }} />
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                  >
                    供应商总数
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
                    bgcolor: 'success.lighter',
                    borderRadius: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Users sx={{ width: 20, height: 20, color: 'success.dark' }} />
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                  >
                    已启用
                  </Typography>
                  <Typography
                    variant='h5'
                    sx={{ fontWeight: 700, color: 'slate.900' }}
                  >
                    {stats.active}
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
                    borderRadius: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Users sx={{ width: 20, height: 20, color: 'success.dark' }} />
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                  >
                    低风险
                  </Typography>
                  <Typography
                    variant='h5'
                    sx={{ fontWeight: 700, color: 'slate.900' }}
                  >
                    {stats.lowRisk}
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
                    borderRadius: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Users sx={{ width: 20, height: 20, color: 'error.dark' }} />
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                  >
                    高风险
                  </Typography>
                  <Typography
                    variant='h5'
                    sx={{ fontWeight: 700, color: 'slate.900' }}
                  >
                    {stats.highRisk}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {performanceSummary && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(1, 1fr)',
                md: 'repeat(3, 1fr)',
              },
              gap: 2,
              mb: 4,
            }}
          >
            <Card sx={{ bgcolor: 'warning.light' }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      bgcolor: 'warning.light',
                      borderRadius: 3,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Award sx={{ width: 20, height: 20, color: 'warning.dark' }} />
                  </Box>
                  <Box>
                    <Typography
                      variant='body2'
                      sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                    >
                      综合评分
                    </Typography>
                    <Typography
                      variant='h5'
                      sx={{ fontWeight: 700, color: 'slate.900' }}
                    >
                      {performanceSummary.avg_overall_score.toFixed(1)}
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
                      bgcolor: 'primary.100',
                      borderRadius: 3,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <TrendingUp sx={{ width: 20, height: 20, color: 'primary.main' }} />
                  </Box>
                  <Box>
                    <Typography
                      variant='body2'
                      sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                    >
                      评估覆盖率
                    </Typography>
                    <Typography
                      variant='h5'
                      sx={{ fontWeight: 700, color: 'slate.900' }}
                    >
                      {performanceSummary.evaluation_rate}%
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
                      borderRadius: 3,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Award sx={{ width: 20, height: 20, color: 'success.dark' }} />
                  </Box>
                  <Box>
                    <Typography
                      variant='body2'
                      sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                    >
                      已评估供应商
                    </Typography>
                    <Typography
                      variant='h5'
                      sx={{ fontWeight: 700, color: 'slate.900' }}
                    >
                      {performanceSummary.evaluated_suppliers}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {scoreDistribution.length > 0 && (
          <Card sx={{ mb: 4 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography
                variant='h6'
                sx={{ mb: 2, fontWeight: 600 }}
              >
                评分等级分布
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {scoreDistribution.map((item) => {
                  const colors = getLevelColor(item.level);
                  return (
                    <Box
                      key={item.level}
                      sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                    >
                      <Chip
                        label={`${item.level}级`}
                        size='small'
                        sx={{ bgcolor: colors.bg, color: colors.color }}
                      />
                      <Typography
                        variant='body2'
                        sx={{ color: 'slate.600' }}
                      >
                        {item.count}家
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </CardContent>
          </Card>
        )}
      </Box>
    ),
    [stats, performanceSummary, scoreDistribution]
  );

  return (
    <PageContainer
      title='供应商管理'
      subtitle='Supplier Management'
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, secondary.light 0%, ${ct.background.default} 100%)`,
      }}
      padding={false}
      headerProps={{
        pageIcon: <Handshake style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.teal.main} 0%, ${ct.teal.dark} 100%)`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={filteredSuppliers}
        loading={loading}
        searchable
        searchPlaceholder='搜索供应商名称或编号...'
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        rowActions={rowActions}
        actions={[
          {
            label: '新增供应商',
            icon: <Plus style={{ width: 18, height: 18 }} />,
            onClick: handleCreate,
            variant: 'contained',
          },
          {
            label: '绩效报表',
            icon: <TrendingUp style={{ width: 18, height: 18 }} />,
            onClick: () => navigate(SRM_PATHS.performance),
            variant: 'outlined',
          },
        ]}
        headerContent={headerContent}
        getRowId={(row) => row.id}
        emptyMessage='暂无供应商数据'
      />
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>新增供应商</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label='编号 *'
                value={formData.supplier_no}
                onChange={(e) => setFormData({ ...formData, supplier_no: e.target.value })}
                placeholder='请输入供应商编号'
              />
              <TextField
                fullWidth
                label='名称 *'
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder='请输入供应商名称'
              />
              <TextField
                fullWidth
                label='联系人'
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                placeholder='请输入联系人'
              />
              <TextField
                fullWidth
                label='电话'
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder='请输入联系电话'
              />
              <TextField
                fullWidth
                label='邮箱'
                type='email'
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder='请输入邮箱'
              />
              <TextField
                fullWidth
                label='类别'
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder='请输入类别'
              />
              <TextField
                fullWidth
                select
                label='风险等级'
                value={formData.risklevel}
                onChange={(e) => setFormData({ ...formData, risklevel: e.target.value })}
              >
                <option value='low'>低风险</option>
                <option value='medium'>中风险</option>
                <option value='high'>高风险</option>
              </TextField>
              <TextField
                fullWidth
                select
                label='状态'
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value='active'>启用</option>
                <option value='inactive'>禁用</option>
              </TextField>
            </Box>
            <TextField
              fullWidth
              label='地址'
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder='请输入地址'
              multiline
              rows={2}
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
            sx={{ bgcolor: ct.purple[500] }}
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
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>编辑供应商</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label='编号 *'
                value={formData.supplier_no}
                onChange={(e) => setFormData({ ...formData, supplier_no: e.target.value })}
                placeholder='请输入供应商编号'
              />
              <TextField
                fullWidth
                label='名称 *'
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder='请输入供应商名称'
              />
              <TextField
                fullWidth
                label='联系人'
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                placeholder='请输入联系人'
              />
              <TextField
                fullWidth
                label='电话'
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder='请输入联系电话'
              />
              <TextField
                fullWidth
                label='邮箱'
                type='email'
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder='请输入邮箱'
              />
              <TextField
                fullWidth
                label='类别'
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder='请输入类别'
              />
              <TextField
                fullWidth
                select
                label='风险等级'
                value={formData.risklevel}
                onChange={(e) => setFormData({ ...formData, risklevel: e.target.value })}
              >
                <option value='low'>低风险</option>
                <option value='medium'>中风险</option>
                <option value='high'>高风险</option>
              </TextField>
              <TextField
                fullWidth
                select
                label='状态'
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value='active'>启用</option>
                <option value='inactive'>禁用</option>
              </TextField>
            </Box>
            <TextField
              fullWidth
              label='地址'
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder='请输入地址'
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
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
            onClick={handleUpdate}
            sx={{ bgcolor: ct.purple[500] }}
          >
            更新
          </Button>
        </DialogActions>
      </Dialog>{' '}
    </PageContainer>
  );
};

export default SrmSupplierPage;
