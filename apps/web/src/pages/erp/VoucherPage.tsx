/**
 * 凭证管理（Schema 驱动版）— Phase 3 PoC + 适配层样板
 *
 * 使用 CrudPage + WizardBuilder + SubTableBuilder 实现：
 * - 列表页：CrudPage 自动生成
 * - 创建/编辑：3 步向导（基本信息 → 明细 → 确认）
 * - 凭证明细：SubTableBuilder 内嵌子表
 *
 * 本页已使用 `createCrudPageAdapter` 帮助函数，
 * 将原本 30 行的 adapter 样板代码压缩为 1 行。
 */

import { useQuery } from '@tanstack/react-query';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { FileText } from 'lucide-react';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { voucherSchema } from '@/schemas/erp/voucher';
import { voucherApi } from '@/api/erp';
import type { EntitySchema } from '@/schema';
import type { SchemaExtensions } from '@/schema/schemaExtensions';


import { QUERY_KEYS } from '@/lib/reactQuery';

// ============ 统计卡片 ============

interface VoucherStatsData {
  total: number;
  draft: number;
  submitted: number;
  approved: number;
  posted: number;
}

function VoucherStats() {
  const { data: stats, isPending} = useQuery<VoucherStatsData>({
    queryKey: QUERY_KEYS.AD_HOC.ERP_VOUCHER_STATS_BASE,
    queryFn: async () => {
      const response = await voucherApi.list({ page: 1, pagesize: 100 });
      if (!response.success) throw new Error('加载凭证统计失败');
      const items = response.data?.items || [];
      return {
        total: response.data?.total ?? items.length,
        draft: items.filter((v) => v.status === 'draft').length,
        submitted: items.filter((v) => v.status === 'submitted').length,
        approved: items.filter((v) => v.status === 'approved').length,
        posted: items.filter((v) => v.status === 'posted').length,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const cards = [
    { label: '凭证总数', value: stats?.total ?? 0, iconColor: 'primary.main' },
    { label: '草稿', value: stats?.draft ?? 0, iconColor: 'grey.500' },
    { label: '待审核', value: stats?.submitted ?? 0, iconColor: 'warning.main' },
    { label: '已审核', value: stats?.approved ?? 0, iconColor: 'info.main' },
    { label: '已过账', value: stats?.posted ?? 0, iconColor: 'success.main' },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
        gap: 2,
      }}
    >
      {cards.map((card) => (
        <Card
          key={card.label}
          variant='outlined'
        >
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ color: card.iconColor }}>
              <FileText size={24} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {card.label}
              </Typography>
              <Typography variant='h6'>{isPending ? '...' : card.value}</Typography>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

// ============ API 适配器（一行搞定）============

const voucherAdapter = createCrudPageAdapter(voucherApi);

// ============ 页面组件 ============

export default function VoucherPage() {
  const schema = voucherSchema as EntitySchema & SchemaExtensions;
  return (
    <CrudPage
      schema={schema}
      apiAdapter={voucherAdapter}
      breadcrumbs={[{ label: 'ERP' }, { label: '财务管理' }, { label: '凭证管理' }]}
      headerContent={<VoucherStats />}
    />
  );
}
