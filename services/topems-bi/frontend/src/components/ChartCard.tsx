import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

interface ChartCardProps {
  title: string;
  option: EChartsOption;
  height?: string;
}

export function ChartCard({ title, option, height = '250px' }: ChartCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      <ReactECharts option={option} style={{ height }} />
    </div>
  );
}
