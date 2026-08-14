/**
 * 会计管理页面（Schema 驱动版本）
 *
 * 原版: 974 行手写双 Tab 表格、表单、详情、统计卡片
 * Schema 版: ~210 行（减少 78%+）
 *
 * 使用 CrudPage + EntitySchema 实现：
 * - Tab 1: 会计科目（accountingSubjectSchema 驱动）
 * - Tab 2: 期初余额（openingBalanceSchema 驱动 + 结转按钮）
 */

import React, { useMemo } from 'react';
import { Box, Tabs, Tab, Button } from '@mui/material';
import { FileSpreadsheet, RefreshCw } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store';
import { QUERY_KEYS } from '@/lib/reactQuery';
import {
  accountingSubjectApi,
  openingBalanceApi,
  type AccountingSubject,
  type OpeningBalance,
} from '@/api/erp';
import { accountingSubjectSchema, openingBalanceSchema } from '@/schemas/finance';
import { designTokens } from '@/theme/tokens';

const ct= designTokens.colors;

const AccountingManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState(0);
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  // ── 会计科目 API 适配器 ──
  const subjectAdapter: CrudApiAdapter<AccountingSubject> = useMemo(
    () => ({
      list: async (params) => {
        const res = await accountingSubjectApi.list({
          page: params?.page,
          pagesize: params?.pageSize,
          search: params?.search as string,
          status: params?.status as string,
        });
        if (res.success && res.data) {
          return {
            data: res.data.items || [],
            total: res.data.total || 0,
          };
        }
        return { data: [], total: 0 };
      },
      create: async (data) => {
        const res = await accountingSubjectApi.create(data);
        if (!res.success) throw new Error(res.message || '创建失败');
        return res.data as AccountingSubject;
      },
      update: async (id, data) => {
        const res = await accountingSubjectApi.update(id, data);
        if (!res.success) throw new Error(res.message || '更新失败');
        return res.data as AccountingSubject;
      },
      delete: async (id) => {
        const res = await accountingSubjectApi.delete(id);
        if (!res.success) throw new Error(res.message || '删除失败');
      },
    }),
    []
  );

  // ── 期初余额 API 适配器 ──
  const balanceAdapter: CrudApiAdapter<OpeningBalance> = useMemo(
    () => ({
      list: async (params) => {
        const res = await openingBalanceApi.list({
          page: params?.page,
          pagesize: params?.pageSize,
          search: params?.search as string,
          period: params?.period as string,
        });
        if (res.success && res.data) {
          return {
            data: res.data.items || [],
            total: res.data.total || 0,
          };
        }
        return { data: [], total: 0 };
      },
      create: async (data) => {
        const res = await openingBalanceApi.create({
          company_id: (data.company_id as string) || '',
          subject_code: (data.subject_code as string) || '',
          subject_name: (data.subject_name as string) || '',
          period: (data.period as string) || '',
          debit_balance: Number(data.debit_balance ?? 0),
          credit_balance: Number(data.credit_balance ?? 0),
        });
        if (!res.success) throw new Error(res.message || '创建失败');
        return res.data as OpeningBalance;
      },
      update: async (id, data) => {
        const res = await openingBalanceApi.update(id, {
          company_id: (data.company_id as string) || '',
          subject_code: (data.subject_code as string) || '',
          subject_name: (data.subject_name as string) || '',
          period: (data.period as string) || '',
          debit_balance: Number(data.debit_balance ?? 0),
          credit_balance: Number(data.credit_balance ?? 0),
        });
        if (!res.success) throw new Error(res.message || '更新失败');
        return res.data as OpeningBalance;
      },
      delete: async (id) => {
        const res = await openingBalanceApi.delete(id);
        if (!res.success) throw new Error(res.message || '删除失败');
      },
    }),
    []
  );

  // ── 结转期初余额 ──
  const carryForwardMutation = useMutation({
    mutationFn: () => {
      const now = new Date().toISOString().slice(0, 7);
      return openingBalanceApi.carryForward({ from_period: now, to_period: now });
    },
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: '结转成功',
        message: '期初余额已结转',
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ERP.OPENING_BALANCES ,
  exact: false,
  refetchType: 'active',
});
    },
    onError: () => {
      addNotification({
        type: 'error',
        title: '结转失败',
        message: '无法结转期初余额',
      });
    },
  });

  // ── 期初余额 Tab 的头部操作（结转按钮） ──
  const balanceHeaderContent = useMemo(
    () => (
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
        <Button
          variant='outlined'
          size='small'
          color='primary'
          startIcon={<RefreshCw size={16} />}
          onClick={() => carryForwardMutation.mutate()}
          disabled={carryForwardMutation.isPending}
        >
          {carryForwardMutation.isPending ? '结转中...' : '结转期初余额'}
        </Button>
      </Box>
    ),
    [carryForwardMutation]
  );

  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <FileSpreadsheet style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary.dark} 100%)`,
      }}
    >
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab
          label='会计科目'
          icon={<FileSpreadsheet size={16} />}
          iconPosition='start'
        />
        <Tab
          label='期初余额'
          icon={<RefreshCw size={16} />}
          iconPosition='start'
        />
      </Tabs>

      {activeTab === 0 ? (
        <CrudPage
          schema={accountingSubjectSchema}
          apiAdapter={subjectAdapter}
          breadcrumbs={[{ label: 'ERP' }, { label: '会计科目' }]}
        />
      ) : (
        <CrudPage
          schema={openingBalanceSchema}
          apiAdapter={balanceAdapter}
          breadcrumbs={[{ label: 'ERP' }, { label: '期初余额' }]}
          headerContent={balanceHeaderContent}
        />
      )}
    </PageContainer>
  );
};

export default AccountingManagementPage;
