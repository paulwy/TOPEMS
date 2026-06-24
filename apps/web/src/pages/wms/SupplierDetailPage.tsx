import {
  Card,
  CardContent,
  Chip,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { Button } from '@/components/ui/Button';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Truck,
  Edit2,
  FileText,
  DollarSign,
  CreditCard,
  Receipt,
  Wallet,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { scmApi } from '@/api/scm';
import { useNotification } from '@/hooks/useNotification';
import type { Supplier } from '@/api/scm';
import { apiLogger } from '@/utils/logger';
import { DetailPageTemplate, type TabConfig, type SectionConfig } from '@/components/templates';

const SupplierDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { error } = useNotification();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (id) {
      loadSupplier(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadSupplier = async (supplierId: string) => {
    setLoading(true);
    try {
      const res = await scmApi.suppliers.get(supplierId);
      if (res.success && res.data) {
        setSupplier(res.data);
      }
    } catch (err) {
      apiLogger.error('Failed to load supplier:', err);
      error('加载供应商信息失败');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '¥0';
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: 'success' | 'error' | 'default' }> = {
      active: { label: '活跃', color: 'success' },
      inactive: { label: '非活跃', color: 'default' },
      blocked: { label: '已冻结', color: 'error' },
    };
    const s = statusMap[status] || { label: status, color: 'default' };
    return (
      <Chip
        size='small'
        label={s.label}
        color={s.color}
      />
    );
  };

  const statsData = [
    {
      label: '应付账款',
      value: formatCurrency(0),
      icon: CreditCard,
    },
    {
      label: '逾期应付',
      value: formatCurrency(0),
      icon: Clock,
    },
    {
      label: '累计采购',
      value: formatCurrency(0),
      icon: TrendingUp,
    },
    {
      label: '累计付款',
      value: formatCurrency(0),
      icon: Wallet,
    },
  ];

  // 基本信息 Tab 内容
  const basicInfoSection: SectionConfig = {
    id: 'basic-info',
    title: '基本信息',
    content: (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant='caption'
            sx={{ color: 'text.secondary' }}
          >
            供应商名称
          </Typography>
          <Typography sx={{ fontWeight: 500 }}>{supplier?.name}</Typography>
        </Box>
        <Box>
          <Typography
            variant='caption'
            sx={{ color: 'text.secondary' }}
          >
            简称
          </Typography>
          <Typography sx={{ fontWeight: 500 }}>{supplier?.short_name || '-'}</Typography>
        </Box>
        <Box>
          <Typography
            variant='caption'
            sx={{ color: 'text.secondary' }}
          >
            状态
          </Typography>
          <Box sx={{ mt: 0.5 }}>{getStatusBadge(supplier?.status || '')}</Box>
        </Box>
        <Box>
          <Typography
            variant='caption'
            sx={{ color: 'text.secondary' }}
          >
            联系人
          </Typography>
          <Typography sx={{ fontWeight: 500 }}>{supplier?.contact_name || '-'}</Typography>
        </Box>
        <Box>
          <Typography
            variant='caption'
            sx={{ color: 'text.secondary' }}
          >
            联系电话
          </Typography>
          <Typography sx={{ fontWeight: 500 }}>{supplier?.contact_phone || '-'}</Typography>
        </Box>
        <Box>
          <Typography
            variant='caption'
            sx={{ color: 'text.secondary' }}
          >
            邮箱
          </Typography>
          <Typography sx={{ fontWeight: 500 }}>{supplier?.email || '-'}</Typography>
        </Box>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Typography
            variant='caption'
            sx={{ color: 'text.secondary' }}
          >
            地址
          </Typography>
          <Typography sx={{ fontWeight: 500 }}>{supplier?.address || '-'}</Typography>
        </Box>
      </Box>
    ),
  };

  // 银行账户信息 Section
  const bankInfoSection: SectionConfig = {
    id: 'bank-info',
    title: '银行账户信息',
    content: (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant='caption'
            sx={{ color: 'text.secondary' }}
          >
            银行账户
          </Typography>
          <Typography sx={{ fontWeight: 500 }}>{supplier?.bank_account || '-'}</Typography>
        </Box>
        <Box>
          <Typography
            variant='caption'
            sx={{ color: 'text.secondary' }}
          >
            税号
          </Typography>
          <Typography sx={{ fontWeight: 500 }}>{supplier?.tax_number || '-'}</Typography>
        </Box>
      </Box>
    ),
  };

  // 时间信息 Section
  const timeInfoSection: SectionConfig = {
    id: 'time-info',
    title: '时间信息',
    content: (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant='caption'
            sx={{ color: 'text.secondary' }}
          >
            创建时间
          </Typography>
          <Typography
            variant='body2'
            sx={{ fontWeight: 500 }}
          >
            {supplier?.created_at ? new Date(supplier.created_at).toLocaleString() : '-'}
          </Typography>
        </Box>
        <Box>
          <Typography
            variant='caption'
            sx={{ color: 'text.secondary' }}
          >
            更新时间
          </Typography>
          <Typography
            variant='body2'
            sx={{ fontWeight: 500 }}
          >
            {supplier?.updated_at ? new Date(supplier.updated_at).toLocaleString() : '-'}
          </Typography>
        </Box>
        <Box>
          <Typography
            variant='caption'
            sx={{ color: 'text.secondary' }}
          >
            供应商ID
          </Typography>
          <Typography
            variant='body2'
            sx={{ fontWeight: 500 }}
          >
            {supplier?.id ? `${supplier.id.substring(0, 8)}...` : '-'}
          </Typography>
        </Box>
        <Box>
          <Typography
            variant='caption'
            sx={{ color: 'text.secondary' }}
          >
            状态
          </Typography>
          <Box sx={{ mt: 0.5 }}>{getStatusBadge(supplier?.status || '')}</Box>
        </Box>
      </Box>
    ),
  };

  // 基本信息 Tab
  const basicInfoTab: TabConfig = {
    id: 'basic-info',
    label: '基本信息',
    icon: <Truck size={16} />,
    content: (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Paper sx={{ borderRadius: 2 }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600 }}
            >
              基本信息
            </Typography>
          </Box>
          <Box sx={{ p: 3 }}>{basicInfoSection.content}</Box>
        </Paper>
        <Paper sx={{ borderRadius: 2 }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600 }}
            >
              银行账户信息
            </Typography>
          </Box>
          <Box sx={{ p: 3 }}>{bankInfoSection.content}</Box>
        </Paper>
        <Paper sx={{ borderRadius: 2 }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600 }}
            >
              时间信息
            </Typography>
          </Box>
          <Box sx={{ p: 3 }}>{timeInfoSection.content}</Box>
        </Paper>
      </Box>
    ),
  };

  // 评估记录 Tab
  const evaluationsTab: TabConfig = {
    id: 'evaluations',
    label: '评估记录',
    icon: <FileText size={16} />,
    badge: 0,
    content: (
      <Paper sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>评估日期</TableCell>
              <TableCell>质量评分</TableCell>
              <TableCell>交期评分</TableCell>
              <TableCell>服务评分</TableCell>
              <TableCell>价格评分</TableCell>
              <TableCell>综合评分</TableCell>
              <TableCell>评估人</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell
                colSpan={7}
                sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}
              >
                暂无评估记录
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>
    ),
  };

  // 交易历史 Tab
  const transactionHistoryTab: TabConfig = {
    id: 'transactions',
    label: '交易历史',
    icon: <DollarSign size={16} />,
    badge: 0,
    content: (
      <Paper sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>订单号</TableCell>
              <TableCell>订单日期</TableCell>
              <TableCell align='right'>订单金额</TableCell>
              <TableCell>状态</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell
                colSpan={4}
                sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}
              >
                暂无交易记录
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>
    ),
  };

  // 付款记录 Tab
  const paymentRecordsTab: TabConfig = {
    id: 'payments',
    label: '付款记录',
    icon: <Receipt size={16} />,
    badge: 0,
    content: (
      <Paper sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>付款单号</TableCell>
              <TableCell align='right'>付款金额</TableCell>
              <TableCell>付款方式</TableCell>
              <TableCell>付款日期</TableCell>
              <TableCell>状态</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell
                colSpan={5}
                sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}
              >
                暂无付款记录
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>
    ),
  };

  const tabs: TabConfig[] = [
    basicInfoTab,
    evaluationsTab,
    transactionHistoryTab,
    paymentRecordsTab,
  ];

  if (!loading && !supplier) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'slate.50',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ color: 'grey.500' }}>供应商不存在</Typography>
          <Button
            onClick={() => navigate('/scm/suppliers')}
            sx={{ mt: 2 }}
          >
            返回列表
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <DetailPageTemplate
      title='供应商详情'
      subtitle='查看和编辑供应商档案信息'
      loading={loading}
      backHref='/scm/suppliers'
      onBack={() => navigate('/scm/suppliers')}
      onEdit={() => setIsEditing(!isEditing)}
      infoCard={
        supplier
          ? {
              avatar: <Truck sx={{ width: 32, height: 32 }} />,
              title: supplier.name,
              subtitle: supplier.short_name,
              tags: [supplier.contact_name, supplier.contact_phone, supplier.email].filter(
                (tag): tag is string => Boolean(tag)
              ),
              stats: statsData.map((stat) => ({
                label: stat.label,
                value: stat.value,
              })),
            }
          : undefined
      }
      tabs={tabs}
    />
  );
};

export default SupplierDetailPage;
