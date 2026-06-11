import React from 'react';
import { Clock, ChevronRight } from 'lucide-react';

export interface ActivityItem {
  id: string;
  title: string;
  type: string;
  time: string;
  icon: React.ReactNode;
}

interface RecentActivitiesProps {
  activities: ActivityItem[];
}

export const RecentActivities: React.FC<RecentActivitiesProps> = ({ activities }) => {
  return (
    <div className='mt-8 bg-white rounded-xl shadow-sm p-6'>
      <h3 className='text-lg font-semibold text-slate-900 mb-4 flex items-center justify-between'>
        <span className='flex items-center'>
          <Clock className='w-5 h-5 mr-2 text-blue-500' />
          最近活动
        </span>
        <button className='text-sm text-blue-600 hover:text-blue-700 flex items-center'>
          查看全部 <ChevronRight className='w-4 h-4 ml-1' />
        </button>
      </h3>
      <div className='space-y-4'>
        {activities.map((activity) => (
          <div
            key={activity.id}
            className='flex items-center space-x-4 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer'
          >
            <div className='w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600'>
              {activity.icon}
            </div>
            <div className='flex-1'>
              <p className='text-sm font-medium text-slate-900'>{activity.title}</p>
              <div className='flex items-center space-x-2 mt-1'>
                <span className='text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full'>
                  {activity.type}
                </span>
                <span className='text-xs text-slate-400'>{activity.time}</span>
              </div>
            </div>
            <ChevronRight className='w-4 h-4 text-slate-400' />
          </div>
        ))}
      </div>
    </div>
  );
};
