import {
  Card,
  CardContent,
  Chip,
  Typography,
  Box,
  Stack,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Button } from '@mui/material';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Edit,
  Trash2,
  Check,
  X,
  Clock,
  User,
  Calendar,
  Building2,
  Printer,
  Download,
  Copy,
  AlertCircle,
} from 'lucide-react';
import { DetailPageTemplate } from '@/components/templates';
import { voucherApi, type FinancialVoucher, type VoucherItem } from '@/api/erp';
import { useAppStore } from '@/store';
import { apiLogger } from '@/utils/logger';

interface TabConfig {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
  content: React.ReactNode;
}

const VoucherDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [voucher, setVoucher] = useState<FinancialVoucher | null>(null);
  const [voucherItems, setVoucherItems] = useState<VoucherItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadVoucherDetail(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadVoucherDetail = async (voucherId: string) => {
    setLoading(true);
    try {
      const result = await voucherApi.get(voucherId);
      if (result.success && result.data) {
        setVoucher(result.data);
      }

      const itemsResult = await voucherApi.getItems(voucherId);
      if (itemsResult.success && itemsResult.data) {
        setVoucherItems(itemsResult.data);
      }
    } catch (err: unknown) {
      apiLogger.error('加载凭证详情失败:', err);
      addNotification({
        title: '错误',
        message: '加载凭证详情失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`/finance/voucher/${id}`);
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除该凭证吗？')) return;

    try {
      const result = await voucherApi.delete(id!);
      if (result.success) {
        addNotification({
          title: '成功',
          message: '删除成功',
          type: 'success',
        });
        navigate('/finance/vouchers');
      } else {
        addNotification({
          title: '失败',
          message: result.message || '删除失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      addNotification({
        title: '错误',
        message: '删除失败',
        type: 'error',
      });
    }
  };

  const handleAudit = async () => {
    if (!confirm('确定要审核该凭证吗？')) return;

    try {
      const result = await voucherApi.update(id!, { status: 'approved' });
      if (result.success) {
        addNotification({
          title: '成功',
          message: '审核成功',
          type: 'success',
        });
        loadVoucherDetail(id!);
      } else {
        addNotification({
          title: '失败',
          message: result.message || '审核失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      addNotification({
        title: '错误',
        message: '审核失败',
        type: 'error',
      });
    }
  };

  const handlePost = async () => {
    if (!confirm('确定要记账该凭证吗？')) return;

    try {
      const result = await voucherApi.update(id!, { status: 'posted' });
      if (result.success) {
        addNotification({
          title: '成功',
          message: '记账成功',
          type: 'success',
        });
        loadVoucherDetail(id!);
      } else {
        addNotification({
          title: '失败',
          message: result.message || '记账失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      addNotification({
        title: '错误',
        message: '记账失败',
        type: 'error',
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      {
        label: string;
        color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
      }
    > = {
      draft: { label: '草稿', color: 'default' },
      pending: { label: '待审核', color: 'warning' },
      approved: { label: '已审核', color: 'info' },
      posted: { label: '已记账', color: 'success' },
      imported: { label: '已导入', color: 'secondary' },
    };
    const config = statusConfig[status] || { label: status, color: 'default' };
    return (
      <Chip
        size='small'
        color={config.color}
        label={config.label}
      />
    );
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <Typography>加载中...</Typography>
      </Box>
    );
  }

  if (!voucher) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <AlertCircle
            size={64}
            style={{ color: '#d32f2f', marginBottom: 16 }}
          />
          <Typography
            variant='h6'
            color='text.secondary'
          >
            凭证不存在
          </Typography>
          <Button
            onClick={() => navigate('/finance/vouchers')}
            sx={{ mt: 2 }}
          >
            返回列表
          </Button>
        </Box>
      </Box>
    );
  }

  const infoCard = {
    avatar: <FileText size={32} />,
    title: voucher.voucher_number,
    subtitle: `期间: ${voucher.period}`,
    tags: [getStatusBadge(voucher.status)] as unknown as string[],
    stats: [
      { label: '借方合计', value: formatCurrency(voucher.total_debit) },
      { label: '贷方合计', value: formatCurrency(voucher.total_credit) },
    ],
  };

  const basicInfoTab = (
    <Card>
      <CardContent>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 3 }}
        >
          基本信息
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, 1fr)',
              lg: 'repeat(3, 1fr)',
            },
            gap: 3,
          }}
        >
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              凭证编号
            </Typography>
            <Typography
              variant='body1'
              sx={{ fontWeight: 600, color: 'primary.main' }}
            >
              {voucher.voucher_number}
            </Typography>
          </Box>
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              凭证日期
            </Typography>
            <Typography variant='body1'>{formatDate(voucher.voucher_date)}</Typography>
          </Box>
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              会计期间
            </Typography>
            <Typography variant='body1'>{voucher.period}</Typography>
          </Box>
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              附件数量
            </Typography>
            <Typography variant='body1'>{voucher.attachment_count || 0} 个</Typography>
          </Box>
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              凭证状态
            </Typography>
            <Box sx={{ mt: 0.5 }}>{getStatusBadge(voucher.status)}</Box>
          </Box>
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              凭证摘要
            </Typography>
            <Typography variant='body1'>{voucher.summary || '-'}</Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 3 }}
        >
          人员信息
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: '50%',
                bgcolor: 'primary.light',
                display: 'flex',
              }}
            >
              <User
                size={20}
                style={{ color: '#1976d2' }}
              />
            </Box>
            <Box>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                制单人
              </Typography>
              <Typography
                variant='body1'
                sx={{ fontWeight: 500 }}
              >
                {voucher.maker_name || '-'}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: '50%',
                bgcolor: 'info.light',
                display: 'flex',
              }}
            >
              <Check
                size={20}
                style={{ color: '#0288d1' }}
              />
            </Box>
            <Box>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                审核人
              </Typography>
              <Typography
                variant='body1'
                sx={{ fontWeight: 500 }}
              >
                {voucher.checker_name || '-'}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: '50%',
                bgcolor: 'success.light',
                display: 'flex',
              }}
            >
              <Building2
                size={20}
                style={{ color: '#388e3c' }}
              />
            </Box>
            <Box>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                记账人
              </Typography>
              <Typography
                variant='body1'
                sx={{ fontWeight: 500 }}
              >
                {(voucher as any).poster_name || '-'}
              </Typography>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const voucherItemsTab = (
    <Card>
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
          }}
        >
          <Typography
            variant='h6'
            sx={{ fontWeight: 600 }}
          >
            凭证明细
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary' }}
            >
              借方合计:{' '}
              <Typography
                component='span'
                sx={{ fontWeight: 600, color: 'error.main' }}
              >
                {formatCurrency(voucher.total_debit)}
              </Typography>
            </Typography>
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary' }}
            >
              贷方合计:{' '}
              <Typography
                component='span'
                sx={{ fontWeight: 600, color: 'success.main' }}
              >
                {formatCurrency(voucher.total_credit)}
              </Typography>
            </Typography>
          </Box>
        </Box>

        <TableContainer
          component={Paper}
          variant='outlined'
        >
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell sx={{ fontWeight: 600, width: 80 }}>行号</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 150 }}>科目代码</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>科目名称</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>摘要</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 150, textAlign: 'right' }}>
                  借方金额
                </TableCell>
                <TableCell sx={{ fontWeight: 600, width: 150, textAlign: 'right' }}>
                  贷方金额
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {voucherItems.map((item) => (
                <TableRow
                  key={item.id}
                  hover
                >
                  <TableCell>{item.line_number}</TableCell>
                  <TableCell sx={{ fontWeight: 500, color: 'primary.main' }}>
                    {item.subject_code}
                  </TableCell>
                  <TableCell>{item.subject_name}</TableCell>
                  <TableCell>{item.summary || '-'}</TableCell>
                  <TableCell
                    sx={{
                      textAlign: 'right',
                      color: 'error.main',
                      fontWeight: 500,
                    }}
                  >
                    {item.debit_amount > 0 ? formatCurrency(item.debit_amount) : ''}
                  </TableCell>
                  <TableCell
                    sx={{
                      textAlign: 'right',
                      color: 'success.main',
                      fontWeight: 500,
                    }}
                  >
                    {item.credit_amount > 0 ? formatCurrency(item.credit_amount) : ''}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 4,
            mt: 3,
            pt: 2,
            borderTop: 2,
            borderColor: 'divider',
          }}
        >
          <Box sx={{ textAlign: 'right' }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              借方合计
            </Typography>
            <Typography
              variant='h6'
              sx={{ fontWeight: 'bold', color: 'error.main' }}
            >
              {formatCurrency(voucher.total_debit)}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              贷方合计
            </Typography>
            <Typography
              variant='h6'
              sx={{ fontWeight: 'bold', color: 'success.main' }}
            >
              {formatCurrency(voucher.total_credit)}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const operationLogTab = (
    <Card>
      <CardContent>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 3 }}
        >
          操作日志
        </Typography>
        <Stack spacing={2}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 2,
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 2,
            }}
          >
            <Box
              sx={{
                p: 1,
                borderRadius: '50%',
                bgcolor: 'success.light',
                display: 'flex',
              }}
            >
              <Calendar
                size={16}
                style={{ color: '#388e3c' }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                凭证创建
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {voucher.maker_name || '系统'} - {formatDate(voucher.created_at)}
              </Typography>
            </Box>
          </Box>
          {voucher.status !== 'draft' && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 2,
                p: 2,
                bgcolor: 'grey.50',
                borderRadius: 2,
              }}
            >
              <Box
                sx={{
                  p: 1,
                  borderRadius: '50%',
                  bgcolor: 'info.light',
                  display: 'flex',
                }}
              >
                <Check
                  size={16}
                  style={{ color: '#0288d1' }}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500 }}
                >
                  凭证审核
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {voucher.checker_name || '-'} - {formatDate((voucher as any).checked_at)}
                </Typography>
              </Box>
            </Box>
          )}
          {voucher.status === 'posted' && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 2,
                p: 2,
                bgcolor: 'grey.50',
                borderRadius: 2,
              }}
            >
              <Box
                sx={{
                  p: 1,
                  borderRadius: '50%',
                  bgcolor: 'primary.light',
                  display: 'flex',
                }}
              >
                <Building2
                  size={16}
                  style={{ color: '#1976d2' }}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500 }}
                >
                  凭证记账
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {(voucher as any).poster_name || '-'} - {formatDate((voucher as any).posted_at)}
                </Typography>
              </Box>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );

  const tabs: TabConfig[] = [
    { id: 'basic', label: '基本信息', content: basicInfoTab },
    {
      id: 'items',
      label: '凭证明细',
      badge: voucherItems.length,
      content: voucherItemsTab,
    },
    { id: 'logs', label: '操作日志', content: operationLogTab },
  ];

  return (
    <DetailPageTemplate
      title={voucher.voucher_number}
      subtitle={`期间: ${voucher.period}`}
      breadcrumbs={[
        { label: '首页', href: '/dashboard' },
        { label: '财务', href: '/finance' },
        { label: '凭证管理', href: '/finance/vouchers' },
        { label: voucher.voucher_number },
      ]}
      backHref='/finance/vouchers'
      tabs={tabs}
      infoCard={infoCard}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );
};

export default VoucherDetailPage;
