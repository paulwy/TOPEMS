import React from 'react';

export type ModuleStatus = 'online' | 'beta' | 'plan' | 'new';

interface StatusBadgeProps {
  status: ModuleStatus;
  mobile?: boolean;
  isDarkMode?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  mobile = false,
  isDarkMode = true,
}) => {
  const releaseStyles: Record<ModuleStatus, { light: string; dark: string }> = {
    online: {
      light: 'bg-green-100 text-green-700',
      dark: 'bg-green-500/20 text-green-400',
    },
    beta: {
      light: 'bg-yellow-100 text-yellow-700',
      dark: 'bg-yellow-500/20 text-yellow-400',
    },
    plan: {
      light: 'bg-slate-100 text-slate-700',
      dark: 'bg-slate-500/20 text-slate-400',
    },
    new: {
      light: 'bg-blue-100 text-blue-700',
      dark: 'bg-blue-500/20 text-blue-400',
    },
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
    <span
      className={`${paddingClass} rounded-full text-xs font-medium ${isDarkMode ? releaseStyles[status].dark : releaseStyles[status].light}`}
    >
      {releaseLabels[status]}
    </span>
  );
};
