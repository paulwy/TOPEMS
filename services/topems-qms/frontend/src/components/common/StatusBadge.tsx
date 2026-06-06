import React from 'react';

interface StatusConfig {
  label: string;
  color: string;
}

interface StatusBadgeProps {
  status: string;
  statusMap: Record<string, StatusConfig>;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, statusMap }) => {
  const config = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
      {config.label}
    </span>
  );
};
