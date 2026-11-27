import React from 'react';
import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import { ledgerSchema } from '@/schemas/finance';
import { accountApi } from '@/api/finance';
import { useQuery } from '@tanstack/react-query';
import { Box, Card, CardContent, Typography, alpha, useTheme } from '@mui/material';
import { FileText, Calculator, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { designTokens } from '@/theme/tokens';
import type { Account } from '@/types/finance';

import { QUERY_KEYS } from '@/lib/reactQuery';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

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
      page_size: pageSize,
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
    if (!response.success || !response.data)
      throw new Error(i18n.t('finance.finance_ledger_page.k0'));
    return response.data as unknown as Record<string, unknown>;
  },
  update: async (id, data) => {
    const response = await accountApi.update(id, data as Partial<Account>);
    if (!response.success || !response.data)
      throw new Error(i18n.t('finance.finance_ledger_page.k1'));
    return response.data as unknown as Record<string, unknown>;
  },
  delete: async (id) => {
    const response = await accountApi.delete(id);
    if (!response.success) throw new Error(i18n.t('finance.finance_ledger_page.k2'));
  },
};

const LedgerStats: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation('finance');
  const { data: accounts = [] } = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.FINANCE_LEDGER_STATS_BASE,
    queryFn: async () => {
      const response = await accountApi.list({ page_size: 200 });
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
      label: t('finance.finance_ledger_page.k3'),
      value: stats.total,
      color: theme.palette.purple[500],
      bgColor: 'secondary.light',
      icon: <Calculator sx={{ width: 20, height: 20 }} />,
    },
    {
      label: t('finance.finance_ledger_page.k4'),
      value: stats.asset,
      color:'info.700',
      bgColor: 'info.50',
      icon: <Wallet sx={{ width: 20, height: 20 }} />,
    },
    {
      label: t('finance.finance_ledger_page.k5'),
      value: stats.liability,
      color:'error.700',
      bgColor: 'error.50',
      icon: <TrendingUp sx={{ width: 20, height: 20 }} />,
    },
    {
      label: t('finance.finance_ledger_page.k6'),
      value: stats.equity,
      color:'success.700',
      bgColor: 'success.50',
      icon: <TrendingDown sx={{ width: 20, height: 20 }} />,
    },
    {
      label: t('finance.finance_ledger_page.k7'),
      value: stats.expenseIncome,
      color:'warning.700',
      bgColor: 'warning.50',
      icon: <FileText sx={{ width: 20, height: 20 }} />,
    },
  ];

  // 语义色解析：卡片里既可能写调色板路径（'info.dark'），也可能写实色（purple[500]）；
  // 一律解析成合法色值，避免 'slate.900'/'secondary.light' 这类路径落空后图标与瓦片同色。
  const resolveColor = (token?: string, fallback = theme.palette.text.primary): string => {
    if (!token) return fallback;
    if (/^(#|rgb|hsl|color\(|var\()/i.test(token.trim())) return token;
    const value = token
      .split('.')
      .reduce<unknown>(
        (acc, key) => (acc == null ? acc : (acc as Record<string, unknown>)[key]),
        theme.palette
      );
    return typeof value === 'string' ? value : fallback;
  };

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
                  bgcolor: alpha(resolveColor(card.color), 0.14),
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {React.cloneElement(card.icon, { style: { color: resolveColor(card.color) } })}
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{
                    color: 'text.secondary',
                    fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                  }}
                >
                  {card.label}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'text.primary' }}
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
  const { t } = useTranslation('finance');
  return (
    <CrudPage
      schema={ledgerSchema}
      apiAdapter={ledgerApiAdapter}
      breadcrumbs={[
        { label: t('finance.finance_ledger_page.k9') },
        { label: t('finance.finance_ledger_page.k8') },
      ]}
      headerContent={<LedgerStats />}
    />
  );
};

export default FinanceLedgerPage;
