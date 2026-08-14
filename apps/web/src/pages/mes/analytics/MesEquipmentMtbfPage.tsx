import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import i18n from '@/i18n';
import type { MtbfData } from '@/api/mes/types';
import { designTokens, semanticTokens } from '@topems/tokens';

function useMtbfMock(): MtbfData {
  return useMemo(() => {
    const types = ['CNC', i18n.t('pages.mes_equipment_mtbf_page.k4'), i18n.t('pages.mes_equipment_mtbf_page.k3'), i18n.t('pages.mes_equipment_mtbf_page.k2'), i18n.t('pages.mes_equipment_mtbf_page.k1'), i18n.t('pages.mes_equipment_mtbf_page.k0')];
    return {
      by_equipment_type: types.map((t, i) => ({
        type: t,
        mtbf_hours: Math.round(220 + Math.cos(i * 0.9) * 80 + i * 10),
        mttr_hours: Math.round((2 + ((i * 3) % 5)) * 10) / 10,
      })),
      fault_reasons: [
        i18n.t('pages.mes_equipment_mtbf_page.k5'),
        i18n.t('pages.mes_equipment_mtbf_page.k6'),
        i18n.t('pages.mes_equipment_mtbf_page.k7'),
        i18n.t('pages.mes_equipment_mtbf_page.k8'),
        i18n.t('pages.mes_equipment_mtbf_page.k9'),
        i18n.t('pages.mes_equipment_mtbf_page.k10'),
        i18n.t('pages.mes_equipment_mtbf_page.k11'),
        i18n.t('pages.mes_equipment_mtbf_page.k12'),
      ].map((reason, i) => ({
        reason,
        frequency: Math.round(60 - i * 6 + Math.sin(i) * 4),
      })),
      scatter: Array.from({ length: 24 }, (_, i) => ({
        mtbf: Math.round(120 + Math.sin(i / 2) * 100 + i * 4),
        oee: Number((70 + Math.cos(i / 3) * 15 + (i % 5)).toFixed(1)),
        label: `E-${String.fromCharCode(65 + (i % 12))}${Math.floor(i / 12) + 1}`,
      })),
    };
  }, []);
}

const TREND_12W = Array.from({ length: 12 }, (_, i) => ({
  week: `W${i + 1}`,
  mtbf: Math.round(220 + Math.sin(i / 2) * 60 + i * 4),
  target: 280,
}));

export default function MesEquipmentMtbfPage() {
  const data = useMtbfMock();
  const [severity, setSeverity] = useState('all');

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">设备 MTBF / MTTR 分析</h1>
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm"
          aria-label={i18n.t('pages.mes_equipment_mtbf_page.k13')}
        >
          <option value="all">{i18n.t('pages.mes_equipment_mtbf_page.k14')}</option>
          <option value="critical">{i18n.t('pages.mes_equipment_mtbf_page.k15')}</option>
          <option value="major">{i18n.t('pages.mes_equipment_mtbf_page.k16')}</option>
          <option value="minor">{i18n.t('pages.mes_equipment_mtbf_page.k17')}</option>
        </select>
      </div>

      <div className="rounded-lg border p-4">
        <h3 className="mb-2 font-semibold">MTBF 12 周趋势</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={TREND_12W}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" fontSize={11} />
            <YAxis unit="h" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="mtbf" name="MTBF" stroke={designTokens.colors.secondary.dark} strokeWidth={2} />
            <Line
              type="monotone"
              dataKey="target"
              name={i18n.t('pages.mes_equipment_mtbf_page.k18')}
              stroke={designTokens.colors.error.main}
              strokeDasharray="4 4"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h3 className="mb-2 font-semibold">{i18n.t('pages.mes_equipment_mtbf_page.mttr_19')}</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.by_equipment_type}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" fontSize={11} />
              <YAxis unit="h" />
              <Tooltip />
              <Legend />
              <Bar dataKey="mttr_hours" name={i18n.t('pages.mes_equipment_mtbf_page.mttr_0')} fill={designTokens.colors.warning.main} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="mb-2 font-semibold">MTBF vs OEE 散点</h3>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart>
              <CartesianGrid />
              <XAxis dataKey="mtbf" name="MTBF" type="number" unit="h" />
              <YAxis dataKey="oee" name="OEE" type="number" domain={[0, 100]} unit="%" />
              <ZAxis range={[60, 160]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={data.scatter} fill={designTokens.colors.success.dark} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <h3 className="mb-2 font-semibold">{i18n.t('pages.mes_equipment_mtbf_page.topn_20')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-3 py-2">{i18n.t('pages.mes_equipment_mtbf_page.k21')}</th>
                <th className="px-3 py-2">{i18n.t('pages.mes_equipment_mtbf_page.k22')}</th>
                <th className="px-3 py-2">{i18n.t('pages.mes_equipment_mtbf_page.k23')}</th>
              </tr>
            </thead>
            <tbody>
              {data.fault_reasons.map((row) => {
                const total = data.fault_reasons.reduce((s, r) => s + r.frequency, 0);
                return (
                  <tr key={row.reason} className="border-b">
                    <td className="px-3 py-2">{row.reason}</td>
                    <td className="px-3 py-2">{row.frequency} 次</td>
                    <td className="px-3 py-2">
                      {((row.frequency / total) * 100).toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
