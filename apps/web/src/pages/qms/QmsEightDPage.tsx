/**
 * 8D 问题解决页面 — Schema 驱动版 PoC
 *
 * 使用 CrudPage + WizardBuilder + SubTableBuilder + TreeBuilder 实现：
 * - 列表页：CrudPage 自动生成（支持搜索、筛选、分页）
 * - 创建/编辑：8 步向导（D1→D8）
 *   - D1 团队成员：SubTableBuilder 子表
 *   - D4 根因分析：TreeBuilder 自定义渲染（RootCauseStepContent）
 *   - D3/D5：SubTableBuilder 子表
 * - 详情：FormBuilder view 模式
 *
 * 参考：apps/web/src/pages/erp/VoucherPage.tsx
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography, Card, CardContent, Button, Paper } from '@mui/material';
import { FileText, CheckCircle, AlertCircle, Clock, Plus, Trash2 } from 'lucide-react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { TreeBuilder, type TreeNode } from '@/components/templates/TreeBuilder';
import { eightDSchema, injectRootCauseRenderer } from '@/schemas/qms/eightD';
import { eightDApi } from '@/api/qms';
import type { EntitySchema } from '@/schema';
import type {
  SchemaExtensions,
  WizardStepRenderProps,
  TreeConfig,
} from '@/schema/schemaExtensions';
import i18n from '@/i18n';
import type { SchemaField } from '@/schema/types';


import { QUERY_KEYS } from '@/lib/reactQuery';

// ============ 统计卡片 ============

interface EightDStatsData {
  total: number;
  open: number;
  inProgress: number;
  completed: number;
  closed: number;
}

function EightDStats() {
  const { data: stats, isPending} = useQuery<EightDStatsData>({
    queryKey: QUERY_KEYS.AD_HOC.QMS_EIGHTD_STATS_BASE,
    queryFn: async () => {
      const response = await eightDApi.listEightDReports();
      if (!response.success) throw new Error(i18n.t('pages.qms_eight_d_page.8d_0'));
      const reports = response.data || [];
      return {
        total: reports.length,
        open: reports.filter((r) => r.status === 'open' || r.status === i18n.t('pages.qms_eight_d_page.k1')).length,
        inProgress: reports.filter((r) => r.status === 'in_progress' || r.status === i18n.t('pages.qms_eight_d_page.k2'))
          .length,
        completed: reports.filter((r) => r.status === 'completed' || r.status === i18n.t('pages.qms_eight_d_page.k3')).length,
        closed: reports.filter((r) => r.status === 'closed' || r.status === i18n.t('pages.qms_eight_d_page.k4')).length,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const cards = [
    { label: i18n.t('pages.qms_eight_d_page.k5'), value: stats?.total ?? 0, icon: FileText, color: 'primary.main' },
    { label: i18n.t('pages.qms_eight_d_page.k6'), value: stats?.open ?? 0, icon: AlertCircle, color: 'error.main' },
    { label: i18n.t('pages.qms_eight_d_page.k7'), value: stats?.inProgress ?? 0, icon: Clock, color: 'warning.main' },
    { label: i18n.t('pages.qms_eight_d_page.k8'), value: stats?.completed ?? 0, icon: CheckCircle, color: 'success.main' },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
      }}
    >
      {cards.map((card) => (
        <Card
          key={card.label}
          variant='outlined'
        >
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ color: card.color }}>
              <card.icon size={24} />
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

// ============ D4 根因分析自定义渲染 ============

const rootCausesFields: SchemaField[] = [
  { name: 'cause', label: i18n.t('pages.qms_eight_d_page.k9'), type: 'text' },
  { name: 'category', label: i18n.t('pages.qms_eight_d_page.k10'), type: 'select' },
  { name: 'level', label: i18n.t('pages.qms_eight_d_page.k11'), type: 'select' },
  { name: 'is_root', label: i18n.t('pages.qms_eight_d_page.k12'), type: 'switch' },
  { name: 'analysis_method', label: i18n.t('pages.qms_eight_d_page.k13'), type: 'select' },
];

const rootCauseTreeConfig: TreeConfig = {
  keyField: 'id',
  labelField: 'label',
  childrenField: 'children',
  expandable: true,
  defaultExpandAll: true,
  showLine: true,
};

const RootCauseStepContent: React.FC<WizardStepRenderProps> = ({
  values,
  onChange,
  mode,
  disabled,
}) => {
  const nodes = (values.root_cause_tree as TreeNode[]) || [];

  const handleAddRoot = () => {
    const newNode: TreeNode = {
      id: `cause-${Date.now()}`,
      label: i18n.t('pages.qms_eight_d_page.k14'),
      children: [],
      data: { cause: '', category: 'man', level: 1, is_root: false, analysis_method: '5why' },
    };
    onChange('root_cause_tree', [...nodes, newNode]);
  };

  return (
    <Box>
      <Typography
        variant='body2'
        color='text.secondary'
        sx={{ mb: 2 }}
      >
        {i18n.t('pages.qms_eight_d_page.k0')}
      </Typography>
      <TreeBuilder
        config={rootCauseTreeConfig}
        data={nodes}
        fields={rootCausesFields}
        mode={mode === 'view' ? 'view' : 'edit'}
        loading={false}
        onNodeAdd={async () => {}}
        onNodeUpdate={async () => {}}
        onNodeDelete={async () => {}}
      />
      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
        <Button
          size='small'
          variant='outlined'
          startIcon={<Plus size={14} />}
          onClick={handleAddRoot}
          disabled={disabled}
        >
          {i18n.t('pages.qms_eight_d_page.k1')}
        </Button>
        <Button
          size='small'
          variant='text'
          onClick={() => onChange('root_cause_tree', [])}
          disabled={disabled || nodes.length === 0}
          color='error'
          startIcon={<Trash2 size={14} />}
        >
          {i18n.t('pages.qms_eight_d_page.k2')}
        </Button>
      </Box>
      {!disabled && nodes.length === 0 && (
        <Paper
          variant='outlined'
          sx={{
            p: 4,
            mt: 2,
            textAlign: 'center',
            color: 'text.secondary',
          }}
        >
          <Typography variant='body2'>暂无根因分析数据，点击上方"{i18n.t('pages.qms_eight_d_page.k15')}"{i18n.t('ai.document_analysis.button.start_analysis')}</Typography>
        </Paper>
      )}
    </Box>
  );
};

// 注入 D4 自定义渲染
injectRootCauseRenderer((props) => <RootCauseStepContent {...props} />);

// ============ API 适配器（为 CrudPage 包装 eightDApi）============

const eightDAdapter: CrudApiAdapter = {
  list: async (params) => {
    const response = await eightDApi.listEightDReports();
    if (!response.success) throw new Error(response.message || i18n.t('pages.qms_eight_d_page.8d_16'));
    const items = response.data || [];

    const search = params?.search as string | undefined;
    let filtered = items;
    if (search) {
      const lower = search.toLowerCase();
      filtered = items.filter(
        (r) =>
          r.title?.toLowerCase().includes(lower) ||
          r.reportNo?.toLowerCase().includes(lower) ||
          r.productName?.toLowerCase().includes(lower)
      );
    }

    const filterParams = params as Record<string, string | undefined>;
    if (filterParams.status && filterParams.status !== 'all') {
      filtered = filtered.filter((r) => r.status === filterParams.status);
    }
    if (filterParams.severity && filterParams.severity !== 'all') {
      filtered = filtered.filter((r) => r.severity === filterParams.severity);
    }

    const page = Number(params?.page) || 1;
    const pageSize = Number(params?.pageSize) || 10;
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    return { data: paged as unknown as Record<string, unknown>[], total };
  },

  create: async (data) => {
    const payload = data as unknown as Parameters<typeof eightDApi.createEightDReport>[0];
    const response = await eightDApi.createEightDReport(payload);
    if (!response.success) throw new Error(response.message || i18n.t('pages.qms_eight_d_page.8d_17'));
    return (response.data ?? {}) as Record<string, unknown>;
  },

  update: async (id, data) => {
    const payload = data as Parameters<typeof eightDApi.updateEightDReport>[1];
    const response = await eightDApi.updateEightDReport(id, payload);
    if (!response.success) throw new Error(response.message || i18n.t('pages.qms_eight_d_page.8d_18'));
    return (response.data ?? {}) as Record<string, unknown>;
  },

  delete: async (id) => {
    const response = await eightDApi.deleteEightDReport(id);
    if (!response.success) throw new Error(response.message || i18n.t('pages.qms_eight_d_page.8d_19'));
  },
};

// ============ 页面组件 ============

export default function QmsEightDPage() {
  const schema = eightDSchema as EntitySchema & SchemaExtensions;

  return (
    <CrudPage
      schema={schema}
      apiAdapter={eightDAdapter}
      breadcrumbs={[{ label: i18n.t('pages.qms_eight_d_page.k20') }, { label: i18n.t('pages.qms_eight_d_page.8d_5') }]}
      headerContent={<EightDStats />}
      idField='id'
    />
  );
}
