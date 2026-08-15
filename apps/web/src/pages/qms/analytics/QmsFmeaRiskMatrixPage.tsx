/**
 * FMEA 风险矩阵分析页
 *
 * 使用 recharts ScatterChart 展示 FMEA 风险分布：
 * - X 轴：发生度（Occurrence, 1-10）
 * - Y 轴：严重度（Severity, 1-10）
 * - 点大小：RPN = S × O × D
 * - 高/中/低风险区域色块
 * 数据来自 useQmsMock 的 fmeaItems。
 */
import { useMemo } from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Legend, ReferenceArea, } from 'recharts';
import { useQmsMock, type QmsMockShape } from '@/api/qms/_mock';
import { designTokens, semanticTokens } from '@topems/tokens';
import { useTranslation } from 'react-i18next';
import i18n from "@/i18n";
const HIGH_RISK_COLOR = designTokens.colors.error.main;
const MEDIUM_RISK_COLOR = designTokens.colors.warning.main;
const LOW_RISK_COLOR = designTokens.colors.success.dark;
function riskLevel(rpn: number): 'high' | 'medium' | 'low' {
    if (rpn >= 200)
        return 'high';
    if (rpn >= 100)
        return 'medium';
    return 'low';
}
export default function QmsFmeaRiskMatrixPage() {
    const { data } = useQmsMock<QmsMockShape>();
    const { t } = useTranslation('qms');
    const items = data.fmeaItems ?? [];
    const scatterData = useMemo(() => {
        const high: {
            severity: number;
            occurrence: number;
            rpn: number;
            itemNo: string;
            failureMode: string;
        }[] = [];
        const medium: typeof high = [];
        const low: typeof high = [];
        items.forEach((it) => {
            const point = {
                severity: it.severity,
                occurrence: it.occurrence,
                rpn: it.rpn,
                itemNo: it.itemNo,
                failureMode: it.failureMode,
            };
            const level = riskLevel(it.rpn);
            if (level === 'high')
                high.push(point);
            else if (level === 'medium')
                medium.push(point);
            else
                low.push(point);
        });
        return { high, medium, low };
    }, [items]);
    const stats = useMemo(() => {
        const total = items.length;
        const high = scatterData.high.length;
        const medium = scatterData.medium.length;
        const low = scatterData.low.length;
        const avgRpn = total > 0 ? Math.round((items.reduce((s, i) => s + i.rpn, 0) / total) * 10) / 10 : 0;
        const maxRpn = total > 0 ? Math.max(...items.map((i) => i.rpn)) : 0;
        return { total, high, medium, low, avgRpn, maxRpn };
    }, [items, scatterData]);
    return (<div className='space-y-4 p-4'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>{i18n.t("qms.analytics.fmeaRiskMatrix.k0")}</h1>
        <span className='text-sm text-gray-500'>RPN = S × O × D</span>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-5'>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{t('qms.qms_fmea_risk_matrix_page.k0')}</p>
          <p className='mt-1 text-2xl font-bold text-blue-600'>{stats.total}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t("qms.analytics.fmeaRiskMatrix.k1")}</p>
          <p className='mt-1 text-2xl font-bold text-red-600'>{stats.high}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{t('qms.qms_fmea_risk_matrix_page.100199_1')}</p>
          <p className='mt-1 text-2xl font-bold text-orange-600'>{stats.medium}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{t('qms.qms_fmea_risk_matrix_page.rpn_2')}</p>
          <p className='mt-1 text-2xl font-bold text-purple-600'>{stats.avgRpn}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{t('qms.qms_fmea_risk_matrix_page.rpn_3')}</p>
          <p className='mt-1 text-2xl font-bold text-red-700'>{stats.maxRpn}</p>
        </div>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>{i18n.t("qms.analytics.fmeaRiskMatrix.k2")}</h3>
        <ResponsiveContainer width='100%' height={420}>
          <ScatterChart margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray='3 3'/>
            <XAxis type='number' dataKey='occurrence' name={t('qms.qms_fmea_risk_matrix_page.k4')} domain={[0, 11]} fontSize={11} label={{ value: t('qms.qms_fmea_risk_matrix_page.o_5'), position: 'bottom', fontSize: 12 }}/>
            <YAxis type='number' dataKey='severity' name={t('qms.qms_fmea_risk_matrix_page.k6')} domain={[0, 11]} fontSize={11} label={{ value: t('qms.qms_fmea_risk_matrix_page.s_7'), angle: -90, position: 'insideLeft', fontSize: 12 }}/>
            <ZAxis type='number' dataKey='rpn' range={[60, 400]} name='RPN'/>
            <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value: unknown, name: unknown) => [String(value), String(name)]} labelFormatter={() => ''}/>
            <Legend />
            {/* 风险区域背景：高严重度+高发生度=高风险区 */}
            <ReferenceArea x1={7} x2={11} y1={7} y2={11} fill={HIGH_RISK_COLOR} fillOpacity={0.08}/>
            <ReferenceArea x1={4} x2={7} y1={4} y2={7} fill={MEDIUM_RISK_COLOR} fillOpacity={0.08}/>
            <ReferenceArea x1={0} x2={4} y1={0} y2={4} fill={LOW_RISK_COLOR} fillOpacity={0.08}/>
            <Scatter name={t('qms.qms_fmea_risk_matrix_page.k8')} data={scatterData.high} fill={HIGH_RISK_COLOR}/>
            <Scatter name={t('qms.qms_fmea_risk_matrix_page.k9')} data={scatterData.medium} fill={MEDIUM_RISK_COLOR}/>
            <Scatter name={t('qms.qms_fmea_risk_matrix_page.k10')} data={scatterData.low} fill={LOW_RISK_COLOR}/>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>{t('qms.qms_fmea_risk_matrix_page.k11')}</h3>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b text-left text-gray-600'>
              <th className='py-2 pr-4'>{t('qms.qms_fmea_risk_matrix_page.k12')}</th>
              <th className='py-2 pr-4'>{t('qms.qms_fmea_risk_matrix_page.k13')}</th>
              <th className='py-2 pr-4'>{t('qms.qms_fmea_risk_matrix_page.k14')}</th>
              <th className='py-2 pr-4'>{t('qms.qms_fmea_risk_matrix_page.k15')}</th>
              <th className='py-2 pr-4'>{t('qms.qms_fmea_risk_matrix_page.k16')}</th>
              <th className='py-2 pr-4'>RPN</th>
            </tr>
          </thead>
          <tbody>
            {items
            .slice()
            .sort((a, b) => b.rpn - a.rpn)
            .slice(0, 10)
            .map((it) => (<tr key={it.id} className='border-b'>
                  <td className='py-2 pr-4 font-medium'>{it.itemNo}</td>
                  <td className='py-2 pr-4'>{it.failureMode}</td>
                  <td className='py-2 pr-4'>{it.severity}</td>
                  <td className='py-2 pr-4'>{it.occurrence}</td>
                  <td className='py-2 pr-4'>{it.detection}</td>
                  <td className='py-2 pr-4'>
                    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${riskLevel(it.rpn) === 'high'
                ? 'bg-red-100 text-red-700'
                : riskLevel(it.rpn) === 'medium'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-green-100 text-green-700'}`}>
                      {it.rpn}
                    </span>
                  </td>
                </tr>))}
          </tbody>
        </table>
      </div>
    </div>);
}
