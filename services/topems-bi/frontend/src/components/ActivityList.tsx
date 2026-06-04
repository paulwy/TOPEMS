import { FileText, CheckCircle, Factory, FlaskConical, Clock } from 'lucide-react';
import type { RecentActivity } from '../types';

interface ActivityListProps {
  activities: RecentActivity[];
}

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  project: FileText,
  inspection: CheckCircle,
  production: Factory,
  sample: FlaskConical,
};

export function ActivityList({ activities }: ActivityListProps) {
  const getTypeIcon = (type: string) => {
    return iconMap[type] || FileText;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">最近动态</h3>
        <button className="text-sm text-blue-600 hover:text-blue-700">查看全部</button>
      </div>
      <div className="space-y-4">
        {activities.map((activity) => {
          const Icon = getTypeIcon(activity.type);
          return (
            <div key={activity.id} className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 truncate">{activity.title}</p>
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                  <Clock className="w-3 h-3" />
                  <span>{activity.time}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}