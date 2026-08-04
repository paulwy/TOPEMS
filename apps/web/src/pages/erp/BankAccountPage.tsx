/**
 * 银行账户管理页面 — Schema 驱动的 CRUD 页面
 */

import React from 'react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { bankAccountSchema } from '@/schemas/erp/bankAccount';
import { bankAccountApi } from '@/api/erp';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography } from '@mui/material';
import { CreditCard } from 'lucide-react';

const BankAccountStats: React.FC = () => {
  const { data } = useQuery({
    queryKey: [QUERY_KEYS.ERP.BANK_ACCOUNTS, 'stats'],
    queryFn: async () => {
      const response = await bankAccountApi.list({ page: 0, pagesize: 1000 });
      if (!response.success) throw new Error('加载银行账户统计失败');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const accounts = data?.items || [];
  const total = accounts.length;
  const totalBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  const active = accounts.filter((a) => a.status === 'active').length;
  const frozen = accounts.filter((a) => ['frozen', 'closed'].includes(a.status)).length;

  const stats = [
    { label: '账户总数', value: total, color: 'secondary[100]', textColor: 'secondary.700' },
    {
      label: '账户总余额',
      value: `¥${totalBalance.toFixed(2)}`,
      color: 'success.lighter',
      textColor: 'success.700',
    },
    { label: '正常账户', value: active, color: 'warning.light', textColor: 'warning.700' },
    { label: '冻结/注销', value: frozen, color: 'error.lighter', textColor: 'error.dark' },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      {stats.map((stat) => (
        <Box
          key={stat.label}
          sx={{ p: 2, bgcolor: stat.color, borderRadius: 3 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <CreditCard
              size={18}
              sx={{ color: stat.textColor }}
            />
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary', fontSize: 14 }}
            >
              {stat.label}
            </Typography>
          </Box>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700, color: stat.textColor }}
          >
            {stat.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

const bankAccountApiAdapter: CrudApiAdapter = {
  list: async (params) => {
    const response = await bankAccountApi.list({
      page: params?.page,
      pagesize: params?.pageSize,
      search: params?.search,
      status: params?.status as string | undefined,
    });
    if (!response.success) {
      throw new Error('加载银行账户失败');
    }
    const data = response.data;
    return {
      data: (data?.items || []) as unknown as Record<string, unknown>[],
      total: data?.total || 0,
    };
  },

  create: async (data) => {
    const response = await bankAccountApi.create(
      data as Parameters<typeof bankAccountApi.create>[0]
    );
    if (!response.success) {
      throw new Error('创建银行账户失败');
    }
    return response.data as unknown as Record<string, unknown>;
  },

  update: async (id, data) => {
    const response = await bankAccountApi.update(
      id,
      data as Parameters<typeof bankAccountApi.update>[1]
    );
    if (!response.success) {
      throw new Error('更新银行账户失败');
    }
    return response.data as unknown as Record<string, unknown>;
  },

  delete: async (id) => {
    const response = await bankAccountApi.delete(id);
    if (!response.success) {
      throw new Error('删除银行账户失败');
    }
  },
};

const BankAccountPage: React.FC = () => {
  return (
    <CrudPage
      schema={bankAccountSchema}
      apiAdapter={bankAccountApiAdapter}
      breadcrumbs={[
        { label: '首页', href: '/dashboard' },
        { label: 'ERP', href: '/erp' },
        { label: '银行账户管理' },
      ]}
      headerContent={<BankAccountStats />}
    />
  );
};

export default BankAccountPage;
