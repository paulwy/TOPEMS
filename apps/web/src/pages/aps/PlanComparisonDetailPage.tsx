/**
 * 计划对比详情页
 *
 * 展示生产计划与实际执行的对比分析。
 * 使用 APS API client 获取计划数据，结合 mock 实际数据进行对比展示。
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import i18n from '@/i18n';
import { productionPlanApi } from '@/api/aps';
import type { ProductionPlan } from '@/api/aps/types';
import { StatusBadge } from '@/components/aps/StatusBadge';
import { designTokens, semanticTokens } from '@topems/tokens';
interface ComparisonData {
  period: string;
  planned: number;
  actual: number;
}
const MOCK_COMPARISON: ComparisonData[] = [
  { period: i18n.t('aps.plan_comparison_detail_page.1_0'), planned: 1000, actual: 950 },
  { period: i18n.t('aps.plan_comparison_detail_page.2_1'), planned: 1200, actual: 1100 },
  { period: i18n.t('aps.plan_comparison_detail_page.3_2'), planned: 1100, actual: 1150 },
  { period: i18n.t('aps.plan_comparison_detail_page.4_3'), planned: 1300, actual: 1200 },
  { period: i18n.t('aps.plan_comparison_detail_page.5_4'), planned: 1400, actual: 1380 },
  { period: i18n.t('aps.plan_comparison_detail_page.6_5'), planned: 1500, actual: 1450 },
];
export default function PlanComparisonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<ProductionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    productionPlanApi
      .get(id)
      .then((res) => {
        if (res.success && res.data) {
          setPlan(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);
  if (loading) {
    return <div className='p-4 text-gray-600'>{i18n.t('pages.plan_comparison_detail_page.k0')}</div>;
  }
  if (!plan) {
    return (
      <div className='p-4'>
        <p className='text-gray-600'>{i18n.t('aps.plan_comparison_detail_page.k6')}</p>
        <button
          onClick={() => navigate('/aps/production-plans')}
          className='mt-2 text-blue-600 underline'
        >
          {i18n.t('pages.plan_comparison_detail_page.k0')}
        </button>
      </div>
    );
  }
  const totalPlanned = MOCK_COMPARISON.reduce((sum, d) => sum + d.planned, 0);
  const totalActual = MOCK_COMPARISON.reduce((sum, d) => sum + d.actual, 0);
  const adherenceRate = ((totalActual / totalPlanned) * 100).toFixed(1);
  return (
    <div className='space-y-4 p-4'>
      <div className='flex items-center justify-between'>
        <div>
          <button
            onClick={() => navigate('/aps/production-plans')}
            className='mb-2 text-sm text-blue-600 hover:underline'
          >
            {i18n.t('pages.plan_comparison_detail_page.k1')}
          </button>
          <h1 className='text-2xl font-bold'>{i18n.t('pages.plan_comparison_detail_page.k0')}</h1>
          <p className='mt-1 text-sm text-gray-500'>{plan.plan_name}</p>
        </div>
        <StatusBadge
          fsm='production_plan'
          status={plan.status ?? 'draft'}
        />
      </div>
      <div className='grid grid-cols-3 gap-4'>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-500'>{i18n.t('aps.plan_comparison_detail_page.k7')}</p>
          <p className='mt-1 text-2xl font-bold'>{totalPlanned.toLocaleString()}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-500'>{i18n.t('aps.plan_comparison_detail_page.k8')}</p>
          <p className='mt-1 text-2xl font-bold'>{totalActual.toLocaleString()}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-500'>{i18n.t('aps.plan_comparison_detail_page.k9')}</p>
          <p className='mt-1 text-2xl font-bold text-blue-600'>{adherenceRate}%</p>
        </div>
      </div>
      <div className='rounded-lg border p-4'>
        <h3 className='mb-3 font-semibold'>{i18n.t('aps.plan_comparison_detail_page.vs_10')}</h3>
        <ResponsiveContainer width='100%' height={350}>
          <BarChart data={MOCK_COMPARISON}>
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis dataKey='period' />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey='planned' name={i18n.t('aps.plan_comparison_detail_page.k11')} fill={designTokens.colors.primary.main} />
            <Bar dataKey='actual' name={i18n.t('aps.plan_comparison_detail_page.k12')} fill={designTokens.colors.success.dark} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className='rounded-lg border p-4'>
        <h3 className='mb-3 font-semibold'>{i18n.t('aps.plan_comparison_detail_page.k13')}</h3>
        <dl className='grid grid-cols-2 gap-4 text-sm'>
          <div>
            <dt className='text-gray-500'>{i18n.t('aps.plan_comparison_detail_page.k14')}</dt>
            <dd className='font-medium'>{plan.plan_no}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>{i18n.t('aps.plan_comparison_detail_page.k15')}</dt>
            <dd className='font-medium'>{plan.plan_name}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>{i18n.t('aps.plan_comparison_detail_page.k16')}</dt>
            <dd className='font-medium'>{plan.plan_type ?? '-'}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>{i18n.t('aps.plan_comparison_detail_page.k17')}</dt>
            <dd className='font-medium'>{plan.product_name ?? '-'}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>{i18n.t('aps.plan_comparison_detail_page.k18')}</dt>
            <dd className='font-medium'>{plan.target_quantity?.toLocaleString() ?? '-'}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>{i18n.t('aps.plan_comparison_detail_page.k19')}</dt>
            <dd className='font-medium'>
              {plan.start_date ?? '-'} ~ {plan.end_date ?? '-'}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}