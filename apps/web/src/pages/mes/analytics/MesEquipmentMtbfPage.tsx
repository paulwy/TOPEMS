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
import type { MtbfData } from '@/api/mes/types';

function useMtbfMock(): MtbfData {
  return useMemo(() => {
    const types = ['CNC', '注塑机', '装配线', '检测机', '激光机', '包装机'];
    return {
      by_equipment_type: types.map((t, i) => ({
        type: t,
        mtbf_hours: Math.round(220 + Math.cos(i * 0.9) * 80 + i * 10),
        mttr_hours: Math.round((2 + ((i * 3) % 5)) * 10) / 10,
      })),
      fault_reasons: [
        '机械磨损',
        '电气故障',
        '传感器失灵',
        '润滑不足',
        '程序异常',
        '气源问题',
        '人为误操作',
        '环境因素',
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
          aria-label="故障级别"
        >
          <option value="all">全部级别</option>
          <option value="critical">严重</option>
          <option value="major">一般</option>
          <option value="minor">轻微</option>
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
            <Line type="monotone" dataKey="mtbf" name="MTBF" stroke="#6366f1" strokeWidth={2} />
            <Line
              type="monotone"
              dataKey="target"
              name="目标"
              stroke="#ef4444"
              strokeDasharray="4 4"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h3 className="mb-2 font-semibold">设备类型 MTTR 对比</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.by_equipment_type}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" fontSize={11} />
              <YAxis unit="h" />
              <Tooltip />
              <Legend />
              <Bar dataKey="mttr_hours" name="MTTR (小时)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
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
              <Scatter data={data.scatter} fill="#10b981" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <h3 className="mb-2 font-semibold">故障原因 Top N</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-3 py-2">故障原因</th>
                <th className="px-3 py-2">发生频次</th>
                <th className="px-3 py-2">占比</th>
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
