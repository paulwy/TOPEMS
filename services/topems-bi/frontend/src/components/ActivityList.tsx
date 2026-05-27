import type { RecentActivity } from '../types';

interface ActivityListProps {
  activities: RecentActivity[];
}

export function ActivityList({ activities }: ActivityListProps) {
  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      project: '📊',
      inspection: '✅',
      production: '🏭',
      sample: '🧪',
    };
    return icons[type] || '📋';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">最近动态</h3>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3">
            <div className="text-xl mt-0.5">{getTypeIcon(activity.type)}</div>
            <div className="flex-1">
              <p className="text-sm text-gray-800">{activity.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
