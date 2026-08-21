import { useMemo } from 'react';
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
import { useWmsMock, type WmsMockShape } from '@/api/wms/_mock';
import { designTokens, semanticTokens } from '@topems/tokens';

const ABC_COLORS: Record<string, string> = {
  A: designTokens.colors.error.main,
  B: designTokens.colors.warning.main,
  C: designTokens.colors.success.dark,
};

export default function WmsAbcAnalysisPage() {
  const { data } = useWmsMock<WmsMockShape>();

  const abc = useMemo(() => data.abcAnalysis ?? [], [data.abcAnalysis]);
  const inventory = useMemo(() => data.inventoryList ?? [], [data.inventoryList]);

  const topSku = useMemo(
    () => [...inventory].sort((a, b) => (b.total_value ?? 0) - (a.total_value ?? 0)).slice(0, 10),
    [inventory]
  );

  const totalAmount = useMemo(() => abc.reduce((s, c) => s + c.amount, 0), [abc]);
  const totalCount = useMemo(() => abc.reduce((s, c) => s + c.count, 0), [abc]);

  return (
    <div className='space-y-4 p-4'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>{i18n.t('wms:wms_abc_analysis_page.abc702010_5')}</h1>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        <div className='rounded-lg border-l-4 border-red-500 p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('wms:wms_abc_analysis_page.a70_4')}</p>
          <p className='mt-1 text-3xl font-bold text-red-600'>
            {abc.find((x) => x.category === 'A')?.count ?? 0} SKU
          </p>
        </div>
        <div className='rounded-lg border-l-4 border-amber-500 p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('wms:wms_abc_analysis_page.b20_3')}</p>
          <p className='mt-1 text-3xl font-bold text-amber-600'>
            {abc.find((x) => x.category === 'B')?.count ?? 0} SKU
          </p>
        </div>
        <div className='rounded-lg border-l-4 border-green-500 p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('wms:wms_abc_analysis_page.c10_2')}</p>
          <p className='mt-1 text-3xl font-bold text-green-600'>
            {abc.find((x) => x.category === 'C')?.count ?? 0} SKU
          </p>
        </div>
      </div>

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
                  `¥${Number(v).toLocaleString()}（${
                    totalAmount ? ((Number(v) / totalAmount) * 100).toFixed(1) : 0
                  }%）`,
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
                  `${v}（${totalCount ? ((Number(v) / totalCount) * 100).toFixed(1) : 0}%）`,
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
        <h3 className='mb-2 font-semibold'>{i18n.t('wms:wms_abc_analysis_page.top10sku_1')}</h3>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='px-3 py-2 text-left font-medium'>
                  {i18n.t('wms:wms_abc_analysis_page.sku_0')}
                </th>
                <th className='px-3 py-2 text-left font-medium'>
                  {i18n.t('pages.wms_abc_analysis_page.k3')}
                </th>
                <th className='px-3 py-2 text-left font-medium'>
                  {i18n.t('pages.wms_abc_analysis_page.k4')}
                </th>
                <th className='px-3 py-2 text-right font-medium'>
                  {i18n.t('pages.wms_abc_analysis_page.k5')}
                </th>
                <th className='px-3 py-2 text-right font-medium'>
                  {i18n.t('pages.wms_abc_analysis_page.k6')}
                </th>
                <th className='px-3 py-2 text-right font-medium'>
                  {i18n.t('pages.wms_abc_analysis_page.k7')}
                </th>
              </tr>
            </thead>
            <tbody>
              {topSku.map((s, i) => (
                <tr
                  key={s.id}
                  className={i % 2 ? 'bg-var(--color-primary-foreground)' : 'bg-gray-50'}
                >
                  <td className='px-3 py-2 font-mono'>{s.sku}</td>
                  <td className='px-3 py-2'>{s.name}</td>
                  <td className='px-3 py-2'>{s.warehouse_name ?? '-'}</td>
                  <td className='px-3 py-2 text-right'>{s.quantity.toLocaleString()}</td>
                  <td className='px-3 py-2 text-right'>
                    ¥{(s.purchase_price ?? 0).toLocaleString()}
                  </td>
                  <td className='px-3 py-2 text-right font-semibold text-blue-700'>
                    ¥{(s.total_value ?? 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
