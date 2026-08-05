/**
 * 银行账户管理页面
 * 管理企业银行账户信息
 *
 * 使用 CrudPage + bankAccountSchema 实现 schema 驱动的 CRUD。
 */

import { useMemo, useCallback } from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { bankAccountSchema } from '@/schemas/admin';
import { apiLogger } from '@/utils/logger';

interface BankAccount {
  id: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  bank_branch?: string;
  account_type: string;
  currency: string;
  status: string;
  balance: number;
  is_primary: boolean;
  description?: string;
  created_at: string;
}

// 模拟数据（内存存储，支持 CRUD 操作）
const mockBankAccounts: BankAccount[] = [
  {
    id: '1',
    account_name: '基本户',
    account_number: '1234567890123456',
    bank_name: '中国工商银行',
    bank_branch: '北京分行',
    account_type: 'checking',
    currency: 'CNY',
    status: 'active',
    balance: 1234567.89,
    is_primary: true,
    created_at: '2024-01-01',
  },
  {
    id: '2',
    account_name: '一般户',
    account_number: '9876543210987654',
    bank_name: '中国建设银行',
    bank_branch: '上海分行',
    account_type: 'savings',
    currency: 'CNY',
    status: 'active',
    balance: 654321.12,
    is_primary: false,
    created_at: '2024-01-15',
  },
];

let nextId = 3;

export default function BankAccountManagementPage() {
  const apiAdapter: CrudApiAdapter = useMemo(
    () => ({
      list: async (params) => {
        const search = (params?.search as string) || '';
        const typeFilter = (params?.account_type as string) || 'all';
        const statusFilter = (params?.status as string) || 'all';

        let filtered = [...mockBankAccounts];

        if (search) {
          const searchLower = search.toLowerCase();
          filtered = filtered.filter(
            (account) =>
              account.account_name.toLowerCase().includes(searchLower) ||
              account.account_number.includes(search) ||
              account.bank_name.toLowerCase().includes(searchLower)
          );
        }

        if (typeFilter !== 'all') {
          filtered = filtered.filter((account) => account.account_type === typeFilter);
        }

        if (statusFilter !== 'all') {
          filtered = filtered.filter((account) => account.status === statusFilter);
        }

        return {
          data: filtered as unknown as Record<string, unknown>[],
          total: filtered.length,
        };
      },
      create: async (data) => {
        const newAccount: BankAccount = {
          id: String(nextId++),
          account_name: String(data.account_name || ''),
          account_number: String(data.account_number || ''),
          bank_name: String(data.bank_name || ''),
          bank_branch: data.bank_branch ? String(data.bank_branch) : undefined,
          account_type: String(data.account_type || 'checking'),
          currency: String(data.currency || 'CNY'),
          status: String(data.status || 'active'),
          balance: 0,
          is_primary: data.is_primary === true,
          description: data.description ? String(data.description) : undefined,
          created_at: new Date().toISOString().split('T')[0],
        };
        mockBankAccounts.push(newAccount);
        apiLogger.info('创建银行账户:', newAccount);
        return newAccount as unknown as Record<string, unknown>;
      },
      update: async (id, data) => {
        const idx = mockBankAccounts.findIndex((a) => a.id === String(id));
        if (idx === -1) throw new Error('银行账户不存在');
        const updated: BankAccount = {
          ...mockBankAccounts[idx],
          ...(data as Partial<BankAccount>),
        };
        mockBankAccounts[idx] = updated;
        apiLogger.info('更新银行账户:', id, data);
        return updated as unknown as Record<string, unknown>;
      },
      delete: async (id) => {
        const idx = mockBankAccounts.findIndex((a) => a.id === String(id));
        if (idx !== -1) {
          apiLogger.info('删除银行账户:', id);
          mockBankAccounts.splice(idx, 1);
        }
      },
    }),
    []
  );

  const headerContent = useCallback((rows: Record<string, unknown>[]) => {
    const accounts = rows as unknown as BankAccount[];
    const totalBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
    const activeCount = accounts.filter((a) => a.status === 'active').length;
    const foreignCount = accounts.filter((a) => a.currency !== 'CNY').length;

    const stats = [
      { label: '账户总数', value: accounts.length, color: 'primary.main' },
      { label: '正常账户', value: activeCount, color: 'success.main' },
      { label: '外币账户', value: foreignCount, color: 'secondary.main' },
      {
        label: '账户总余额',
        value: totalBalance.toLocaleString('zh-CN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        color: 'warning.main',
      },
    ];

    return (
      <Box sx={{ mb: 3 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' },
            gap: 2,
          }}
        >
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 'bold', color: stat.color }}
                >
                  {stat.value}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {stat.label}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>
    );
  }, []);

  return (
    <CrudPage
      schema={bankAccountSchema}
      apiAdapter={apiAdapter}
      headerContent={headerContent}
      breadcrumbs={[
        { label: '首页', href: '/dashboard' },
        { label: '系统管理' },
        { label: '银行账户管理' },
      ]}
    />
  );
}
