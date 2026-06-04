import { TrendingUp, TrendingDown, Activity, Target, DollarSign, Users } from 'lucide-react';
import type { KeyMetric } from '../types';

interface MetricCardProps {
  metric: KeyMetric;
}

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  '📈': TrendingUp,
  '✅': Target,
  '⚙️': Activity,
  '💰': DollarSign,
  '👥': Users,
};

export function MetricCard({ metric }: MetricCardProps) {
  const isIncrease = metric.change_type === 'increase';
  const IconComponent = iconMap[metric.icon] || Activity;

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
        <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
          <IconComponent className="w-6 h-6 text-blue-600" />
        </div>
      </div>
      <div className={`mt-3 flex items-center gap-1 text-sm ${
        isIncrease ? 'text-green-600' : 'text-red-600'
      }`}>
        {isIncrease ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        <span>{Math.abs(metric.change)}{metric.unit === '%' ? '%' : ''}</span>
        <span className="text-gray-400">较上期</span>
      </div>
    </div>
  );
}