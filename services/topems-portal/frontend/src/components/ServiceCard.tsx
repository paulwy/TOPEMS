import React from 'react';
import { Service } from '../api/portal';

interface ServiceCardProps {
  service: Service;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-100 text-green-800';
      case 'starting':
        return 'bg-yellow-100 text-yellow-800';
      case 'stopped':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running':
        return '运行中';
      case 'starting':
        return '启动中';
      case 'stopped':
        return '已停止';
      default:
        return status;
    }
  };

  const handleClick = () => {
    window.open(service.url, '_blank');
  };

  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 border border-gray-100 overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <span className="text-3xl">{service.icon}</span>
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(service.status)}`}
          >
            {getStatusText(service.status)}
          </span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{service.name}</h3>
        <p className="text-sm text-gray-500 mb-3">{service.description}</p>
        <div className="flex items-center text-sm text-primary-600">
          <span>访问系统</span>
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default ServiceCard;
