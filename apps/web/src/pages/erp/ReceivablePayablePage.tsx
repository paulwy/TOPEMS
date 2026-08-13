import React, { useState, useMemo } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { PageContainer } from '@/components/common';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { receivableSchema, payableSchema } from '@/schemas/finance';
import { receivableApi, payableApi, type Receivable, type Payable } from '@/api/erp';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const ReceivablePayablePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const receivableAdapter: CrudApiAdapter<Receivable> = useMemo(
    () => ({
      list: async (params) => {
        const res = await receivableApi.list({
          page: params?.page,
          pagesize: params?.pageSize,
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
        throw new Error(res.message || '创建失败');
      },
      update: async (id, data) => {
        const res = await receivableApi.update(id, data);
        if (res.success && res.data) {
          return res.data;
        }
        throw new Error(res.message || '更新失败');
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
          pagesize: params?.pageSize,
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
        throw new Error(res.message || '创建失败');
      },
      update: async (id, data) => {
        const res = await payableApi.update(id, data);
        if (res.success && res.data) {
          return res.data;
        }
        throw new Error(res.message || '更新失败');
      },
      delete: async (id) => {
        await payableApi.delete(id);
      },
    }),
    []
  );

  const renderStatsContent = (rows: Array<{ original_value?: number; amount?: number; balance?: number; status?: string }>, total: number) => {
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
        <Box sx={{ p: 2, bgcolor: ct.secondary[100], borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            {activeTab === 0 ? (
              <ArrowUpRight
                size={18}
                sx={{ color: 'secondary.700' }}
              />
            ) : (
              <ArrowDownRight
                size={18}
                sx={{ color: 'secondary.700' }}
              />
            )}
            <Box
              component='span'
              sx={{ color: 'text.secondary', fontSize: 14 }}
            >
              记录总数
            </Box>
          </Box>
          <Box sx={{ fontWeight: 700, fontSize: 24, color: 'secondary.700' }}>{total}</Box>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
          <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>总金额</Box>
          <Box sx={{ fontWeight: 700, fontSize: 24, color: 'success.700' }}>
            {totalAmount.toFixed(2)}
          </Box>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
          <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>待处理金额</Box>
          <Box sx={{ fontWeight: 700, fontSize: 24, color: 'warning.700' }}>
            {pendingAmount.toFixed(2)}
          </Box>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 3 }}>
          <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>逾期数量</Box>
          <Box sx={{ fontWeight: 700, fontSize: 24, color: 'error.dark' }}>{overdueCount}</Box>
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
            <ArrowUpRight style={{ width: 20, height: 20 }} />
          ) : (
            <ArrowDownRight style={{ width: 20, height: 20 }} />
          ),
        pageGradient: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary.dark} 100%)`,
      }}
    >
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ mb: 3 }}
      >
        <Tab
          label='应收账款'
          icon={<ArrowUpRight size={16} />}
        />
        <Tab
          label='应付账款'
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
