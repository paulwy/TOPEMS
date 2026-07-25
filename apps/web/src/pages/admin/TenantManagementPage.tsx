import React from 'react';
import { Box } from '@mui/material';
import { Building2, CheckCircle, XCircle, Clock, Users } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import CrudPage from '@/components/templates/CrudPage';
import { tenantSchema } from '@/schemas/admin';
import { tenantApi } from '@/api/admin';
import type { Tenant } from '@/api/admin';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const tenantAdapter = {
  list: async (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
  }) => {
    const response = await tenantApi.list({
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
  create: async (data: Partial<Tenant>) => {
    const response = await tenantApi.create(data);
    if (!response.success || !response.data) {
      throw new Error(response.message || '创建租户失败');
    }
    return response.data;
  },
  update: async (id: string, data: Partial<Tenant>) => {
    const response = await tenantApi.update(id, data);
    if (!response.success || !response.data) {
      throw new Error(response.message || '更新租户失败');
    }
    return response.data;
  },
  delete: async (id: string) => {
    const response = await tenantApi.delete(id);
    if (!response.success) {
      throw new Error(response.message || '删除租户失败');
    }
  },
};

const StatCard: React.FC<{
  label: string;
  value: number | string;
  icon: React.ReactNode;
  bgColor: string;
  iconColor: string;
}> = ({ label, value, icon, bgColor, iconColor }) => (
  <Box sx={{ p: 2, bgcolor: bgColor, borderRadius: 3 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
      <Box sx={{ display: 'flex', color: iconColor }}>{icon}</Box>
      <Box component='span' sx={{ color: 'text.secondary', fontSize: 14 }}>
        {label}
      </Box>
    </Box>
    <Box sx={{ fontWeight: 700, fontSize: 24, color: iconColor }}>{value}</Box>
  </Box>
);

const TenantManagementPage: React.FC = () => {
  const headerContent = (rows: Record<string, unknown>[], total: number) => {
    const tenants = rows as Tenant[];
    const activeCount = tenants.filter((t) => t.status === 'active').length;
    const inactiveCount = tenants.filter((t) => t.status === 'inactive').length;
    const pendingCount = tenants.filter((t) => t.status === 'pending').length;

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
          label='租户总数'
          value={total}
          icon={<Building2 size={18} />}
          bgColor={ct.secondary[100]}
          iconColor='secondary.700'
        />
        <StatCard
          label='活跃租户'
          value={activeCount}
          icon={<CheckCircle size={18} />}
          bgColor='success.lighter'
          iconColor='success.700'
        />
        <StatCard
          label='待审核'
          value={pendingCount}
          icon={<Clock size={18} />}
          bgColor='warning.light'
          iconColor='warning.700'
        />
        <StatCard
          label='已停用'
          value={inactiveCount}
          icon={<XCircle size={18} />}
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
        pageIcon: <Building2 style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary.dark} 100%)`,
      }}
    >
      <CrudPage
        schema={tenantSchema}
        apiAdapter={tenantAdapter}
        headerContent={headerContent}
      />
    </PageContainer>
  );
};

export default TenantManagementPage;
