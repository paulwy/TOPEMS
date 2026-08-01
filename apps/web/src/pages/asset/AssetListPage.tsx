import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Grid,
  Divider,
  Avatar,
} from '@mui/material';
import {
  Package,
  CheckCircle,
  AlertTriangle,
  Wrench,
  Clock,
  Archive,
  MapPin,
  Tag,
  Calendar,
  User,
  Building,
  DollarSign,
  FileText,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import CrudPage from '@/components/templates/CrudPage';
import type { CrudTab } from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { assetSchema } from '@/schemas/erp/asset';
import { assetApi } from '@/api/erp/finance/asset';
import type { Asset } from '@/api/erp/types';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { useNotificationStore } from '@/store';
import { QUERY_KEYS } from '@/lib/reactQuery';

// 本地扩展类型：后端返回的部分字段名与 Asset 类型定义不一致，这里补充以便前端字段访问通过类型检查
type AssetRow = Asset & {
  asset_code?: string;
  specification?: string;
  department_name?: string;
  responsible_person?: string;
  purchase_price?: number | string;
  description?: string;
};

const ct = designTokens.colors;

const baseAdapter = createCrudPageAdapter<Asset>({
  list: assetApi.list,
  create: assetApi.create,
  update: assetApi.update,
  delete: assetApi.delete,
});

const statusColorMap: Record<string, { bg: string; color: string }> = {
  active: { bg: 'success.lighter', color: 'success.dark' },
  idle: { bg: 'info.lighter', color: 'info.dark' },
  in_use: { bg: 'primary.lighter', color: 'primary.dark' },
  maintenance: { bg: 'warning.lighter', color: 'warning.dark' },
  retired: { bg: 'grey.100', color: 'text.secondary' },
  disposed: { bg: 'error.lighter', color: 'error.dark' },
};

const statusLabelMap: Record<string, string> = {
  active: '在用',
  idle: '闲置',
  in_use: '使用中',
  maintenance: '维修中',
  retired: '已报废',
  disposed: '已处置',
};

function extractListData(response: unknown): AssetRow[] {
  if (!response || typeof response !== 'object') return [];
  const obj = response as Record<string, unknown>;
  const data = obj.data;
  if (!data) return [];
  if (Array.isArray(data)) return data as unknown as AssetRow[];
  if (typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.items)) return d.items as unknown as AssetRow[];
    if (Array.isArray(d.data)) return d.data as unknown as AssetRow[];
  }
  return [];
}

