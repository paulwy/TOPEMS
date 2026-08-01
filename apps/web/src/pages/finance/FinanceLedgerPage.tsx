import React from 'react';
import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import { ledgerSchema } from '@/schemas/finance';
import { accountApi } from '@/api/finance';
import { useQuery } from '@tanstack/react-query';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { FileText, Calculator, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { designTokens } from '@/theme/tokens';
import type { Account } from '@/types/finance';

const ct = designTokens.colors;

const ledgerApiAdapter: CrudApiAdapter = {
  list: async (params) => {
    const search = params?.search?.toLowerCase() || '';
    const category = params?.category as string | undefined;
    const status = params?.status as string | undefined;
    const page = params?.page || 0;
    const pageSize = params?.pageSize || 10;

    const response = await accountApi.list({
      keyword: search || undefined,
      category: category && category !== 'all' ? category : undefined,
      status: status && status !== 'all' ? status : undefined,
      page: page + 1,
      pagesize: pageSize,
    });

    if (!response.success || !response.data) {
      return { data: [], total: 0 };
    }

    const items = response.data.items || [];
    const total = response.data.total || items.length;
    return { data: items as unknown as Record<string, unknown>[], total };
  },
  create: async (data) => {
    const response = await accountApi.create(data as Partial<Account>);
    if (!response.success || !response.data) throw new Error('创建科目失败');
    return response.data as unknown as Record<string, unknown>;
  },
  update: async (id, data) => {
    const response = await accountApi.update(id, data as Partial<Account>);
    if (!response.success || !response.data) throw new Error('更新科目失败');
    return response.data as unknown as Record<string, unknown>;
  },
  delete: async (id) => {
    const response = await accountApi.delete(id);
    if (!response.success) throw new Error('删除科目失败');
  },
};

const LedgerStats: React.FC = () => {
  const { data: accounts = [] } = useQuery({
    queryKey: ['finance-ledger-stats'],
    queryFn: async () => {
      const response = await accountApi.list({ pagesize: 200 });
      if (response.success && response.data) {
        return response.data.items || [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const stats = React.useMemo(
    () => ({
      total: accounts.length,
      asset: accounts.filter((a: Account) => a.category === 'asset').length,
      liability: accounts.filter((a: Account) => a.category === 'liability').length,
      equity: accounts.filter((a: Account) => a.category === 'equity').length,
      expenseIncome: accounts.filter(
        (a: Account) => a.category === 'expense' || a.category === 'income'
      ).length,
    }),
    [accounts]
  );

  const statCards = [
    {
      label: '科目总数',
      value: stats.total,
      color: ct.purple[500],
      bgColor: 'secondary.light',
      icon: <Calculator sx={{ width: 20, height: 20 }} />,
    },
    {
      label: '资产类',
      value: stats.asset,
      color: 'info.dark',
      bgColor: 'info.lighter',
      icon: <Wallet sx={{ width: 20, height: 20 }} />,
    },
    {
      label: '负债类',
      value: stats.liability,
      color: 'error.dark',
      bgColor: 'error.lighter',
      icon: <TrendingUp sx={{ width: 20, height: 20 }} />,
    },
    {
      label: '权益类',
      value: stats.equity,
      color: 'success.dark',
      bgColor: 'success.lighter',
      icon: <TrendingDown sx={{ width: 20, height: 20 }} />,
    },
    {
      label: '损益类',
      value: stats.expenseIncome,
      color: 'warning.dark',
      bgColor: 'warning.lighter',
      icon: <FileText sx={{ width: 20, height: 20 }} />,
    },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(5, 1fr)' },
        gap: 2,
        mb: 4,
      }}
    >
      {statCards.map((card) => (
        <Card key={card.label}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: card.bgColor,
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {React.cloneElement(card.icon, { style: { color: card.color } })}
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  {card.label}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {card.value}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

const FinanceLedgerPage: React.FC = () => {
  return (
    <CrudPage
      schema={ledgerSchema}
      apiAdapter={ledgerApiAdapter}
      breadcrumbs={[{ label: '财务管理' }, { label: '总账管理' }]}
      headerContent={<LedgerStats />}
    />
  );
};

export default FinanceLedgerPage;
