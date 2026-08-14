import React from 'react';
import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { contractSchema } from '@/schemas/srm';
import { srmApi } from '@/api/srm';
import { useQuery } from '@tanstack/react-query';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { FileText, CheckCircle, Clock, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SRM_PATHS } from '@/modules/srm/config';
import { designTokens } from '@/theme/tokens';


import { QUERY_KEYS } from '@/lib/reactQuery';

const ct= designTokens.colors;

interface SupplierContract {
  id: string;
  contractNo: string;
  supplier_id: string;
  supplier_name?: string;
  title: string;
  contract_type: string;
  total_amount?: number;
  currency: string;
  sign_date?: string;
  start_date?: string;
  end_date?: string;
  status: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

const contractApiAdapter: CrudApiAdapter = {
  list: async (params) => {
    const response = await srmApi.listContracts();
    if (!response.success || !response.data) {
      return { data: [], total: 0 };
    }
    const items = (response.data || []) as SupplierContract[];
    const search = params?.search?.toLowerCase() || '';
    const page = params?.page || 0;
    const pageSize = params?.pageSize || 10;

    let filtered = items;
    if (search) {
      filtered = items.filter(
        (c) =>
          c.title.toLowerCase().includes(search) ||
          c.contractNo.toLowerCase().includes(search) ||
          (c.supplier_name?.toLowerCase().includes(search) ?? false)
      );
    }

    const total = filtered.length;
    const data = filtered.slice(page * pageSize, (page + 1) * pageSize);
    return { data: data as unknown as Record<string, unknown>[], total };
  },
  create: async (data) => {
    const response = await srmApi.createContract(
      data as unknown as Parameters<typeof srmApi.createContract>[0]
    );
    if (!response.success || !response.data) throw new Error('创建合同失败');
    return response.data as unknown as Record<string, unknown>;
  },
  update: async (id, data) => {
    const response = await srmApi.updateContract(
      id,
      data as unknown as Parameters<typeof srmApi.updateContract>[1]
    );
    if (!response.success || !response.data) throw new Error('更新合同失败');
    return response.data as unknown as Record<string, unknown>;
  },
  delete: async (id) => {
    const response = await srmApi.deleteContract(id);
    if (!response.success) throw new Error('删除合同失败');
  },
};

const ContractStats: React.FC = () => {
  const { data: contracts = [] } = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.SRM_CONTRACTS_STATS_BASE,
    queryFn: async () => {
      const response = await srmApi.listContracts();
      if (response.success && response.data) {
        return response.data as SupplierContract[];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const stats = React.useMemo(
    () => ({
      total: contracts.length,
      active: contracts.filter((c) => c.status === 'active').length,
      completed: contracts.filter((c) => c.status === 'completed').length,
      totalAmount: contracts.reduce((sum, c) => sum + (c.total_amount || 0), 0),
    }),
    [contracts]
  );

  const statCards = [
    {
      label: '合同总数',
      value: stats.total,
      color: ct.purple[500],
      bgColor: 'secondary.light',
      icon: <FileText sx={{ width: 20, height: 20 }} />,
    },
    {
      label: '执行中',
      value: stats.active,
      color: 'primary.dark',
      bgColor: 'primary.lighter',
      icon: <Clock sx={{ width: 20, height: 20 }} />,
    },
    {
      label: '已完成',
      value: stats.completed,
      color: 'success.dark',
      bgColor: 'success.lighter',
      icon: <CheckCircle sx={{ width: 20, height: 20 }} />,
    },
    {
      label: '合同总额',
      value: `¥${stats.totalAmount.toLocaleString()}`,
      color: 'warning.dark',
      bgColor: 'warning.lighter',
      icon: <FileText sx={{ width: 20, height: 20 }} />,
    },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(4, 1fr)' },
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

const SrmContractPage: React.FC = () => {
  const navigate = useNavigate();

  const customRowActions: RowAction[] = [
    {
      label: '查看详情',
      icon: <Eye size={16} />,
      onClick: (row: Record<string, unknown>) => {
        const id = row.id as string;
        if (id) {
          navigate(SRM_PATHS.contractDetail.replace(':id', id));
        }
      },
    },
  ];

  return (
    <CrudPage
      schema={contractSchema}
      apiAdapter={contractApiAdapter}
      breadcrumbs={[{ label: 'SRM' }, { label: '合同管理' }]}
      headerContent={<ContractStats />}
      customRowActions={customRowActions}
    />
  );
};

export default SrmContractPage;
