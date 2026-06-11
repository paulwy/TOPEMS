import React from 'react';

export type ModuleStatus = 'online' | 'beta' | 'plan' | 'new';

interface StatusBadgeProps {
  status: ModuleStatus;
  mobile?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, mobile = false }) => {
  const releaseStyles: Record<ModuleStatus, string> = {
    online: 'bg-green-100 text-green-700',
    beta: 'bg-yellow-100 text-yellow-700',
    plan: 'bg-slate-100 text-slate-700',
    new: 'bg-blue-100 text-blue-700',
  };

  const releaseLabels: Record<ModuleStatus, string> = mobile
    ? {
        online: '上线',
        beta: '测试',
        plan: '规划',
        new: '新功能',
      }
    : {
        online: '✓ 上线',
        beta: 'β 测试',
        plan: '📋 规划',
        new: '✨ 新功能',
      };

  const paddingClass = mobile ? 'px-1.5 py-0.5' : 'px-2 py-1';

  return (
    <span className={`${paddingClass} rounded-full text-xs font-medium ${releaseStyles[status]}`}>
      {releaseLabels[status]}
    </span>
  );
};
