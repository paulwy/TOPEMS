import type { KeyMetric } from '../types';

interface MetricCardProps {
  metric: KeyMetric;
}

export function MetricCard({ metric }: MetricCardProps) {
  const isIncrease = metric.change_type === 'increase';
  
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{metric.title}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-gray-800">{metric.value}</span>
            <span className="text-sm text-gray-500">{metric.unit}</span>
          </div>
        </div>
        <div className="text-4xl">{metric.icon}</div>
      </div>
      <div className={`mt-3 flex items-center gap-1 text-sm ${
        isIncrease ? 'text-green-600' : 'text-red-600'
      }`}>
        <span>{isIncrease ? '↑' : '↓'}</span>
        <span>{Math.abs(metric.change)}{metric.unit === '%' ? '%' : ''}</span>
        <span className="text-gray-400">较上期</span>
      </div>
    </div>
  );
}
