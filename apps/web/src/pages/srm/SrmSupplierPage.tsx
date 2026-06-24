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
} from '@mui/material';
import { Button } from '@mui/material';
import { Plus, Eye, Users, TrendingUp, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ListPageTemplate, type ColumnDef, type RowAction } from '@/components/templates';
import { srmApi } from '@/api/srm';
import type { Supplier, PerformanceSummary, ScoreLevelDistribution } from '@/api/srm';
import { toast } from 'react-toastify';
import { apiLogger } from '@/utils/logger';

const SrmSupplierPage: React.FC = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [performanceSummary, setPerformanceSummary] = useState<PerformanceSummary | null>(null);
  const [scoreDistribution, setScoreDistribution] = useState<ScoreLevelDistribution[]>([]);
  const [formData, setFormData] = useState({
    supplier_no: '',
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    category: '',
    risk_level: 'medium',
    status: 'active',
  });

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
    if (level === 'low') return { bgcolor: 'success.lighter', color: '#15803d', label: '低' };
    if (level === 'medium') return { bgcolor: 'warning.light', color: '#b45309', label: '中' };
    return { bgcolor: 'error.lighter', color: 'error.darker', label: '高' };
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      启用: { bg: 'success.lighter', color: '#15803d' },
      禁用: { bg: 'error.lighter', color: 'error.darker' },
    };
    const colors = statusMap[status] || { bg: 'grey.100', color: '#475569' };
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
        id: 'risk_level',
        label: '风险等级',
        render: (row) => <RiskChip level={row.risk_level || 'medium'} />,
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.status),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [suppliers]
  );

  const rowActions: RowAction<Supplier>[] = useMemo(
    () => [
      {
        label: '详情',
        icon: <Eye style={{ width: 16, height: 16 }} />,
        onClick: (row) => navigate(`/srm/suppliers/${row.id}`),
      },
      {
        label: '评估',
        icon: <Award style={{ width: 16, height: 16 }} />,
        onClick: (row) =>
          navigate(`/srm/evaluation?supplier_id=${row.id}&supplier_name=${row.name}`),
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
      risk_level: 'medium',
      status: 'active',
    });
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    try {
      await srmApi.createSupplier({
        supplier_no: formData.supplier_no,
        name: formData.name,
        contact_person: formData.contact_person,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        category: formData.category,
        risk_level: formData.risk_level,
        status: formData.status,
        legal_name: formData.name,
      });
      toast.success('供应商创建成功');
      setShowCreateModal(false);
      loadSuppliers();
      loadPerformanceSummary();
    } catch (err: unknown) {
      toast.error('创建失败');
      apiLogger.error('创建供应商失败:', err);
    }
  };

  const stats = useMemo(() => {
    return {
      total: suppliers.length,
      active: suppliers.filter((s) => s.status === '启用').length,
      lowRisk: suppliers.filter((s) => s.risk_level === 'low').length,
      highRisk: suppliers.filter((s) => s.risk_level === 'high').length,
    };
  }, [suppliers]);

  const getLevelColor = (level: string) => {
    const colorMap: Record<string, { bg: string; color: string }> = {
      A: { bg: 'success.lighter', color: '#15803d' },
      B: { bg: '#dbeafe', color: 'primary.dark' },
      C: { bg: 'warning.light', color: '#b45309' },
      D: { bg: 'warning.light', color: '#92400e' },
      E: { bg: 'error.lighter', color: 'error.darker' },
    };
    return colorMap[level] || { bg: 'grey.100', color: '#475569' };
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
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Users sx={{ width: 20, height: 20, color: '#a855f7' }} />
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
                    borderRadius: 2,
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
                    borderRadius: 2,
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
                    borderRadius: 2,
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
                      borderRadius: 2,
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
                      bgcolor: '#dbeafe',
                      borderRadius: 2,
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
                      borderRadius: 2,
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
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, secondary.light 0%, #f8fafc 100%)',
      }}
    >
      <ListPageTemplate
        title='供应商管理'
        subtitle='Supplier Management'
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
            onClick: () => navigate('/srm/performance'),
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
                value={formData.risk_level}
                onChange={(e) => setFormData({ ...formData, risk_level: e.target.value })}
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
            sx={{ bgcolor: '#a855f7' }}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>{' '}
    </Box>
  );
};

export default SrmSupplierPage;
