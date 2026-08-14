import React, { Suspense, lazy } from 'react';
import type { ChartData } from '../charts/AreaChart';
import { designTokens, semanticTokens } from '@topems/tokens';
import i18n from '@/i18n';

export interface StatsChartProps {
  type: 'bar' | 'pie' | 'line';
  title?: string;
  data: ChartData[];
  xKey?: string;
  yKey?: string;
  yKeys?: string[];
  colorKey?: string;
  colors?: string[];
  dataKey?: string;
  nameKey?: string;
  height?: number;
}

const StatsChartBarImpl = lazy(() => import('./StatsChart.bar').then(m => ({ default: m.StatsChartBarImpl })));
const StatsChartPieImpl = lazy(() => import('./StatsChart.pie').then(m => ({ default: m.StatsChartPieImpl })));

const EmptyFallback: React.FC<{ title?: string }> = ({ title }) => (
  <div
    style={{
      backgroundColor: 'common.white',
      borderRadius: 'lg',
      boxShadow: designTokens.shadows.sm,
      padding: 6,
    }}
  >
    <h3
      style={{
        fontSize: '18px',
        fontWeight: 600,
        color: 'grey.900',
        marginBottom: 4,
      }}
    >
      {title}
    </h3>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '160px',
        color: 'grey.400',
      }}
    >
      <p>{i18n.t('shared.stats_chart.impl.k0')}</p>
    </div>
  </div>
);

/**
 * 按 type 懒加载对应的图表实现（V72 P2-4b）
 *
 * - 'bar' | 'line' → 加载 StatsChart.bar（只依赖 recharts-cartesian barrel）
 * - 'pie'          → 加载 StatsChart.pie（只依赖 recharts-polar barrel）
 *
 * 这样当用户只访问某一种图表时，不会把另一个 barrel 的实现拉到 chunk 里，
 * 从而把 recharts 299KB 的单 chunk 拆成 ~200KB(Cartesian) + ~120KB(Polar) 两部分。
 */
export const StatsChartImpl: React.FC<StatsChartProps> = (props) => {
  const { type, title, data } = props;

  if (!data || data.length === 0) {
    return <EmptyFallback title={title} />;
  }

  return (
    <Suspense fallback={<EmptyFallback title={title} />}>
      {type === 'pie' ? (
        <StatsChartPieImpl {...props} />
      ) : (
        <StatsChartBarImpl {...props} type={type as 'bar' | 'line'} />
      )}
    </Suspense>
  );
};

export default StatsChartImpl;
