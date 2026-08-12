import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
} from 'recharts';
import type { OeeDashboardData } from '@/api/mes/types';

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
        equipment_name: `设备 ${String.fromCharCode(65 + i)}`,
        oee: 60 + Math.sin(i * 0.5) * 15 + ((i * 7) % 10),
        shift: i % 2 === 0 ? '早班' : '晚班',
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

  const radarData = useMemo(
    () => [
      { metric: '可用性', value: data.availability_avg },
      { metric: '性能', value: data.performance_avg },
      { metric: '质量', value: data.quality_avg },
    ],
    [data]
  );

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">OEE 综合仪表盘</h1>
        <select
          value={workshop}
          onChange={(e) => setWorkshop(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm"
          aria-label="车间筛选"
        >
          <option value="all">全部车间</option>
          <option value="w1">一车间</option>
          <option value="w2">二车间</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <h3 className="mb-2 font-semibold">综合 OEE</h3>
          <ResponsiveContainer width="100%" height={200}>
            <RadialBarChart
              innerRadius="60%"
              outerRadius="100%"
              data={[{ value: data.overall_oee }]}
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar background dataKey="value" fill="#6366f1" />
            </RadialBarChart>
          </ResponsiveContainer>
          <p className="text-center text-3xl font-bold">{data.overall_oee.toFixed(1)}%</p>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="mb-2 font-semibold">三环雷达</h3>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" />
              <Radar dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.5} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="mb-2 font-semibold">24h OEE 趋势</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.trend_24h}>
              <XAxis dataKey="timestamp" interval={3} fontSize={10} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line dataKey="oee" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <h3 className="mb-2 font-semibold">设备 OEE 热力图</h3>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid />
            <XAxis dataKey="oee" name="OEE" domain={[0, 100]} type="number" />
            <YAxis dataKey="equipment_name" name="设备" type="category" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter data={data.by_equipment} fill="#6366f1" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
