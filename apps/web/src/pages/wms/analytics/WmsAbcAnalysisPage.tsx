import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import i18n from '@/i18n';
import { designTokens } from '@topems/tokens';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { getAbcAnalysis, type AbcAnalysisData } from '@/api/wms/analytics';

const ABC_COLORS: Record<string, string> = {
  A: designTokens.colors.error.main,
  B: designTokens.colors.warning.main,
  C: designTokens.colors.success.dark,
};

export default function WmsAbcAnalysisPage() {
  const { t } = useTranslation();
  const { data: response, loading } = useAnalyticsData({
    fetcher: () => getAbcAnalysis(),
    deps: [],
  });

  const abc = useMemo(() => {
    return (response?.data ?? []).map((item: AbcAnalysisData) => ({
      category: item.category,
      count: item.material_count,
      amount: item.total_value,
      value_percentage: item.value_percentage,
      count_percentage: item.count_percentage,
    }));
  }, [response]);

  const totalAmount = useMemo(() => abc.reduce((s, c) => s + c.amount, 0), [abc]);
  const totalCount = useMemo(() => abc.reduce((s, c) => s + c.count, 0), [abc]);

  const statCards = useMemo(
    () => [
      {
        id: 'abc-a',
        title: i18n.t('wms:wms_abc_analysis_page.a70_4'),
        value: abc.find((x) => x.category === 'A')?.count ?? 0,
        suffix: 'SKU',
        color: 'error' as const,
      },
      {
        id: 'abc-b',
        title: i18n.t('wms:wms_abc_analysis_page.b20_3'),
        value: abc.find((x) => x.category === 'B')?.count ?? 0,
        suffix: 'SKU',
        color: 'warning' as const,
      },
      {
        id: 'abc-c',
        title: i18n.t('wms:wms_abc_analysis_page.c10_2'),
        value: abc.find((x) => x.category === 'C')?.count ?? 0,
        suffix: 'SKU',
        color: 'success' as const,
      },
      {
        id: 'total-value',
        title: t('wms.abc_analysis.stat_total_value'),
        value: `¥${totalAmount.toLocaleString()}`,
        color: 'info' as const,
      },
    ],
    [abc, totalAmount, t]
  );

  return (
    <StatsPageTemplate
      title={i18n.t('wms:wms_abc_analysis_page.abc702010_5')}
      statCards={statCards}
      showSearch={false}
      showTimeRange={false}
      showExport={false}
      showRefresh={false}
      showCharts={false}
      showTables={false}
      loading={loading}
    >
      <div className='space-y-4'>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <div className='rounded-lg border p-4'>
            <h3 className='mb-2 font-semibold'>{i18n.t('pages.wms_abc_analysis_page.k0')}</h3>
            <ResponsiveContainer
              width='100%'
              height={340}
            >
              <PieChart>
                <Pie
                  data={abc}
                  dataKey='amount'
                  nameKey='category'
                  cx='50%'
                  cy='50%'
                  outerRadius={110}
                  innerRadius={50}
                  label={(d: { category?: string; percent?: number } | undefined) =>
                    `${d?.category} ${i18n.t('pages.wms_abc_analysis_page.k0')} ${((d?.percent ?? 0) * 100).toFixed(0)}%`
                  }
                >
                  {abc.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={ABC_COLORS[entry.category] ?? 'colors.grey.500'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: unknown) => [
                    `¥${Number(v).toLocaleString()} (${
                      totalAmount ? ((Number(v) / totalAmount) * 100).toFixed(1) : 0
                    }%)`,
                    i18n.t('pages.wms_abc_analysis_page.k1'),
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className='rounded-lg border p-4'>
            <h3 className='mb-2 font-semibold'>{i18n.t('pages.wms_abc_analysis_page.sku_2')}</h3>
            <ResponsiveContainer
              width='100%'
              height={340}
            >
              <BarChart data={abc}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis
                  dataKey='category'
                  fontSize={12}
                />
                <YAxis fontSize={11} />
                <Tooltip
                  formatter={(v: unknown) => [
                    `${v} (${totalCount ? ((Number(v) / totalCount) * 100).toFixed(1) : 0}%)`,
                    i18n.t('pages.wms_abc_analysis_page.sku_1'),
                  ]}
                />
                <Bar
                  dataKey='count'
                  name={i18n.t('pages.wms_abc_analysis_page.sku_2')}
                  radius={[6, 6, 0, 0]}
                  fill={designTokens.colors.primary.main}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className='rounded-lg border p-4'>
          <h3 className='mb-2 font-semibold'>{t('wms.abc_analysis.section_detail')}</h3>
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-3 py-2 text-left font-medium'>{t('wms.abc_analysis.col_category')}</th>
                  <th className='px-3 py-2 text-right font-medium'>{t('wms.abc_analysis.col_sku_count')}</th>
                  <th className='px-3 py-2 text-right font-medium'>{t('wms.abc_analysis.col_count_pct')}</th>
                  <th className='px-3 py-2 text-right font-medium'>{t('wms.abc_analysis.col_inventory_value')}</th>
                  <th className='px-3 py-2 text-right font-medium'>{t('wms.abc_analysis.col_value_pct')}</th>
                </tr>
              </thead>
              <tbody>
                {abc.map((item, i) => (
                  <tr
                    key={item.category}
                    className={i % 2 ? 'bg-gray-50' : ''}
                  >
                    <td
                      className='px-3 py-2 font-semibold'
                      style={{ color: ABC_COLORS[item.category] }}
                    >
                      {t('wms.abc_analysis.category_label', { category: item.category })}
                    </td>
                    <td className='px-3 py-2 text-right'>{item.count.toLocaleString()}</td>
                    <td className='px-3 py-2 text-right'>{item.count_percentage.toFixed(1)}%</td>
                    <td className='px-3 py-2 text-right'>¥{item.amount.toLocaleString()}</td>
                    <td className='px-3 py-2 text-right'>{item.value_percentage.toFixed(1)}%</td>
                  </tr>
                ))}
                <tr className='font-semibold bg-gray-100'>
                  <td className='px-3 py-2'>{t('wms.abc_analysis.total')}</td>
                  <td className='px-3 py-2 text-right'>{totalCount.toLocaleString()}</td>
                  <td className='px-3 py-2 text-right'>100%</td>
                  <td className='px-3 py-2 text-right'>¥{totalAmount.toLocaleString()}</td>
                  <td className='px-3 py-2 text-right'>100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </StatsPageTemplate>
  );
}
