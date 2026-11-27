import React, { useState, useMemo } from 'react';
import styles from './ReceivablePayablePage.module.css';
import { Box, Tabs, Tab, useTheme } from '@mui/material';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { PageContainer } from '@/components/common';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { receivableSchema, payableSchema } from '@/schemas/finance';
import { receivableApi, payableApi, type Receivable, type Payable } from '@/api/finance';
import i18n from '@/i18n';

const ReceivablePayablePage: React.FC = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const receivableAdapter: CrudApiAdapter<Receivable> = useMemo(
    () => ({
      list: async (params) => {
        const res = await receivableApi.list({
          page: params?.page,
          page_size: params?.pageSize,
          search: params?.search,
          status: params?.status as string,
        });
        if (res.success && res.data) {
          return { data: res.data.items || [], total: res.data.total || 0 };
        }
        return { data: [], total: 0 };
      },
      create: async (data) => {
        const res = await receivableApi.create(data);
        if (res.success && res.data) {
          return res.data;
        }
        throw new Error(res.message || i18n.t('erp.receivable_payable_page.k0'));
      },
      update: async (id, data) => {
        const res = await receivableApi.update(id, data);
        if (res.success && res.data) {
          return res.data;
        }
        throw new Error(res.message || i18n.t('erp.receivable_payable_page.k1'));
      },
      delete: async (id) => {
        await receivableApi.delete(id);
      },
    }),
    []
  );
  const payableAdapter: CrudApiAdapter<Payable> = useMemo(
    () => ({
      list: async (params) => {
        const res = await payableApi.list({
          page: params?.page,
          page_size: params?.pageSize,
          search: params?.search,
          status: params?.status as string,
        });
        if (res.success && res.data) {
          return { data: res.data.items || [], total: res.data.total || 0 };
        }
        return { data: [], total: 0 };
      },
      create: async (data) => {
        const res = await payableApi.create(data);
        if (res.success && res.data) {
          return res.data;
        }
        throw new Error(res.message || i18n.t('erp.receivable_payable_page.k2'));
      },
      update: async (id, data) => {
        const res = await payableApi.update(id, data);
        if (res.success && res.data) {
          return res.data;
        }
        throw new Error(res.message || i18n.t('erp.receivable_payable_page.k3'));
      },
      delete: async (id) => {
        await payableApi.delete(id);
      },
    }),
    []
  );
  const renderStatsContent = (
    rows: Array<{ original_value?: number; amount?: number; balance?: number; status?: string }>,
    total: number
  ) => {
    const totalAmount = rows.reduce((sum, item) => sum + (item.amount || 0), 0);
    const pendingAmount = rows
      .filter((item) => item.status === 'pending' || item.status === 'draft')
      .reduce((sum, item) => sum + (item.amount || 0), 0);
    const overdueCount = rows.filter((item) => item.status === 'overdue').length;
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box sx={{ p: 2, bgcolor: theme.palette.secondary[100], borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            {activeTab === 0 ? (
              <ArrowUpRight
                size={18}
                sx={{ color: 'var(--accent-secondary-text)' }}
              />
            ) : (
              <ArrowDownRight
                size={18}
                sx={{ color: 'var(--accent-secondary-text)' }}
              />
            )}
            <Box
              component='span'
              sx={{ color: 'text.secondary', fontSize: 14 }}
            >
              {i18n.t('pages.receivable_payable_page.k0')}
            </Box>
          </Box>
          <Box sx={{ fontWeight: 700, fontSize: 24, color: 'var(--accent-secondary-text)' }}>
            {total}
          </Box>
        </Box>
        <Box
          sx={{
            p: 2,
            bgcolor: 'var(--surface-2)',
            borderLeft: '3px solid',
            borderColor: 'success.main',
            borderRadius: 3,
          }}
        >
          <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>
            {i18n.t('erp.receivable_payable_page.k4')}
          </Box>
          <Box sx={{ fontWeight: 700, fontSize: 24, color: 'var(--success-text)' }}>
            {totalAmount.toFixed(2)}
          </Box>
        </Box>
        <Box
          sx={{
            p: 2,
            bgcolor: 'var(--surface-2)',
            borderLeft: '3px solid',
            borderColor: 'warning.main',
            borderRadius: 3,
          }}
        >
          <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>
            {i18n.t('erp.receivable_payable_page.k5')}
          </Box>
          <Box sx={{ fontWeight: 700, fontSize: 24, color: 'var(--warning-text)' }}>
            {pendingAmount.toFixed(2)}
          </Box>
        </Box>
        <Box
          sx={{
            p: 2,
            bgcolor: 'var(--surface-2)',
            borderLeft: '3px solid',
            borderColor: 'error.main',
            borderRadius: 3,
          }}
        >
          <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>
            {i18n.t('erp.receivable_payable_page.k6')}
          </Box>
          <Box sx={{ fontWeight: 700, fontSize: 24, color:'error.700' }}>{overdueCount}</Box>
        </Box>
      </Box>
    );
  };
  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon:
          activeTab === 0 ? (
            <ArrowUpRight className={styles.il1} />
          ) : (
            <ArrowDownRight className={styles.il2} />
          ),
        pageGradient: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
      }}
    >
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ mb: 3 }}
      >
        <Tab
          label={i18n.t('erp.receivable_payable_page.k7')}
          icon={<ArrowUpRight size={16} />}
        />
        <Tab
          label={i18n.t('erp.receivable_payable_page.k8')}
          icon={<ArrowDownRight size={16} />}
        />
      </Tabs>
      {activeTab === 0 && (
        <CrudPage
          schema={receivableSchema}
          apiAdapter={receivableAdapter}
          headerContent={renderStatsContent}
        />
      )}
      {activeTab === 1 && (
        <CrudPage
          schema={payableSchema}
          apiAdapter={payableAdapter}
          headerContent={renderStatsContent}
        />
      )}
    </PageContainer>
  );
};
export default ReceivablePayablePage;
