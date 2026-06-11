import React from 'react';

interface ServiceStatusCardProps {
  name: string;
  service: string;
  port: number;
  status: boolean;
  icon: React.ElementType;
}

export const ServiceStatusCard: React.FC<ServiceStatusCardProps> = ({ name, service, port, status, icon: Icon }) => {
  const statusColor = status ? 'bg-green-500' : 'bg-red-500';

  return (
    <div className='bg-slate-50 rounded-lg p-4'>
      <div className='flex items-center justify-between mb-2'>
        <div className='flex items-center space-x-2'>
          <Icon className='w-4 h-4 text-slate-500' />
          <span className='font-medium text-slate-900'>{name}</span>
        </div>
        <div className={`w-3 h-3 rounded-full ${statusColor}`} />
      </div>
      <div className='flex items-center justify-between text-xs text-slate-500'>
        <span>{service}</span>
        <span>:{port}</span>
      </div>
    </div>
  );
};
