/**
 * 银行账户管理页面
 * 管理企业银行账户信息
 *
 * 使用 CrudPage + bankAccountSchema 实现 schema 驱动的 CRUD。
 * 数据源：erp 服务 `/bank-accounts`（后端 erp.bank_accounts 表）。
 */
import { useMemo, useCallback } from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { bankAccountSchema } from '@/schemas/admin';
import { bankAccountApi } from '@/api/erp/bankAccount';
import { apiLogger } from '@/utils/logger';
import i18n from '@/i18n';

/**
 * 页面行模型：字段名与 schema 一致（bank_branch / is_primary），
 * 由后端 branch_name / is_default 映射而来。
 */
interface BankAccount {
  id: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  bank_branch?: string;
  currency: string;
  status: string;
  balance: number;
  is_primary: boolean;
  description?: string;
  created_at: string;
}

interface ApiBankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  branch_name?: string;
  currency?: string;
  balance?: number;
  is_default?: boolean;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

const mapApiToRow = (raw: ApiBankAccount): BankAccount => ({
  id: raw.id,
  account_name: raw.account_name,
  account_number: raw.account_number,
  bank_name: raw.bank_name,
  bank_branch: raw.branch_name ?? undefined,
  currency: raw.currency ?? 'CNY',
  status: raw.status ?? 'active',
  balance: Number(raw.balance ?? 0),
  is_primary: Boolean(raw.is_default),
  created_at: raw.created_at ?? '',
});

/** 页面字段 → 后端字段 */
const mapRowToPayload = (data: Record<string, unknown>) => ({
  bank_name: String(data.bank_name ?? ''),
  account_number: String(data.account_number ?? ''),
  account_name: String(data.account_name ?? ''),
  branch_name: data.bank_branch ? String(data.bank_branch) : undefined,
  currency: data.currency ? String(data.currency) : undefined,
  balance: data.balance !== undefined && data.balance !== '' ? Number(data.balance) : undefined,
  is_default: data.is_primary === true,
  status: data.status ? String(data.status) : undefined,
});

export default function BankAccountManagementPage() {
  const apiAdapter: CrudApiAdapter = useMemo(
    () => ({
      list: async (params) => {
        const keyword = (params?.search as string) || '';
        const status = (params?.status as string) || '';
        const page = Number(params?.page ?? 1);
        const pageSize = Number(params?.page_size ?? 20);

        const res = await bankAccountApi.list({
          page,
          page_size: pageSize,
          keyword: keyword || undefined,
          status: status && status !== 'all' ? status : undefined,
        });
        if (!res.success || !res.data) {
          throw new Error(
            res.message ||
              i18n.t('admin.bank_account_management_page.error_load', '银行账户加载失败')
          );
        }
        const items = (res.data.items ?? []) as unknown as ApiBankAccount[];
        return {
          data: items.map(mapApiToRow) as unknown as Record<string, unknown>[],
          total: res.data.total ?? items.length,
        };
      },

      create: async (data) => {
        const res = await bankAccountApi.create(mapRowToPayload(data));
        if (!res.success || !res.data) {
          throw new Error(
            res.message ||
              i18n.t('admin.bank_account_management_page.error_create', '创建银行账户失败')
          );
        }
        const created = mapApiToRow(res.data as unknown as ApiBankAccount);
        apiLogger.info(i18n.t('pages.bank_account_management_page.k0'), created);
        return created as unknown as Record<string, unknown>;
      },

      update: async (id, data) => {
        const res = await bankAccountApi.update(String(id), mapRowToPayload(data));
        if (!res.success || !res.data) {
          throw new Error(
            res.message ||
              i18n.t('admin.bank_account_management_page.error_update', '更新银行账户失败')
          );
        }
        const updated = mapApiToRow(res.data as unknown as ApiBankAccount);
        apiLogger.info(i18n.t('pages.bank_account_management_page.k1'), id);
        return updated as unknown as Record<string, unknown>;
      },

      delete: async (id) => {
        const res = await bankAccountApi.delete(String(id));
        if (!res.success) {
          throw new Error(
            res.message ||
              i18n.t('admin.bank_account_management_page.error_delete', '删除银行账户失败')
          );
        }
        apiLogger.info(i18n.t('pages.bank_account_management_page.k2'), id);
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
      {
        label: i18n.t('admin.bank_account_management_page.k7'),
        value: accounts.length,
        color: 'primary.main',
      },
      {
        label: i18n.t('admin.bank_account_management_page.k8'),
        value: activeCount,
        color: 'success.700',
      },
      {
        label: i18n.t('admin.bank_account_management_page.k9'),
        value: foreignCount,
        color: 'secondary.main',
      },
      {
        label: i18n.t('admin.bank_account_management_page.k10'),
        value: totalBalance.toLocaleString('zh-CN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        color: 'warning.700',
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
        { label: i18n.t('admin.bank_account_management_page.k11'), href: '/dashboard' },
        { label: i18n.t('admin.bank_account_management_page.k12') },
        { label: i18n.t('admin.bank_account_management_page.k13') },
      ]}
    />
  );
}
