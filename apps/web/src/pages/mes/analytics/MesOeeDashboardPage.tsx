import { useMemo, useState } from 'react';
import { ResponsiveContainer, RadialBarChart, RadialBar, RadarChart, PolarGrid, PolarAngleAxis, Radar, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, } from 'recharts';
import i18n from '@/i18n';
import type { OeeDashboardData } from '@/api/mes/types';
import { designTokens, semanticTokens } from '@topems/tokens';
function useOeeMock(): OeeDashboardData {
    return useMemo(() => {
        const base = 78.5;
        return {
            overall_oee: base,
            availability_avg: 88.2,
            performance_avg: 92.1,
            quality_avg: 96.3,
            by_equipment: Array.from({ length: 12 }, (_, i) => ({
                equipment_id: `eq-${i + 1}`,
                equipment_name: `${i18n.t('pages.mes_oee_dashboard_page.k0')}${String.fromCharCode(65 + i)}`,
                oee: 60 + Math.sin(i * 0.5) * 15 + ((i * 7) % 10),
                shift: i % 2 === 0 ? i18n.t('mes.mes_oee_dashboard_page.k1') : i18n.t('mes.mes_oee_dashboard_page.k0'),
            })),
            trend_24h: Array.from({ length: 24 }, (_, h) => ({
                timestamp: `${h}:00`,
                oee: 70 + Math.sin(h / 3) * 15 + ((h * 3) % 5),
            })),
        };
    }, []);
}
export default function MesOeeDashboardPage() {
    const data = useOeeMock();
    const [workshop, setWorkshop] = useState('all');
    const radarData = useMemo(() => [
        { metric: i18n.t('mes.mes_oee_dashboard_page.k2'), value: data.availability_avg },
        { metric: i18n.t('mes.mes_oee_dashboard_page.k3'), value: data.performance_avg },
        { metric: i18n.t('mes.mes_oee_dashboard_page.k4'), value: data.quality_avg },
    ], [data]);
    return (<div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{i18n.t("mes.analytics.oeeDashboard.k0")}</h1>
        <select value={workshop} onChange={(e) => setWorkshop(e.target.value)} className="border rounded px-3 py-1.5 text-sm" aria-label={i18n.t('mes.mes_oee_dashboard_page.k5')}>
          <option value="all">{i18n.t('mes.mes_oee_dashboard_page.k6')}</option>
          <option value="w1">{i18n.t('mes.mes_oee_dashboard_page.k7')}</option>
          <option value="w2">{i18n.t('mes.mes_oee_dashboard_page.k8')}</option>
        </select>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <h3 className="mb-2 font-semibold">{i18n.t('mes.mes_oee_dashboard_page.oee_9')}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <RadialBarChart innerRadius="60%" outerRadius="100%" data={[{ value: data.overall_oee }]} startAngle={90} endAngle={-270}>
              <RadialBar background dataKey="value" fill={designTokens.colors.secondary.dark}/>
            </RadialBarChart>
          </ResponsiveContainer>
          <p className="text-center text-3xl font-bold">{data.overall_oee.toFixed(1)}%</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="mb-2 font-semibold">{i18n.t('mes.mes_oee_dashboard_page.k10')}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric"/>
              <Radar dataKey="value" stroke={designTokens.colors.success.dark} fill={designTokens.colors.success.dark} fillOpacity={0.5}/>
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="mb-2 font-semibold">{i18n.t("mes.analytics.oeeDashboard.k1")}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.trend_24h}>
              <XAxis dataKey="timestamp" interval={3} fontSize={10}/>
              <YAxis domain={[0, 100]}/>
              <Tooltip />
              <Line dataKey="oee" stroke={designTokens.colors.warning.main} strokeWidth={2} dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-lg border p-4">
        <h3 className="mb-2 font-semibold">{i18n.t('mes.mes_oee_dashboard_page.oee_11')}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid />
            <XAxis dataKey="oee" name="OEE" domain={[0, 100]} type="number"/>
            <YAxis dataKey="equipment_name" name={i18n.t('mes.mes_oee_dashboard_page.k12')} type="category"/>
            <Tooltip cursor={{ strokeDasharray: '3 3' }}/>
            <Scatter data={data.by_equipment} fill={designTokens.colors.secondary.dark}/>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>);
}