const formatCurrency = (value: number | string | undefined | null): string => {
  if (value === undefined || value === null || value === '') return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '-';
  return `¥${num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const AssetListPage: React.FC = () => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [activeTab, setActiveTab] = useState('list');

  const { data: assetsResp } = useQuery({
    queryKey: QUERY_KEYS.ERP.ASSETS,
    queryFn: async () => assetApi.list(),
    staleTime: 5 * 60 * 1000,
  });

  const assets = extractListData(assetsResp);

  const stats = useMemo(() => {
    return {
      total: assets.length,
      active: assets.filter((a) => a.status === 'active' || a.status === 'in_use').length,
      maintenance: assets.filter((a) => a.status === 'maintenance').length,
      idle: assets.filter((a) => a.status === 'idle').length,
      totalValue: assets.reduce((sum, a) => {
        const val = typeof a.purchase_price === 'string' ? parseFloat(a.purchase_price) : (a.purchase_price || 0);
        return sum + (val || 0);
      }, 0),
    };
  }, [assets]);

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      assetApi.update(id, { status } as Partial<Asset>),
    onSuccess: () => {
      addNotification({ title: '成功', message: '资产状态已更新', type: 'success' });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ERP.ASSETS });
    },
    onError: () => {
      addNotification({ title: '错误', message: '状态更新失败', type: 'error' });
    },
  });

  const customRowActions = [
    {
      label: '投入使用',
      icon: <CheckCircle size={16} />,
      color: 'success' as const,
      onClick: (row: Record<string, unknown>) => {
        const asset = row as unknown as AssetRow;
        updateStatusMutation.mutate({ id: asset.id, status: 'in_use' });
      },
      show: (row: Record<string, unknown>) => {
        const asset = row as unknown as AssetRow;
        return asset.status === 'idle';
      },
    },
    {
      label: '送修',
      icon: <Wrench size={16} />,
      color: 'warning' as const,
      onClick: (row: Record<string, unknown>) => {
        const asset = row as unknown as AssetRow;
        updateStatusMutation.mutate({ id: asset.id, status: 'maintenance' });
      },
      show: (row: Record<string, unknown>) => {
        const asset = row as unknown as AssetRow;
        return asset.status === 'in_use' || asset.status === 'active';
      },
    },
    {
      label: '报废',
      icon: <Archive size={16} />,
      color: 'error' as const,
      onClick: (row: Record<string, unknown>) => {
        const asset = row as unknown as AssetRow;
        updateStatusMutation.mutate({ id: asset.id, status: 'retired' });
      },
      show: (row: Record<string, unknown>) => {
        const asset = row as unknown as AssetRow;
        return asset.status !== 'retired' && asset.status !== 'disposed';
      },
      divider: true,
    },
  ];

  const headerContent = () => (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'primary.lighter',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Package sx={{ width: 20, height: 20, color: 'primary.dark' }} />
            </Box>
            <Box>
              <Typography variant='body2' sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                资产总数
              </Typography>
              <Typography variant='h5' sx={{ fontWeight: 700 }}>
                {stats.total}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'success.lighter',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle sx={{ width: 20, height: 20, color: 'success.dark' }} />
            </Box>
            <Box>
              <Typography variant='body2' sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                在用
              </Typography>
              <Typography variant='h5' sx={{ fontWeight: 700, color: 'success.main' }}>
                {stats.active}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'warning.lighter',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Wrench sx={{ width: 20, height: 20, color: 'warning.dark' }} />
            </Box>
            <Box>
              <Typography variant='body2' sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                维修中
              </Typography>
              <Typography variant='h5' sx={{ fontWeight: 700, color: 'warning.main' }}>
                {stats.maintenance}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'secondary.lighter',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <DollarSign sx={{ width: 20, height: 20, color: 'secondary.dark' }} />
            </Box>
            <Box>
              <Typography variant='body2' sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                资产总值
              </Typography>
              <Typography variant='h6' sx={{ fontWeight: 700, color: 'secondary.main' }}>
                {formatCurrency(stats.totalValue)}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  const detailContent = (row: Record<string, unknown>) => {
    const asset = row as unknown as AssetRow;
    const statusColors = statusColorMap[asset.status] || {
      bg: 'grey.100',
      color: 'text.secondary',
    };
    const statusLabel = statusLabelMap[asset.status] || asset.status;

    return (
      <Box sx={{ pt: 2 }}>
        <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
          <Avatar
            sx={{
              width: 64,
              height: 64,
              bgcolor: 'primary.lighter',
              color: 'primary.dark',
            }}
          >
            <Package size={32} />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant='h6' sx={{ fontWeight: 600, mb: 0.5 }}>
              {asset.name}
            </Typography>
            <Typography variant='body2' sx={{ color: 'text.secondary', mb: 1 }}>
              {asset.asset_code}
            </Typography>
            <Chip
              label={statusLabel}
              size='small'
              sx={{
                backgroundColor: statusColors.bg,
                color: statusColors.color,
                fontWeight: 500,
              }}
            />
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <Tag size={16} style={{ marginTop: 2, color: 'var(--mui-palette-text-secondary)' }} />
              <Box>
                <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block' }}>
                  资产编号
                </Typography>
                <Typography variant='body2'>{asset.asset_code || '-'}</Typography>
              </Box>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <FileText size={16} style={{ marginTop: 2, color: 'var(--mui-palette-text-secondary)' }} />
              <Box>
                <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block' }}>
                  规格型号
                </Typography>
                <Typography variant='body2'>{asset.specification || '-'}</Typography>
              </Box>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <MapPin size={16} style={{ marginTop: 2, color: 'var(--mui-palette-text-secondary)' }} />
              <Box>
                <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block' }}>
                  存放位置
                </Typography>
                <Typography variant='body2'>{asset.location || '-'}</Typography>
              </Box>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <Building size={16} style={{ marginTop: 2, color: 'var(--mui-palette-text-secondary)' }} />
              <Box>
                <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block' }}>
                  所属部门
                </Typography>
                <Typography variant='body2'>{asset.department_name || '-'}</Typography>
              </Box>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <User size={16} style={{ marginTop: 2, color: 'var(--mui-palette-text-secondary)' }} />
              <Box>
                <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block' }}>
                  负责人
                </Typography>
                <Typography variant='body2'>{asset.responsible_person || '-'}</Typography>
              </Box>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <DollarSign size={16} style={{ marginTop: 2, color: 'var(--mui-palette-text-secondary)' }} />
              <Box>
                <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block' }}>
                  购置价格
                </Typography>
                <Typography variant='body2'>{formatCurrency(asset.purchase_price)}</Typography>
              </Box>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <Calendar size={16} style={{ marginTop: 2, color: 'var(--mui-palette-text-secondary)' }} />
              <Box>
                <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block' }}>
                  购置日期
                </Typography>
                <Typography variant='body2'>
                  {asset.purchase_date
                    ? new Date(asset.purchase_date).toLocaleDateString('zh-CN')
                    : '-'}
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <Clock size={16} style={{ marginTop: 2, color: 'var(--mui-palette-text-secondary)' }} />
              <Box>
                <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block' }}>
                  创建时间
                </Typography>
                <Typography variant='body2'>
                  {asset.created_at
                    ? new Date(asset.created_at).toLocaleDateString('zh-CN')
                    : '-'}
                </Typography>
              </Box>
            </Box>
          </Grid>
          {asset.description && (
            <Grid size={{ xs: 12 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <FileText size={16} style={{ marginTop: 2, color: 'var(--mui-palette-text-secondary)' }} />
                <Box>
                  <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block' }}>
                    描述
                  </Typography>
                  <Typography variant='body2'>{asset.description}</Typography>
                </Box>
              </Box>
            </Grid>
          )}
        </Grid>
      </Box>
    );
  };

  const tabs: CrudTab[] = [
    {
      id: 'list',
      label: '资产列表',
      content: null,
    },
  ];

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Package style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.success.main} 0%, ${ct.success.dark} 100%)`,
      }}
      maxWidth='xl'
    >
      <CrudPage
        schema={assetSchema}
        apiAdapter={baseAdapter}
        breadcrumbs={[{ label: '资产管理' }, { label: '资产列表' }]}
        headerContent={headerContent}
        detailContent={detailContent}
        detailMaxWidth='lg'
        customRowActions={customRowActions}
        tabs={tabs}
        defaultTab='list'
      />
    </PageContainer>
  );
};

export default AssetListPage;
