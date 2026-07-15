import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Chip, Typography, Tabs, Tab, LinearProgress, Button } from '@mui/material';
import type { BillingRecord } from '@/api/crm';
import { crmApi } from '@/api/crm';
import { useNotificationStore } from '@/store';
import { Receipt, CheckCircle, Clock, AlertCircle, Send, TrendingUp } from 'lucide-react';
import { ListPageTemplate, type ColumnDef, type RowAction } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { apiLogger } from '@/utils/logger';
import { CRM_PATHS } from '@/modules/crm/config';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';

type TabType = 'invoices' | 'collections' | 'aging';

const CRMBillingPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('invoices');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;

  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();

  const billsQuery = useQuery({
    queryKey: [...QUERY_KEYS.CRM.BILLING, activeTab],
    queryFn: async () => {
      const status =
        activeTab === 'collections' ? 'paid' : activeTab === 'invoices' ? 'pending' : undefined;
      const response = await crmApi.billing.list(status ? { status } : undefined);
      return response.data?.items || [];
    },
  });

  const bills = billsQuery.data || [];
  const loading = billsQuery.isLoading || billsQuery.isFetching;

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => crmApi.billing.markPaid(id),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: '成功',
        message: '账单已标记为已支付',
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CRM.BILLING });
    },
    onError: (error: unknown) => {
      apiLogger.error('标记支付失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: '标记账单支付失败',
      });
    },
  });

  const sendNotificationMutation = useMutation({
    mutationFn: (id: string) => crmApi.billing.sendNotification(id),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: '成功',
        message: '账单通知已发送',
      });
    },
    onError: (error: unknown) => {
      apiLogger.error('发送通知失败:', error);
      addNotification({
        type: 'error',
        title: '发送失败',
        message: '发送账单通知失败',
      });
    },
  });

  const handleMarkPaid = (id: string) => {
    markPaidMutation.mutate(id);
  };

  const handleSendNotification = (id: string) => {
    sendNotificationMutation.mutate(id);
  };

  const getStatusChip = (status: string) => {
    const config: Record<
      string,
      { label: string; color: 'success' | 'warning' | 'error' | 'default' }
    > = {
      pending: { label: '待支付', color: 'warning' },
      paid: { label: '已支付', color: 'success' },
      overdue: { label: '已逾期', color: 'error' },
      cancelled: { label: '已取消', color: 'default' },
    };
    const cfg = config[status] || { label: status, color: 'default' as const };
    return (
      <Chip
        size='small'
        label={cfg.label}
        color={cfg.color}
      />
    );
  };

  const getAgingStatus = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff <= 0) return { label: '正常', color: 'success' as const };
    if (daysDiff <= 30) return { label: '30天内', color: 'warning' as const };
    if (daysDiff <= 60) return { label: '60天内', color: 'warning' as const };
    return { label: '90天以上', color: 'error' as const };
  };

  const formatCurrency = (amount: number) => {
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

  const filteredBills = useMemo(() => {
    if (!searchQuery) return bills;
    return bills.filter(
      (bill) =>
        bill.invoice_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bill.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [bills, searchQuery]);

  const paginatedBills = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredBills.slice(start, start + pageSize);
  }, [filteredBills, currentPage]);

  const totalAmount = bills.reduce((sum, b) => sum + b.amount, 0);

  const agingSummary = useMemo(
    () => ({
      normal: bills
        .filter((b) => getAgingStatus(b.due_date).color === 'success')
        .reduce((sum, b) => sum + b.amount, 0),
      days30: bills
        .filter((b) => getAgingStatus(b.due_date).label === '30天内')
        .reduce((sum, b) => sum + b.amount, 0),
      days60: bills
        .filter((b) => getAgingStatus(b.due_date).label === '60天内')
        .reduce((sum, b) => sum + b.amount, 0),
      days90: bills
        .filter((b) => getAgingStatus(b.due_date).label === '90天以上')
        .reduce((sum, b) => sum + b.amount, 0),
    }),
    [bills]
  );

  const getColumns = (): ColumnDef<BillingRecord>[] => {
    if (activeTab === 'aging') {
      return [
        {
          id: 'customer_name',
          label: '客户',
          width: 200,
          sortable: true,
        },
        {
          id: 'amount',
          label: '应收总额',
          width: 150,
          align: 'right',
          sortable: true,
          render: (row) => (
            <Typography sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
              {formatCurrency(row.amount)}
            </Typography>
          ),
        },
        {
          id: 'due_date',
          label: '到期日',
          width: 150,
          sortable: true,
          render: (row) => formatDate(row.due_date),
        },
        {
          id: 'aging_status',
          label: '账龄状态',
          width: 120,
          render: (row) => {
            const aging = getAgingStatus(row.due_date);
            return (
              <Chip
                size='small'
                label={aging.label}
                color={aging.color}
              />
            );
          },
        },
        {
          id: 'risklevel',
          label: '风险等级',
          width: 120,
          render: (row) => {
            const aging = getAgingStatus(row.due_date);
            const riskLabel =
              aging.color === 'error' ? '高风险' : aging.color === 'warning' ? '中风险' : '低风险';
            return (
              <Chip
                size='small'
                label={riskLabel}
                color={aging.color}
              />
            );
          },
        },
      ];
    }

    const baseColumns: ColumnDef<BillingRecord>[] = [
      {
        id: 'invoice_no',
        label: '发票号',
        width: 150,
        sortable: true,
        render: (row) => (
          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
            {row.invoice_no}
          </Typography>
        ),
      },
      {
        id: 'customer_name',
        label: '客户',
        width: 200,
        sortable: true,
      },
      {
        id: 'amount',
        label: '金额',
        width: 150,
        align: 'right',
        sortable: true,
        render: (row) => (
          <Typography sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
            {formatCurrency(row.amount)}
          </Typography>
        ),
      },
      {
        id: 'status',
        label: '状态',
        width: 120,
        render: (row) => getStatusChip(row.status),
      },
    ];

    if (activeTab === 'invoices') {
      baseColumns.splice(3, 0, {
        id: 'due_date',
        label: '到期日',
        width: 150,
        sortable: true,
        render: (row) => formatDate(row.due_date),
      });
    } else {
      baseColumns.splice(3, 0, {
        id: 'paid_at',
        label: '支付日期',
        width: 150,
        sortable: true,
        render: (row) => formatDate(row.paid_at),
      });
    }

    return baseColumns;
  };

  const getRowActions = (): RowAction<BillingRecord>[] => {
    if (activeTab === 'invoices') {
      return [
        {
          label: '标记支付',
          icon: <CheckCircle size={16} />,
          onClick: (row) => handleMarkPaid(row.id),
          color: 'success',
        },
        {
          label: '发送通知',
          icon: <Send size={16} />,
          onClick: (row) => handleSendNotification(row.id),
          color: 'primary',
        },
      ];
    }
    return [];
  };

  const headerContent = useMemo(() => {
    if (activeTab === 'aging') {
      return (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 2,
            mb: 3,
          }}
        >
          <StatCard
            label='正常'
            value={formatCurrency(agingSummary.normal)}
            color='success'
          />
          <StatCard
            label='30天内'
            value={formatCurrency(agingSummary.days30)}
            color='warning'
          />
          <StatCard
            label='60天内'
            value={formatCurrency(agingSummary.days60)}
            color='warning'
          />
          <StatCard
            label='90天以上'
            value={formatCurrency(agingSummary.days90)}
            color='error'
          />
        </Box>
      );
    }
    return null;
  }, [activeTab, agingSummary]);

  const tabTotalLabel =
    activeTab === 'invoices' ? '待收总额' : activeTab === 'collections' ? '已收总额' : '应收总额';

  return (
    <PageContainer
      title='账单管理'
      subtitle='管理客户账单、收款和账龄分析'
      autoTitle
      autoBreadcrumbs
    >
      <ListPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: '客户关系管理', href: CRM_PATHS.root },
          { label: '账单管理' },
        ]}
        backButton={{ onClick: () => navigate(CRM_PATHS.root) }}
        columns={getColumns()}
        data={paginatedBills}
        loading={loading}
        pagination={{
          page: currentPage,
          pageSize,
          total: filteredBills.length,
          onPageChange: setCurrentPage,
        }}
        searchable
        searchPlaceholder={activeTab === 'aging' ? '搜索客户...' : '搜索发票号或客户...'}
        searchValue={searchQuery}
        onSearch={(value) => {
          setSearchQuery(value);
          setCurrentPage(0);
        }}
        actions={
          activeTab === 'invoices'
            ? [
                {
                  label: `${tabTotalLabel}: ${formatCurrency(totalAmount)}`,
                  variant: 'text',
                },
              ]
            : [
                {
                  label: `${tabTotalLabel}: ${formatCurrency(totalAmount)}`,
                  variant: 'text',
                },
              ]
        }
        rowActions={getRowActions()}
        onRefresh={() => billsQuery.refetch()}
        showRowNumber
        columnConfigurable
        persistColumnConfig
        columnConfigStorageKey={`crm-billing-${activeTab}-columns`}
        headerContent={
          <Box>
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                p: 1,
                bgcolor: 'grey.100',
                borderRadius: 1,
                mb: 3,
              }}
            >
              <TabButton
                active={activeTab === 'invoices'}
                onClick={() => setActiveTab('invoices')}
              >
                <Receipt sx={{ width: 16, height: 16, mr: 1 }} />
                待收账单
              </TabButton>
              <TabButton
                active={activeTab === 'collections'}
                onClick={() => setActiveTab('collections')}
              >
                <CheckCircle sx={{ width: 16, height: 16, mr: 1 }} />
                已收账单
              </TabButton>
              <TabButton
                active={activeTab === 'aging'}
                onClick={() => setActiveTab('aging')}
              >
                <Clock sx={{ width: 16, height: 16, mr: 1 }} />
                账龄分析
              </TabButton>
            </Box>
            {headerContent}
          </Box>
        }
      />
    </PageContainer>
  );
};

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <Box
    onClick={onClick}
    sx={{
      flex: 1,
      px: 2,
      py: 1,
      borderRadius: 1,
      cursor: 'pointer',
      textAlign: 'center',
      fontSize: '0.875rem',
      fontWeight: 500,
      transition: 'all 0.2s',
      bgcolor: active ? 'background.paper' : 'transparent',
      color: active ? 'primary.main' : 'text.secondary',
      boxShadow: active ? 1 : 0,
      '&:hover': {
        bgcolor: active ? 'background.paper' : 'grey.200',
      },
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {children}
  </Box>
);

const StatCard: React.FC<{
  label: string;
  value: string;
  color: 'success' | 'warning' | 'error';
}> = ({ label, value, color }) => {
  const bgColor = {
    success: 'success.light',
    warning: 'warning.light',
    error: 'error.light',
  }[color];
  const textColor = {
    success: 'success.dark',
    warning: 'warning.dark',
    error: 'error.dark',
  }[color];

  return (
    <Box sx={{ bgcolor: bgColor, borderRadius: 1, p: 2 }}>
      <Typography
        variant='caption'
        sx={{ color: textColor }}
      >
        {label}
      </Typography>
      <Typography
        variant='h6'
        sx={{ fontWeight: 'bold', color: textColor, mt: 0.5 }}
      >
        {value}
      </Typography>
    </Box>
  );
};

export default CRMBillingPage;
