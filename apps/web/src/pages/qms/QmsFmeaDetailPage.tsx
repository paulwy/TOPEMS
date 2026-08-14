/**
 * FMEA 分析详情页
 *
 * 包含：基本信息 + 风险项列表（按 RPN 排序）+ 风险分布图
 * 使用 StatusBadge 组件。
 * 数据来自 useQmsMock。
 */
import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import i18n from '@/i18n';
import { useQmsMock, type QmsMockShape } from '@/api/qms/_mock';
import { StatusBadge } from '@/components/qms/StatusBadge';
import { QMS_PATHS } from '@/modules/qms/config';
import { designTokens, semanticTokens } from '@topems/tokens';

const TABS = [
  { id: 'info', label: i18n.t('pages.qms_fmea_detail_page.k0') },
  { id: 'items', label: i18n.t('pages.qms_fmea_detail_page.k1') },
  { id: 'distribution', label: i18n.t('pages.qms_fmea_detail_page.k2') },
] as const;

function riskLevel(rpn: number): 'high' | 'medium' | 'low' {
  if (rpn >= 200) return 'high';
  if (rpn >= 100) return 'medium';
  return 'low';
}

export default function QmsFmeaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data } = useQmsMock<QmsMockShape>();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['id']>('info');

  const analysis = useMemo(() => {
    const list = data.fmeaAnalyses ?? [];
    return list.find((a) => a.id === id) ?? list[0];
  }, [data.fmeaAnalyses, id]);

  const items = useMemo(() => {
    if (!analysis) return [];
    return (data.fmeaItems ?? [])
      .filter((it) => it.fmeaId === analysis.id)
      .slice()
      .sort((a, b) => b.rpn - a.rpn);
  }, [data.fmeaItems, analysis]);

  const distribution = useMemo(() => {
    const buckets = { high: 0, medium: 0, low: 0 };
    items.forEach((it) => {
      buckets[riskLevel(it.rpn)] += 1;
    });
    return [
      { level: i18n.t('pages.qms_fmea_detail_page.200_0'), count: buckets.high, fill: designTokens.colors.error.main },
      { level: i18n.t('pages.qms_fmea_detail_page.100199_3'), count: buckets.medium, fill: designTokens.colors.warning.main },
      { level: i18n.t('pages.qms_fmea_detail_page.100_1'), count: buckets.low, fill: designTokens.colors.success.dark },
    ];
  }, [items]);

  if (!analysis) {
    return (
      <div className='p-4'>
        <p className='text-gray-600'>{i18n.t('pages.qms_fmea_detail_page.fmea_4')}</p>
        <button
          onClick={() => navigate(QMS_PATHS.fmea)}
          className='mt-2 text-blue-600 underline'
        >
          {i18n.t('pages.qms_fmea_detail_page.fmea_2')}
        </button>
      </div>
    );
  }

  const avgRpn =
    items.length > 0
      ? Math.round((items.reduce((s, i) => s + i.rpn, 0) / items.length) * 10) / 10
      : 0;
  const maxRpn = items.length > 0 ? items[0].rpn : 0;

  return (
    <div className='space-y-4 p-4'>
      <div className='flex items-center justify-between'>
        <div>
          <button
            onClick={() => navigate(QMS_PATHS.fmea)}
            className='mb-2 text-sm text-blue-600 hover:underline'
          >
            {i18n.t('pages.qms_fmea_detail_page.fmea_3')}
          </button>
          <h1 className='text-2xl font-bold'>{analysis.fmeaNo}</h1>
          <p className='mt-1 text-sm text-gray-500'>{analysis.fmeaName}</p>
        </div>
        <StatusBadge
          fsm='apqp'
          status={analysis.status}
          label={analysis.status}
        />
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-5'>
        <Field
          label={i18n.t('pages.qms_fmea_detail_page.fmea_4')}
          value={analysis.fmeaNo}
        />
        <Field
          label={i18n.t('pages.qms_fmea_detail_page.k5')}
          value={analysis.fmeaType}
        />
        <Field
          label={i18n.t('pages.qms_fmea_detail_page.k6')}
          value={analysis.version ?? '-'}
        />
        <Field
          label={i18n.t('pages.qms_fmea_detail_page.k7')}
          value={String(items.length)}
        />
        <Field
          label={i18n.t('pages.qms_fmea_detail_page.rpn_8')}
          value={String(avgRpn)}
        />
      </div>

      <div className='flex gap-2 border-b'>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === t.id
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'info' && (
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <Field
            label={i18n.t('pages.qms_fmea_detail_page.fmea_5')}
            value={analysis.fmeaName}
          />
          <Field
            label={i18n.t('pages.qms_fmea_detail_page.k9')}
            value={analysis.productName ?? '-'}
          />
          <Field
            label={i18n.t('pages.qms_fmea_detail_page.k10')}
            value={analysis.processName ?? '-'}
          />
          <Field
            label={i18n.t('pages.qms_fmea_detail_page.k11')}
            value={analysis.scope ?? '-'}
          />
          <Field
            label={i18n.t('pages.qms_fmea_detail_page.k12')}
            value={analysis.teamLeader ?? '-'}
          />
          <Field
            label={i18n.t('pages.qms_fmea_detail_page.k13')}
            value={analysis.teamMembers?.join('、') ?? '-'}
          />
          <div className='rounded-lg border p-3 md:col-span-2'>
            <p className='text-xs text-gray-500'>{i18n.t('pages.qms_fmea_detail_page.k14')}</p>
            <p className='mt-1 text-sm leading-relaxed'>{analysis.description ?? '-'}</p>
          </div>
        </div>
      )}

      {activeTab === 'items' && (
        <div className='rounded-lg border p-4'>
          <h3 className='mb-3 font-semibold'>{i18n.t('pages.qms_fmea_detail_page.rpn_15')}</h3>
          {items.length === 0 ? (
            <p className='text-sm text-gray-500'>{i18n.t('pages.qms_fmea_detail_page.k16')}</p>
          ) : (
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b text-left text-gray-600'>
                  <th className='py-2 pr-4'>{i18n.t('pages.qms_fmea_detail_page.k17')}</th>
                  <th className='py-2 pr-4'>{i18n.t('pages.qms_fmea_detail_page.k18')}</th>
                  <th className='py-2 pr-4'>{i18n.t('pages.qms_fmea_detail_page.k19')}</th>
                  <th className='py-2 pr-4'>S</th>
                  <th className='py-2 pr-4'>O</th>
                  <th className='py-2 pr-4'>D</th>
                  <th className='py-2 pr-4'>RPN</th>
                  <th className='py-2'>{i18n.t('pages.qms_fmea_detail_page.k20')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const level = riskLevel(it.rpn);
                  return (
                    <tr
                      key={it.id}
                      className='border-b'
                    >
                      <td className='py-2 pr-4 font-medium'>{it.itemNo}</td>
                      <td className='py-2 pr-4'>{it.functionDescription}</td>
                      <td className='py-2 pr-4'>{it.failureMode}</td>
                      <td className='py-2 pr-4'>{it.severity}</td>
                      <td className='py-2 pr-4'>{it.occurrence}</td>
                      <td className='py-2 pr-4'>{it.detection}</td>
                      <td className='py-2 pr-4'>
                        <span
                          className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-bold ${
                            level === 'high'
                              ? 'bg-red-100 text-red-700'
                              : level === 'medium'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {it.rpn}
                        </span>
                      </td>
                      <td className='py-2 text-xs text-gray-600'>{it.recommendedActions ?? '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'distribution' && (
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <div className='rounded-lg border p-4'>
            <h3 className='mb-3 font-semibold'>{i18n.t('pages.qms_fmea_detail_page.k21')}</h3>
            <ResponsiveContainer
              width='100%'
              height={280}
            >
              <BarChart data={distribution}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis
                  dataKey='level'
                  fontSize={11}
                />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey='count'
                  name={i18n.t('pages.qms_fmea_detail_page.k22')}
                  fill={designTokens.colors.secondary.dark}
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className='rounded-lg border p-4'>
            <h3 className='mb-3 font-semibold'>Top 10 风险项 RPN</h3>
            <ResponsiveContainer
              width='100%'
              height={280}
            >
              <BarChart
                data={items.slice(0, 10).map((it) => ({ itemNo: it.itemNo, rpn: it.rpn }))}
                layout='vertical'
              >
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis
                  type='number'
                  fontSize={11}
                />
                <YAxis
                  type='category'
                  dataKey='itemNo'
                  fontSize={10}
                  width={80}
                />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey='rpn'
                  name='RPN'
                  fill={designTokens.colors.error.main}
                  barSize={16}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className='rounded-lg border p-4'>
        <p className='text-sm text-gray-600'>
          最大 RPN：<span className='font-bold text-red-600'>{maxRpn}</span>
          <span className='ml-4'>
            平均 RPN：<span className='font-bold text-orange-600'>{avgRpn}</span>
          </span>
        </p>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-lg border p-3'>
      <p className='text-xs text-gray-500'>{label}</p>
      <p className='mt-1 font-medium'>{value}</p>
    </div>
  );
}
