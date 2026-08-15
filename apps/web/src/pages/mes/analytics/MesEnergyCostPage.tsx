import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import i18n from '@/i18n';
import type { EnergyCostData } from '@/api/mes/types';
import { designTokens, semanticTokens } from '@topems/tokens';
function useEnergyMock(): EnergyCostData {
  return useMemo(() => {
    const workshops = [i18n.t('mes.mes_energy_cost_page.k5'), i18n.t('mes.mes_energy_cost_page.k4'), i18n.t('mes.mes_energy_cost_page.k3'), i18n.t('mes.mes_energy_cost_page.k2'), i18n.t('mes.mes_energy_cost_page.k1'), i18n.t('mes.mes_energy_cost_page.k0')];
    return {
      per_unit_trend: Array.from({ length: 30 }, (_, i) => ({
        date: `D${i + 1}`,
        kwh_per_unit: Number((2.4 + Math.sin(i / 4) * 0.4 + (i % 7) * 0.03).toFixed(2)),
      })),
      energy_mix: [
        { type: i18n.t('mes.mes_energy_cost_page.k6'), percentage: 62, cost: 184000 },
        { type: i18n.t('mes.mes_energy_cost_page.k7'), percentage: 21, cost: 62000 },
        { type: i18n.t('mes.mes_energy_cost_page.k8'), percentage: 11, cost: 33000 },
        { type: i18n.t('mes.mes_energy_cost_page.k9'), percentage: 6, cost: 18000 },
      ],
      workshop_top_n: workshops
        .map((w, i) => ({
          workshop: w,
          cost: Math.round(50000 - i * 6000 + Math.cos(i) * 4000),
        }))
        .sort((a, b) => b.cost - a.cost),
    };
  }, []);
}
const STACKED_TREND = Array.from({ length: 12 }, (_, i) => ({
  month: `M${i + 1}`,
  [i18n.t('pages.mes_energy_cost_page.k0')]: Math.round(15000 + Math.sin(i / 2) * 2000),
  [i18n.t('pages.mes_energy_cost_page.k1')]: Math.round(5000 + Math.cos(i / 3) * 800),
  [i18n.t('pages.mes_energy_cost_page.k2')]: Math.round(2800 + ((i * 100) % 600)),
  [i18n.t('pages.mes_energy_cost_page.k3')]: Math.round(1500 + ((i * 80) % 300)),
}));
export default function MesEnergyCostPage() {
  const data = useEnergyMock();
  const [energyType, setEnergyType] = useState('all');
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{i18n.t('mes.mes_energy_cost_page.k10')}</h1>
        <select
          value={energyType}
          onChange={(e) => setEnergyType(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm"
          aria-label={i18n.t('mes.mes_energy_cost_page.k11')}
        >
          <option value="all">{i18n.t('mes.mes_energy_cost_page.k12')}</option>
          <option value="elec">{i18n.t('mes.mes_energy_cost_page.k13')}</option>
          <option value="gas">{i18n.t('mes.mes_energy_cost_page.k14')}</option>
          <option value="steam">{i18n.t('mes.mes_energy_cost_page.k15')}</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {data.energy_mix.map((e, idx) => {
          const colors = [designTokens.colors.secondary.dark, designTokens.colors.warning.main, designTokens.colors.success.dark, designTokens.colors.primary.main];
          return (
            <div key={e.type} className="rounded-lg border p-3">
              <p className="text-xs text-gray-500">{e.type}</p>
              <p className="text-xl font-bold" style={{ color: colors[idx % colors.length] }}>
                ¥{(e.cost / 1000).toFixed(1)}k
              </p>
              <p className="mt-1 text-xs text-gray-500">{i18n.t('pages.mes_energy_cost_page.epercentage_0')}</p>
            </div>
          );
        })}
      </div>
      <div className="rounded-lg border p-4">
        <h3 className="mb-2 font-semibold">{i18n.t('mes.mes_energy_cost_page.30_16')}</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data.per_unit_trend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" fontSize={10} interval={2} />
            <YAxis unit=" kWh" />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="kwh_per_unit"
              name={i18n.t('mes.mes_energy_cost_page.k17')}
              stroke={designTokens.colors.secondary.dark}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h3 className="mb-2 font-semibold">{i18n.t('mes.mes_energy_cost_page.12_18')}</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={STACKED_TREND}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={11} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey={i18n.t('mes.mes_energy_cost_page.k19')}
                stackId="1"
                stroke={designTokens.colors.secondary.dark}
                fill={designTokens.colors.secondary.dark}
              />
              <Area
                type="monotone"
                dataKey={i18n.t('mes.mes_energy_cost_page.k20')}
                stackId="1"
                stroke={designTokens.colors.warning.main}
                fill={designTokens.colors.warning.main}
              />
              <Area
                type="monotone"
                dataKey={i18n.t('mes.mes_energy_cost_page.k21')}
                stackId="1"
                stroke={designTokens.colors.success.dark}
                fill={designTokens.colors.success.dark}
              />
              <Area type="monotone" dataKey={i18n.t('mes.mes_energy_cost_page.k22')} stackId="1" stroke={designTokens.colors.primary.main} fill={designTokens.colors.primary.main} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="mb-2 font-semibold">{i18n.t('mes.mes_energy_cost_page.topn_23')}</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.workshop_top_n} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" unit="¥" />
              <YAxis dataKey="workshop" type="category" width={70} fontSize={11} />
              <Tooltip />
              <Bar dataKey="cost" name={i18n.t('mes.mes_energy_cost_page.k24')} fill={designTokens.colors.error.main} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}