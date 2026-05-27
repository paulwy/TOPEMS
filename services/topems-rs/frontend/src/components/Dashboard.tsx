import React from 'react';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  change?: number;
  changeType?: 'increase' | 'decrease';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color,
  change,
  changeType,
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    green: 'bg-green-50 border-green-200 text-green-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600',
    orange: 'bg-orange-50 border-orange-200 text-orange-600',
    red: 'bg-red-50 border-red-200 text-red-600',
  };

  const iconBgClasses = {
    blue: 'bg-blue-100',
    green: 'bg-green-100',
    purple: 'bg-purple-100',
    orange: 'bg-orange-100',
    red: 'bg-red-100',
  };

  return (
    <div className={`bg-white rounded-xl border ${colorClasses[color]} p-5 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {change !== undefined && (
            <div className={`flex items-center mt-2 text-sm ${
              changeType === 'increase' ? 'text-green-600' : 'text-red-600'
            }`}>
              <span>{changeType === 'increase' ? '↑' : '↓'}</span>
              <span className="ml-1">{Math.abs(change)}%</span>
              <span className="ml-1 text-gray-500">较上期</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${iconBgClasses[color]}`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );
};

export interface ChartCardProps {
  title: string;
  children: React.ReactNode;
}

export const ChartCard: React.FC<ChartCardProps> = ({ title, children }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
    {children}
  </div>
);

export interface SimpleBarChartProps {
  data: { label: string; value: number; color?: string }[];
  maxValue?: number;
}

export const SimpleBarChart: React.FC<SimpleBarChartProps> = ({ data, maxValue }) => {
  const max = maxValue || Math.max(...data.map((d) => d.value));
  
  return (
    <div className="space-y-4">
      {data.map((item) => (
        <div key={item.label}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">{item.label}</span>
            <span className="font-medium text-gray-900">{item.value}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                item.color || 'bg-primary-500'
              }`}
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export interface SimplePieChartProps {
  data: { label: string; value: number; color: string }[];
}

export const SimplePieChart: React.FC<SimplePieChartProps> = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;

  const slices = data.map((item) => {
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;
    
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((startAngle + angle - 90) * Math.PI) / 180;
    
    const x1 = 50 + 40 * Math.cos(startRad);
    const y1 = 50 + 40 * Math.sin(startRad);
    const x2 = 50 + 40 * Math.cos(endRad);
    const y2 = 50 + 40 * Math.sin(endRad);
    
    const largeArcFlag = angle > 180 ? 1 : 0;
    
    const pathData = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
    
    return { ...item, pathData };
  });

  return (
    <div className="flex items-center space-x-8">
      <svg viewBox="0 0 100 100" className="w-32 h-32">
        {slices.map((slice, index) => (
          <path
            key={index}
            d={slice.pathData}
            fill={slice.color}
            className="cursor-pointer hover:opacity-80 transition-opacity"
          />
        ))}
        <circle cx="50" cy="50" r="20" fill="white" />
      </svg>
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center space-x-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm text-gray-600">{item.label}</span>
            <span className="text-sm font-medium text-gray-900">
              {((item.value / total) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const stats = [
    { title: '项目总数', value: '128', icon: '📊', color: 'blue' as const, change: 12, changeType: 'increase' as const },
    { title: '进行中项目', value: '45', icon: '🚀', color: 'green' as const, change: 8, changeType: 'increase' as const },
    { title: '试验完成率', value: '78%', icon: '✅', color: 'purple' as const, change: 3, changeType: 'increase' as const },
    { title: '待办任务', value: '12', icon: '📋', color: 'orange' as const, change: 5, changeType: 'decrease' as const },
  ];

  const barData = [
    { label: '一月', value: 45, color: 'bg-blue-500' },
    { label: '二月', value: 52, color: 'bg-blue-500' },
    { label: '三月', value: 38, color: 'bg-blue-500' },
    { label: '四月', value: 65, color: 'bg-blue-500' },
    { label: '五月', value: 78, color: 'bg-green-500' },
  ];

  const pieData = [
    { label: '进行中', value: 45, color: '#3b82f6' },
    { label: '已完成', value: 62, color: '#22c55e' },
    { label: '待开始', value: 15, color: '#eab308' },
    { label: '已暂停', value: 6, color: '#f97316' },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">数据仪表盘</h1>
        <p className="text-gray-500 mt-1">实时数据统计与可视化</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="月度项目数量">
          <SimpleBarChart data={barData} />
        </ChartCard>
        <ChartCard title="项目状态分布">
          <SimplePieChart data={pieData} />
        </ChartCard>
      </div>
    </div>
  );
};

export default Dashboard;
