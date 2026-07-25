import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { AlertCircle, CheckCircle, DollarSign, FileText } from 'lucide-react';
import { CrudPage, type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { contractSchema } from '@/schemas/pm';
import { pmApi } from '@/api/pm';
import type { Contract } from '@/api/pm';
import { PM_PATHS } from '@/modules/pm/config';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const CURRENCY_FORMATTER = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 0,
});

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  valueColor: string;
  bgColor: string;
  icon: React.ReactNode;
  iconColor: string;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  valueColor,
  bgColor,
  icon,
  iconColor,
}) => (
  <Box
    sx={{
      bgcolor: 'background.paper',
      borderRadius: 3,
      boxShadow: 1,
      p: 3,
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box sx={{ p: 1.5, bgcolor: bgColor, borderRadius: '50%' }}>
        {React.cloneElement(icon as React.ReactElement<{ color?: string; size?: number }>, {
          color: iconColor,
        })}
      </Box>
      <Box>
        <Box sx={{ fontSize: '0.875rem', color: 'grey.500' }}>{label}</Box>
        <Box sx={{ fontSize: '1.5rem', fontWeight: 700, color: valueColor }}>{value}</Box>
      </Box>
    </Box>
  </Box>
);

const contractApiAdapter: CrudApiAdapter = {
  list: async (params) => {
    const response = await pmApi.contracts.list();
    if (!response.success || !response.data) {
      return { data: [], total: 0 };
    }

    let items = (response.data as Contract[]) || [];

    if (params?.contract_type && params.contract_type !== 'all') {
      items = items.filter((c) => c.contract_type === params.contract_type);
    }
    if (params?.status && params.status !== 'all') {
      items = items.filter((c) => c.status === params.status);
    }
    if (params?.search) {
      const q = String(params.search).toLowerCase();
      items = items.filter(
        (c) => c.contract_name.toLowerCase().includes(q) || c.contract_no.toLowerCase().includes(q)
      );
    }

    const total = items.length;
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const paged = items.slice((page - 1) * pageSize, page * pageSize);
    return { data: paged as unknown as Record<string, unknown>[], total };
  },

  create: async (data) => {
    const payload = data as Record<string, unknown>;
    // 后端 create 接口使用 contract_code 字段，列表数据使用 contract_no
    const { contract_no, ...rest } = payload;
    const response = await pmApi.contracts.create({
      ...(rest as Parameters<typeof pmApi.contracts.create>[0]),
      contract_code: (contract_no as string) || '',
    });
    if (!response.success) {
      throw new Error(response.message || '创建合同失败');
    }
    return data as Record<string, unknown>;
  },

  update: async (id, data) => {
    const response = await pmApi.contracts.update(
      id,
      data as Parameters<typeof pmApi.contracts.update>[1]
    );
    if (!response.success) {
      throw new Error(response.message || '更新合同失败');
    }
    return { ...(data as Record<string, unknown>), id };
  },

  delete: async (id) => {
    const response = await pmApi.contracts.delete(id);
    if (!response.success) {
      throw new Error(response.message || '删除合同失败');
    }
  },
};

const PmContractListPage: React.FC = () => {
  const navigate = useNavigate();

  const customRowActions: RowAction[] = useMemo(
    () => [
      {
        key: 'view-detail',
        label: '查看详情',
        icon: <FileText size={16} />,
        onClick: (row) => {
          const id = String(row.id);
          if (id) {
            navigate(`${PM_PATHS.contracts}/${id}`);
          }
        },
      },
    ],
    [navigate]
  );

  const headerContent = React.useCallback((rows: Record<string, unknown>[]) => {
    const activeCount = rows.filter((r) => r.status === 'active').length;
    const pendingCount = rows.filter((r) => r.status === 'pending').length;
    const totalAmount = rows.reduce((sum, r) => sum + ((r.amount as number) || 0), 0);

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <StatCard
          label='合同总数'
          value={rows.length}
          valueColor='grey.900'
          bgColor='primary.100'
          icon={<FileText size={24} />}
          iconColor='primary.dark'
        />
        <StatCard
          label='执行中'
          value={activeCount}
          valueColor='success.dark'
          bgColor='success.light'
          icon={<CheckCircle size={24} />}
          iconColor='success.dark'
        />
        <StatCard
          label='待审批'
          value={pendingCount}
          valueColor='warning.dark'
          bgColor='warning.light'
          icon={<AlertCircle size={24} />}
          iconColor={ct.yellow[600]}
        />
        <StatCard
          label='合同总金额'
          value={CURRENCY_FORMATTER.format(totalAmount)}
          valueColor='secondary.dark'
          bgColor={ct.purple[200]}
          icon={<DollarSign size={24} />}
          iconColor={ct.purple[700]}
        />
      </Box>
    );
  }, []);

  return (
    <CrudPage
      schema={contractSchema}
      apiAdapter={contractApiAdapter}
      customRowActions={customRowActions}
      breadcrumbs={[
        { label: '首页', href: '/dashboard' },
        { label: '项目管理' },
        { label: '合同管理' },
      ]}
      headerContent={headerContent}
    />
  );
};

export default PmContractListPage;
