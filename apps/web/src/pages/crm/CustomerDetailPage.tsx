import { Chip, Typography, Box, InputLabel } from '@mui/material';
import { Button } from '@mui/material';
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  Mail,
  Phone,
  FileText,
  CreditCard,
  Receipt,
  Wallet,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { crmApi } from '@/api/modules/crm/crm';
import {
  useCustomerFinanceInfo,
  useSalesInvoices,
  useCollectionRecords,
} from '@/hooks/useCrmFinance';
import { useNotification } from '@/hooks/useNotification';
import type { Customer } from '@/api/modules/crm/crm';
import { apiLogger } from '@/utils/logger';
import { DetailPageTemplate, type TabConfig, type SectionConfig } from '@/components/templates';

const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { error } = useNotification();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  // 财务数据
  const { data: financeInfo } = useCustomerFinanceInfo(id || '');
  const { data: invoicesData } = useSalesInvoices({
    customer_id: id,
    page_size: 10,
  });
  const { data: collectionsData } = useCollectionRecords({
    customer_id: id,
    page_size: 10,
  });

  useEffect(() => {
    if (id) {
      loadCustomer(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadCustomer = async (customerId: string) => {
    setLoading(true);
    try {
      const res = await crmApi.customers.get(customerId);
      if (res.success && res.data) {
        setCustomer(res.data);
      }
    } catch (err: unknown) {
      apiLogger.error('Failed to load customer:', err);
      error('加载客户信息失败');
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
    const statusMap: Record<
      string,
      {
        label: string;
        color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
      }
    > = {
      active: { label: '活跃', color: 'success' },
      inactive: { label: '非活跃', color: 'default' },
      prospect: { label: '潜在', color: 'info' },
      blocked: { label: '已冻结', color: 'error' },
    };
    const s = statusMap[status] || { label: status, color: 'default' };
    return (
      <Chip
        size='small'
        color={s.color}
        label={s.label}
      />
    );
  };

  const finInfo = financeInfo?.data;

  // 基本信息 Tab
  const basicInfoContent = useMemo(() => {
    if (!customer) return null;
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 2,
        }}
      >
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>客户名称</InputLabel>
          <Typography sx={{ fontWeight: 'medium', mt: 0.5 }}>{customer.name}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>客户代码</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{customer.code || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>行业</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{customer.industry || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>网站</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{customer.website || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>邮箱</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{customer.email || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>电话</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{customer.phone || '-'}</Typography>
        </Box>
        <Box sx={{ gridColumn: 'span 2' }}>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>地址</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{customer.address || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>状态</InputLabel>
          <Box sx={{ mt: 0.5 }}>{getStatusBadge(customer.status)}</Box>
        </Box>
        {customer.notes && (
          <Box sx={{ gridColumn: 'span 3', mt: 2 }}>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>备注</InputLabel>
            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>{customer.notes}</Typography>
          </Box>
        )}
      </Box>
    );
  }, [customer]);

  // 财务信息 Tab
  const financeInfoContent = useMemo(() => {
    if (!finInfo) return null;
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' },
          gap: 3,
        }}
      >
        {/* 信用管理 */}
        <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            信用管理
          </Typography>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography color='text.secondary'>信用额度</Typography>
            <Typography sx={{ fontWeight: 'medium' }}>
              {formatCurrency(finInfo?.credit_limit)}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography color='text.secondary'>信用期限（天）</Typography>
            <Typography sx={{ fontWeight: 'medium' }}>{finInfo?.credit_term_days || 0}</Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography color='text.secondary'>付款条款</Typography>
            <Typography sx={{ fontWeight: 'medium' }}>{finInfo?.payment_terms || '-'}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
            <Typography color='text.secondary'>客户状态</Typography>
            <Chip
              size='small'
              color={finInfo?.status === 'normal' ? 'success' : 'default'}
              label={finInfo?.status === 'normal' ? '正常' : finInfo?.status || '-'}
            />
          </Box>
        </Box>

        {/* 应收款概览 */}
        <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            应收款概览
          </Typography>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography color='text.secondary'>应收账款</Typography>
            <Typography sx={{ fontWeight: 'medium', color: 'warning.main' }}>
              {formatCurrency(finInfo?.accounts_receivable)}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography color='text.secondary'>逾期应收</Typography>
            <Typography sx={{ fontWeight: 'medium', color: 'error.main' }}>
              {formatCurrency(finInfo?.overdue_receivable)}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography color='text.secondary'>平均回款天数</Typography>
            <Typography sx={{ fontWeight: 'medium' }}>
              {finInfo?.avg_collection_days || 0} 天
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
            <Typography color='text.secondary'>最后交易日期</Typography>
            <Typography sx={{ fontWeight: 'medium' }}>
              {formatDate(finInfo?.last_transaction_date)}
            </Typography>
          </Box>
        </Box>

        {/* 交易统计 */}
        <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            交易统计
          </Typography>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography color='text.secondary'>累计销售额</Typography>
            <Typography sx={{ fontWeight: 'medium', color: 'success.main' }}>
              {formatCurrency(finInfo?.total_sales)}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography color='text.secondary'>累计收款</Typography>
            <Typography sx={{ fontWeight: 'medium', color: 'primary.main' }}>
              {formatCurrency(finInfo?.total_received)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
            <Typography color='text.secondary'>应收余额</Typography>
            <Typography sx={{ fontWeight: 'medium', color: 'warning.main' }}>
              {formatCurrency((finInfo?.accounts_receivable || 0) - (finInfo?.total_received || 0))}
            </Typography>
          </Box>
        </Box>

        {/* 银行账户信息 */}
        <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            银行账户信息
          </Typography>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography color='text.secondary'>开户银行</Typography>
            <Typography sx={{ fontWeight: 'medium' }}>{finInfo?.bank_name || '-'}</Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography color='text.secondary'>银行账号</Typography>
            <Typography sx={{ fontWeight: 'medium' }}>{finInfo?.bank_account || '-'}</Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography color='text.secondary'>账户名称</Typography>
            <Typography sx={{ fontWeight: 'medium' }}>{finInfo?.account_name || '-'}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
            <Typography color='text.secondary'>税号</Typography>
            <Typography sx={{ fontWeight: 'medium' }}>{finInfo?.tax_number || '-'}</Typography>
          </Box>
        </Box>
      </Box>
    );
  }, [finInfo]);

  // 销售发票 Tab
  const invoicesContent = useMemo(() => {
    const invoiceList = invoicesData?.data?.items || [];
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600 }}
          >
            销售发票列表
          </Typography>
          <Button
            variant='outlined'
            size='small'
            startIcon={<Receipt size={16} />}
          >
            新建发票
          </Button>
        </Box>
        {invoiceList.length === 0 ? (
          <Typography
            color='text.secondary'
            sx={{ py: 8, textAlign: 'center' }}
          >
            暂无发票数据
          </Typography>
        ) : (
          <Box sx={{ display: 'grid', gap: 1 }}>
            {invoiceList.map((invoice: any) => (
              <Box
                key={invoice.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 100px 100px 100px 100px 100px 80px',
                  gap: 2,
                  p: 1.5,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  alignItems: 'center',
                }}
              >
                <Typography sx={{ fontWeight: 'medium' }}>{invoice.invoice_no}</Typography>
                <Typography align='right'>{formatCurrency(invoice.amount)}</Typography>
                <Typography align='right'>{formatCurrency(invoice.tax_amount)}</Typography>
                <Typography align='right'>{formatCurrency(invoice.total_amount)}</Typography>
                <Typography>{formatDate(invoice.invoice_date)}</Typography>
                <Typography>{formatDate(invoice.due_date)}</Typography>
                <Chip
                  size='small'
                  color={
                    invoice.status === 'issued'
                      ? 'success'
                      : invoice.status === 'draft'
                        ? 'default'
                        : invoice.status === 'cancelled'
                          ? 'error'
                          : 'info'
                  }
                  label={
                    invoice.status === 'draft'
                      ? '草稿'
                      : invoice.status === 'approved'
                        ? '已审批'
                        : invoice.status === 'issued'
                          ? '已开具'
                          : invoice.status === 'cancelled'
                            ? '已作废'
                            : invoice.status
                  }
                />
              </Box>
            ))}
          </Box>
        )}
      </Box>
    );
  }, [invoicesData]);

  // 收款记录 Tab
  const collectionsContent = useMemo(() => {
    const collectionList = collectionsData?.data?.items || [];
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600 }}
          >
            收款记录列表
          </Typography>
          <Button
            variant='outlined'
            size='small'
            startIcon={<Wallet size={16} />}
          >
            新建收款
          </Button>
        </Box>
        {collectionList.length === 0 ? (
          <Typography
            color='text.secondary'
            sx={{ py: 8, textAlign: 'center' }}
          >
            暂无收款记录数据
          </Typography>
        ) : (
          <Box sx={{ display: 'grid', gap: 1 }}>
            {collectionList.map((record: any) => (
              <Box
                key={record.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 100px 100px 100px 80px',
                  gap: 2,
                  p: 1.5,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  alignItems: 'center',
                }}
              >
                <Typography sx={{ fontWeight: 'medium' }}>{record.collection_no}</Typography>
                <Typography align='right'>{formatCurrency(record.amount)}</Typography>
                <Typography>
                  {record.payment_method === 'bank_transfer'
                    ? '银行转账'
                    : record.payment_method === 'cash'
                      ? '现金'
                      : record.payment_method === 'credit'
                        ? '信用'
                        : '其他'}
                </Typography>
                <Typography>{formatDate(record.collection_date)}</Typography>
                <Chip
                  size='small'
                  color={
                    record.status === 'matched'
                      ? 'success'
                      : record.status === 'recorded'
                        ? 'info'
                        : 'default'
                  }
                  label={
                    record.status === 'matched'
                      ? '已核销'
                      : record.status === 'recorded'
                        ? '已记录'
                        : '已取消'
                  }
                />
              </Box>
            ))}
          </Box>
        )}
      </Box>
    );
  }, [collectionsData]);

  // 底部信息 Section
  const footerSection = useMemo<SectionConfig>(() => {
    if (!customer) return { id: 'footer', content: null };
    return {
      id: 'footer',
      title: '其他信息',
      content: (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
            gap: 2,
          }}
        >
          <Box sx={{ bgcolor: 'grey.100', borderRadius: 2, p: 2 }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              创建时间
            </Typography>
            <Typography sx={{ fontWeight: 'medium', mt: 0.5 }}>
              {new Date(customer.created_at).toLocaleString()}
            </Typography>
          </Box>
          <Box sx={{ bgcolor: 'grey.100', borderRadius: 2, p: 2 }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              更新时间
            </Typography>
            <Typography sx={{ fontWeight: 'medium', mt: 0.5 }}>
              {new Date(customer.updated_at).toLocaleString()}
            </Typography>
          </Box>
          <Box sx={{ bgcolor: 'grey.100', borderRadius: 2, p: 2 }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              客户ID
            </Typography>
            <Typography
              sx={{
                fontWeight: 'medium',
                mt: 0.5,
                fontFamily: 'monospace',
                fontSize: '0.875rem',
              }}
            >
              {customer.id.substring(0, 8)}...
            </Typography>
          </Box>
          <Box sx={{ bgcolor: 'grey.100', borderRadius: 2, p: 2 }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              状态
            </Typography>
            <Box sx={{ mt: 0.5 }}>{getStatusBadge(customer.status)}</Box>
          </Box>
        </Box>
      ),
    };
  }, [customer]);

  // tabs 配置
  const tabs = useMemo<TabConfig[]>(
    () => [
      { id: 'basic', label: '基本信息', content: basicInfoContent || <></> },
      {
        id: 'finance',
        label: '财务信息',
        content: financeInfoContent || <></>,
      },
      { id: 'invoices', label: '销售发票', content: invoicesContent },
      { id: 'collections', label: '收款记录', content: collectionsContent },
    ],
    [basicInfoContent, financeInfoContent, invoicesContent, collectionsContent]
  );

  // infoCard 配置
  const infoCard = useMemo(
    () => ({
      avatar: (
        <Building2
          size={32}
          color='#1976d2'
        />
      ),
      title: customer?.name,
      subtitle: customer?.code || undefined,
      tags: customer?.industry ? [customer.industry] : [],
      stats: [
        { label: '信用额度', value: formatCurrency(finInfo?.credit_limit) },
        {
          label: '应收账款',
          value: formatCurrency(finInfo?.accounts_receivable),
        },
        {
          label: '逾期应收',
          value: formatCurrency(finInfo?.overdue_receivable),
        },
        { label: '累计销售额', value: formatCurrency(finInfo?.total_sales) },
      ],
    }),
    [customer, finInfo]
  );

  // sections 配置
  const sections = useMemo<SectionConfig[]>(() => [footerSection], [footerSection]);

  return (
    <DetailPageTemplate
      title='客户详情'
      subtitle='查看和编辑客户档案信息'
      backHref='/crm/customers'
      loading={loading}
      onEdit={() => {}}
      infoCard={infoCard}
      tabs={tabs}
      sections={sections}
    />
  );
};

export default CustomerDetailPage;
