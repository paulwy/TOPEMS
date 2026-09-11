/**
 * 物料短缺帕累托分析页
 *
 * 使用 recharts ComposedChart（Bar + Line）展示物料短缺帕累托图：
 * - 柱状图：短缺数量（降序）
 * - 折线图：累积占比（80/20 分析基准线）
 * 数据来自 APS 后端列表 API，筛选短缺物料并进行帕累托分析。
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Box, Paper, Typography, Chip, CircularProgress } from '@mui/material';
import { Package, AlertCircle, Boxes } from 'lucide-react';
import { apsApi } from '@/api/aps';
import type { MaterialPlan } from '@/api/aps/types';
import { StatsPageTemplate } from '@/components/templates';
import type { StatCard, DataTable, TableColumn } from '@/components/templates/StatsPageTemplate';
import { designTokens } from '@topems/tokens';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';

interface ShortageParetoItem {
  material: string;
  shortage: number;
  cumulativePct: number;
}

export default function MaterialShortagePage() {
  const { t } = useTranslation();

  const { data: apiData, isLoading } = useQuery({
    queryKey: ['aps', 'materialPlans'],
    queryFn: async () => {
      const res = await apsApi.listMaterialPlans();
      const items =
        res?.data?.items ?? (Array.isArray(res?.data) ? (res.data as MaterialPlan[]) : []);
      return items;
    },
  });

  const paretoData = useMemo<ShortageParetoItem[]>(() => {
    const plans = apiData ?? [];
    if (plans.length === 0) return [];

    // 筛选出有短缺的物料，并按物料名称聚合短缺数量
    const materialMap = new Map<string, number>();
    plans.forEach((plan) => {
      const shortfall = plan.shortfall_quantity ?? 0;
      if (shortfall <= 0) return;
      const materialName = plan.material_name ?? plan.material_code ?? 'Unknown Material';
      materialMap.set(materialName, (materialMap.get(materialName) ?? 0) + shortfall);
    });

    // 转换为数组并按短缺数量降序排序
    const list = Array.from(materialMap.entries())
      .map(([material, shortage]) => ({ material, shortage }))
      .sort((a, b) => b.shortage - a.shortage);

    // 计算累积占比（帕累托分析）
    const total = list.reduce((s, c) => s + c.shortage, 0) || 1;
    let acc = 0;
    return list.map((c) => {
      acc += c.shortage;
      return {
        material: c.material,
        shortage: c.shortage,
        cumulativePct: Number(((acc / total) * 100).toFixed(1)),
      };
    });
  }, [apiData]);

  const vitalFew = useMemo(() => {
    const vital = paretoData.filter((d) => d.cumulativePct <= 80);
    return vital.length === 0 ? paretoData.slice(0, 2) : vital;
  }, [paretoData]);

  const totalShortage = useMemo(() => paretoData.reduce((s, d) => s + d.shortage, 0), [paretoData]);

  const statCards: StatCard[] = [
    {
      id: 'materialCount',
      title: t('pages.material_shortage_page.k7'),
      value: paretoData.length,
      icon: <Boxes size={24} />,
      color: 'info',
    },
    {
      id: 'totalShortage',
      title: t('pages.material_shortage_page.k8'),
      value: totalShortage.toLocaleString(),
      icon: <AlertCircle size={24} />,
      color: 'error',
    },
    {
      id: 'vitalFew',
      title: t('pages.material_shortage_page.k9'),
      value: vitalFew.map((v) => v.material).join('、') || '-',
      icon: <Package size={24} />,
      color: 'warning',
    },
  ];

  const columns: TableColumn[] = [
    { id: 'material', label: t('pages.material_shortage_page.k15'), field: 'material' },
    { id: 'shortage', label: t('pages.material_shortage_page.k16'), field: 'shortage' },
    {
      id: 'cumulativePct',
      label: t('pages.material_shortage_page.k17'),
      field: 'cumulativePct',
      render: (value) => `${value}%`,
    },
    {
      id: 'status',
      label: t('pages.material_shortage_page.k18'),
      field: 'cumulativePct',
      render: (value) => {
        const pct = Number(value);
        return (
          <Chip
            size='small'
            label={
              pct <= 80
                ? t('pages.material_shortage_page.k4')
                : t('pages.material_shortage_page.k5')
            }
            color={pct <= 80 ? 'error' : 'default'}
          />
        );
      },
    },
  ];

  const tables: DataTable[] = [
    {
      id: 'shortageTable',
      title: t('pages.material_shortage_page.k14'),
      columns,
      data: paretoData.map((d) => ({ ...d })) as Record<string, unknown>[],
    },
  ];

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '60vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <StatsPageTemplate
      title={t('pages.material_shortage_page.k6')}
      subtitle={t('pages.material_shortage_page.k2')}
      statCards={statCards}
      showStatCards={statCards.length > 0}
      tables={tables}
      showTables={tables.length > 0}
      showSearch={false}
      showTimeRange={false}
      showExport={false}
      showRefresh={false}
      showCharts={false}
    >
      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Typography
          variant='subtitle1'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {t('aps.analytics.materialShortage.k1')}
        </Typography>
        <Box sx={{ width: '100%', height: 360 }}>
          <ResponsiveContainer
            width='100%'
            height={360}
          >
            <ComposedChart
              data={paretoData}
              margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis
                dataKey='material'
                fontSize={11}
                angle={-15}
                textAnchor='end'
                height={60}
              />
              <YAxis
                yAxisId='left'
                fontSize={11}
                label={{
                  value: t('pages.material_shortage_page.k10'),
                  angle: -90,
                  position: 'insideLeft',
                }}
              />
              <YAxis
                yAxisId='right'
                orientation='right'
                domain={[0, 100]}
                unit='%'
                fontSize={11}
                label={{
                  value: t('pages.material_shortage_page.k11'),
                  angle: 90,
                  position: 'insideRight',
                }}
              />
              <Tooltip />
              <Legend />
              <ReferenceLine
                yAxisId='right'
                y={80}
                stroke={designTokens.colors.error.main}
                strokeDasharray='4 4'
                label={t('pages.material_shortage_page.80_3')}
              />
              <Bar
                yAxisId='left'
                dataKey='shortage'
                name={t('pages.material_shortage_page.k12')}
                fill={designTokens.colors.secondary.dark}
                barSize={36}
              />
              <Line
                yAxisId='right'
                type='monotone'
                dataKey='cumulativePct'
                name={t('pages.material_shortage_page.k13')}
                stroke={designTokens.colors.error.main}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
    </StatsPageTemplate>
  );
}
