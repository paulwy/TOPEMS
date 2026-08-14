import React, { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import { Wallet, Receipt, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { PageContainer } from '@/components/common';
import CrudPage from '@/components/templates/CrudPage';
import { budgetSchema, expenseSchema } from '@/schemas/erp';
import { budgetApi, expenseApi } from '@/api/erp';
import type { Budget, Expense } from '@/api/erp';
import { designTokens } from '@/theme/tokens';
import i18n from '@/i18n';
const ct= designTokens.colors;
const budgetAdapter = {
  list: async (params?: { page?: number; pageSize?: number; search?: string; status?: string }) => {
    const response = await budgetApi.list({
      page: params?.page,
      pagesize: params?.pageSize,
      search: params?.search,
      status: params?.status && params.status !== 'all' ? params.status : undefined,
    });
    if (response.success && response.data) {
      return {
        data: response.data.items || [],
        total: response.data.total || 0,
      };
    }
    return { data: [], total: 0 };
  },
  create: async (data: Partial<Budget>) => {
    const response = await budgetApi.create(data);
    if (!response.success || !response.data) {
      throw new Error(response.message || i18n.t('erp.budget_management_page.k0'));
    }
    return response.data;
  },
  update: async (id: string, data: Partial<Budget>) => {
    const response = await budgetApi.update(id, data);
    if (!response.success || !response.data) {
      throw new Error(response.message || i18n.t('erp.budget_management_page.k1'));
    }
    return response.data;
  },
  delete: async (id: string) => {
    const response = await budgetApi.delete(id);
    if (!response.success) {
      throw new Error(response.message || i18n.t('erp.budget_management_page.k2'));
    }
  },
};
const expenseAdapter = {
  list: async (params?: { page?: number; pageSize?: number; search?: string; status?: string }) => {
    const response = await expenseApi.list({
      page: params?.page,
      pagesize: params?.pageSize,
      search: params?.search,
      status: params?.status && params.status !== 'all' ? params.status : undefined,
    });
    if (response.success && response.data) {
      return {
        data: response.data.items || [],
        total: response.data.total || 0,
      };
    }
    return { data: [], total: 0 };
  },
  create: async (data: Partial<Expense>) => {
    const response = await expenseApi.create(data);
    if (!response.success || !response.data) {
      throw new Error(response.message || i18n.t('erp.budget_management_page.k3'));
    }
    return response.data;
  },
  update: async (id: string, data: Partial<Expense>) => {
    const response = await expenseApi.update(id, data);
    if (!response.success || !response.data) {
      throw new Error(response.message || i18n.t('erp.budget_management_page.k4'));
    }
    return response.data;
  },
  delete: async (id: string) => {
    const response = await expenseApi.delete(id);
    if (!response.success) {
      throw new Error(response.message || i18n.t('erp.budget_management_page.k5'));
    }
  },
};
const StatCard: React.FC<{
  label: string;
  value: number | string;
  icon: React.ReactNode;
  bgColor?: string;
  iconColor?: string;
}> = ({ label, value, icon, bgColor, iconColor }) => (
  <Box sx={{ p: 2, bgcolor: bgColor || 'secondary.100', borderRadius: 3 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
      <Box sx={{ display: 'flex', color: iconColor || 'secondary.700' }}>{icon}</Box>
      <Box
        component='span'
        sx={{ color: 'text.secondary', fontSize: 14 }}
      >
        {label}
      </Box>
    </Box>
    <Box sx={{ fontWeight: 700, fontSize: 24, color: iconColor || 'secondary.700' }}>{value}</Box>
  </Box>
);
const BudgetManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const budgetHeaderContent = (rows: Record<string, unknown>[], total: number) => {
    const budgets = rows as unknown as Budget[];
    const totalAmount = budgets.reduce((sum, item) => sum + (item.total_budget || 0), 0);
    const spentAmount = budgets.reduce((sum, item) => sum + (item.used_amount || 0), 0);
    const exceededCount = budgets.filter(
      (b) => (b.used_amount || 0) > (b.total_budget || 0)
    ).length;
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
          label={i18n.t('erp.budget_management_page.k6')}
          value={total}
          icon={<Wallet size={18} />}
          bgColor={ct.secondary[100]}
          iconColor='secondary.700'
        />
        <StatCard
          label={i18n.t('erp.budget_management_page.k7')}
          value={`¥${totalAmount.toFixed(2)}`}
          icon={<Wallet size={18} />}
          bgColor='success.lighter'
          iconColor='success.700'
        />
        <StatCard
          label={i18n.t('erp.budget_management_page.k8')}
          value={`¥${spentAmount.toFixed(2)}`}
          icon={<Receipt size={18} />}
          bgColor='warning.light'
          iconColor='warning.700'
        />
        <StatCard
          label={i18n.t('erp.budget_management_page.k9')}
          value={exceededCount}
          icon={<AlertTriangle size={18} />}
          bgColor='error.lighter'
          iconColor='error.dark'
        />
      </Box>
    );
  };
  const expenseHeaderContent = (rows: Record<string, unknown>[], total: number) => {
    const expenses = rows as unknown as Expense[];
    const totalAmount = expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
    const pendingCount = expenses.filter((e) => e.status === 'pending').length;
    const completedCount = expenses.filter((e) => e.status === 'completed').length;
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
          label={i18n.t('erp.budget_management_page.k10')}
          value={total}
          icon={<Receipt size={18} />}
          bgColor={ct.secondary[100]}
          iconColor='secondary.700'
        />
        <StatCard
          label={i18n.t('erp.budget_management_page.k11')}
          value={`¥${totalAmount.toFixed(2)}`}
          icon={<Receipt size={18} />}
          bgColor='success.lighter'
          iconColor='success.700'
        />
        <StatCard
          label={i18n.t('erp.budget_management_page.k12')}
          value={pendingCount}
          icon={<Clock size={18} />}
          bgColor='warning.light'
          iconColor='warning.700'
        />
        <StatCard
          label={i18n.t('erp.budget_management_page.k13')}
          value={completedCount}
          icon={<CheckCircle size={18} />}
          bgColor='error.lighter'
          iconColor='error.dark'
        />
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
            <Wallet style={{ width: 20, height: 20 }} />
          ) : (
            <Receipt style={{ width: 20, height: 20 }} />
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
          label={i18n.t('erp.budget_management_page.k14')}
          icon={<Wallet size={16} />}
        />
        <Tab
          label={i18n.t('erp.budget_management_page.k15')}
          icon={<Receipt size={16} />}
        />
      </Tabs>
      {activeTab === 0 && (
        <CrudPage
          schema={budgetSchema}
          apiAdapter={budgetAdapter}
          headerContent={budgetHeaderContent}
        />
      )}
      {activeTab === 1 && (
        <CrudPage
          schema={expenseSchema}
          apiAdapter={expenseAdapter}
          headerContent={expenseHeaderContent}
        />
      )}
    </PageContainer>
  );
};
export default BudgetManagementPage;