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
  Button,
} from '@mui/material';
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
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
import { PageContainer } from '@/components/common';
import { SCM_PATHS } from '@/modules/scm/config';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';

const SupplierDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { error } = useNotification();

  const [isEditing, setIsEditing] = useState(false);

  const { data: supplier, isLoading: loading } = useQuery({
    queryKey: QUERY_KEYS.SCM.SUPPLIER(id || ''),
    queryFn: async () => {
      const res = await scmApi.suppliers.get(id as string);
      if (!res.success || !res.data) {
        throw new Error('Failed to fetch supplier');
      }
      return res.data;
    },
    enabled: !!id,
  });

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
      active: { label: t('wms.supplier_detail_page.status_active_label'), color: 'success' },
      inactive: { label: t('wms.supplier_detail_page.status_inactive_label'), color: 'default' },
      blocked: { label: t('wms.supplier_detail_page.status_blocked_label'), color: 'error' },
    };
    const s = statusMap[status] || { label: status, color: 'default' as const };
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
      label: t('wms.supplier_detail_page.stat_payable'),
      value: formatCurrency(0),
      icon: CreditCard,
    },
    {
      label: t('wms.supplier_detail_page.stat_overdue_payable'),
      value: formatCurrency(0),
      icon: Clock,
    },
    {
      label: t('wms.supplier_detail_page.stat_total_purchase'),
      value: formatCurrency(0),
      icon: TrendingUp,
    },
    {
      label: t('wms.supplier_detail_page.stat_total_payment'),
      value: formatCurrency(0),
      icon: Wallet,
    },
  ];

  // 基本信息 Tab 内容
  const basicInfoSection: SectionConfig = {
    id: 'basic-info',
    title: t('wms.supplier_detail_page.section_basic_info'),
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
            {t('wms.supplier_detail_page.field_supplier_name')}
          </Typography>
          <Typography sx={{ fontWeight: 500 }}>{supplier?.name}</Typography>
        </Box>
        <Box>
          <Typography
            variant='caption'
            sx={{ color: 'text.secondary' }}
          >
            {t('wms.supplier_detail_page.field_short_name')}
          </Typography>
          <Typography sx={{ fontWeight: 500 }}>{supplier?.short_name || '-'}</Typography>
        </Box>
        <Box>
          <Typography
            variant='caption'
            sx={{ color: 'text.secondary' }}
          >
            {t('wms.supplier_detail_page.field_status')}
          </Typography>
          <Box sx={{ mt: 0.5 }}>{getStatusBadge(supplier?.status || '')}</Box>
        </Box>
        <Box>
          <Typography
            variant='caption'
            sx={{ color: 'text.secondary' }}
          >
            {t('wms.supplier_detail_page.field_contact_person')}
          </Typography>
          <Typography sx={{ fontWeight: 500 }}>{supplier?.contact_name || '-'}</Typography>
        </Box>
        <Box>
          <Typography
            variant='caption'
            sx={{ color: 'text.secondary' }}
          >
            {t('wms.supplier_detail_page.field_contact_phone')}
          </Typography>
          <Typography sx={{ fontWeight: 500 }}>{supplier?.contact_phone || '-'}</Typography>
        </Box>
        <Box>
          <Typography
            variant='caption'
            sx={{ color: 'text.secondary' }}
          >
            {t('wms.supplier_detail_page.field_email')}
          </Typography>
          <Typography sx={{ fontWeight: 500 }}>{supplier?.email || '-'}</Typography>
        </Box>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Typography
            variant='caption'
            sx={{ color: 'text.secondary' }}
          >
            {t('wms.supplier_detail_page.field_address')}
          </Typography>
          <Typography sx={{ fontWeight: 500 }}>{supplier?.address || '-'}</Typography>
        </Box>
      </Box>
    ),
  };

  // 银行账户信息 Section
  const bankInfoSection: SectionConfig = {
    id: 'bank-info',
    title: t('wms.supplier_detail_page.section_bank_info'),
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
            {t('wms.supplier_detail_page.field_bank_account_label')}
          </Typography>
          <Typography sx={{ fontWeight: 500 }}>{supplier?.bank_account || '-'}</Typography>
        </Box>
        <Box>
          <Typography
            variant='caption'
            sx={{ color: 'text.secondary' }}
          >
            {t('wms.supplier_detail_page.field_tax_number')}
          </Typography>
          <Typography sx={{ fontWeight: 500 }}>{supplier?.tax_number || '-'}</Typography>
        </Box>
      </Box>
    ),
  };

  // 时间信息 Section
  const timeInfoSection: SectionConfig = {
    id: 'time-info',
    title: t('wms.supplier_detail_page.section_time_info'),
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
            {t('wms.supplier_detail_page.field_created_at')}
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
            {t('wms.supplier_detail_page.field_updated_at')}
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
            {t('wms.supplier_detail_page.field_supplier_id')}
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
            {t('wms.supplier_detail_page.field_status')}
          </Typography>
          <Box sx={{ mt: 0.5 }}>{getStatusBadge(supplier?.status || '')}</Box>
        </Box>
      </Box>
    ),
  };

  // 基本信息 Tab
  const basicInfoTab: TabConfig = {
    id: 'basic-info',
    label: t('wms.supplier_detail_page.tab_basic'),
    icon: <Truck size={16} />,
    content: (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Paper sx={{ borderRadius: 3 }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600 }}
            >
              {t('wms.supplier_detail_page.section_basic_info')}
            </Typography>
          </Box>
          <Box sx={{ p: 3 }}>{basicInfoSection.content}</Box>
        </Paper>
        <Paper sx={{ borderRadius: 3 }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600 }}
            >
              {t('wms.supplier_detail_page.section_bank_info')}
            </Typography>
          </Box>
          <Box sx={{ p: 3 }}>{bankInfoSection.content}</Box>
        </Paper>
        <Paper sx={{ borderRadius: 3 }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600 }}
            >
              {t('wms.supplier_detail_page.section_time_info')}
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
    label: t('wms.supplier_detail_page.tab_evaluation_records'),
    icon: <FileText size={16} />,
    badge: 0,
    content: (
      <Paper sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('wms.supplier_detail_page.col_evaluation_date')}</TableCell>
              <TableCell>{t('wms.supplier_detail_page.col_quality_score')}</TableCell>
              <TableCell>{t('wms.supplier_detail_page.col_delivery_score')}</TableCell>
              <TableCell>{t('wms.supplier_detail_page.col_service_score')}</TableCell>
              <TableCell>{t('wms.supplier_detail_page.col_price_score')}</TableCell>
              <TableCell>{t('wms.supplier_detail_page.col_total_score')}</TableCell>
              <TableCell>{t('wms.supplier_detail_page.col_evaluator')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell
                colSpan={7}
                sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}
              >
                {t('wms.supplier_detail_page.empty_evaluations')}
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
    label: t('wms.supplier_detail_page.tab_transactions'),
    icon: <DollarSign size={16} />,
    badge: 0,
    content: (
      <Paper sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('wms.supplier_detail_page.col_order_number')}</TableCell>
              <TableCell>{t('wms.supplier_detail_page.col_order_date')}</TableCell>
              <TableCell align='right'>{t('wms.supplier_detail_page.col_order_amount')}</TableCell>
              <TableCell>{t('wms.supplier_detail_page.col_status')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell
                colSpan={4}
                sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}
              >
                {t('wms.supplier_detail_page.empty_transactions')}
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
    label: t('wms.supplier_detail_page.tab_payments'),
    icon: <Receipt size={16} />,
    badge: 0,
    content: (
      <Paper sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('wms.supplier_detail_page.col_payment_number')}</TableCell>
              <TableCell align='right'>{t('wms.supplier_detail_page.col_payment_amount')}</TableCell>
              <TableCell>{t('wms.supplier_detail_page.col_payment_method')}</TableCell>
              <TableCell>{t('wms.supplier_detail_page.col_payment_date')}</TableCell>
              <TableCell>{t('wms.supplier_detail_page.col_status')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell
                colSpan={5}
                sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}
              >
                {t('wms.supplier_detail_page.empty_payments')}
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
          <Typography sx={{ color: 'grey.500' }}>{t('wms.supplier_detail_page.supplier_not_exist')}</Typography>
          <Button
            onClick={() => navigate(SCM_PATHS.suppliers)}
            sx={{ mt: 2 }}
          >
            {t('wms.supplier_detail_page.button_back_to_list')}
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <PageContainer
      title={t('wms.supplier_detail_page.title')}
      subtitle={t('wms.supplier_detail_page.subtitle')}
    >
      <DetailPageTemplate
        title=''
        subtitle=''
        loading={loading}
        backHref={SCM_PATHS.suppliers}
        onBack={() => navigate(SCM_PATHS.suppliers)}
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
    </PageContainer>
  );
};

export default SupplierDetailPage;
