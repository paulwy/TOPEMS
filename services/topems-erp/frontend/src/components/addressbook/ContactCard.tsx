import React from 'react';
import type { AddressbookEntry } from '../../types/addressbook';

interface ContactCardProps {
  contact: AddressbookEntry;
  onClick: (contact: AddressbookEntry) => void;
}

const ContactCard: React.FC<ContactCardProps> = ({ contact, onClick }) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'EMPLOYEE':
        return '👤';
      case 'DEPARTMENT':
        return '🏢';
      case 'COMPANY':
        return '🏛️';
      default:
        return '📇';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      active: { label: '活跃', color: 'bg-green-100 text-green-800' },
      inactive: { label: '停用', color: 'bg-gray-100 text-gray-800' },
    };
    const config = statusMap[status] || {
      label: status,
      color: 'bg-gray-100 text-gray-800',
    };
    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}
      >
        {config.label}
      </span>
    );
  };

  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onClick(contact)}
    >
      <div className="flex items-start space-x-3">
        <div className="text-2xl">{getTypeIcon(contact.contact_type)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {contact.name}
            </h3>
            {getStatusBadge(contact.status)}
          </div>

          {contact.position && (
            <p className="text-sm text-gray-500 mt-1">{contact.position}</p>
          )}

          {contact.department_name && (
            <p className="text-sm text-gray-400 mt-1">
              🏢 {contact.department_name}
            </p>
          )}

          <div className="mt-2 space-y-1">
            {contact.email && (
              <p className="text-xs text-gray-500 flex items-center">
                <span className="mr-1">📧</span>
                <span className="truncate">{contact.email}</span>
              </p>
            )}
            {contact.phone && (
              <p className="text-xs text-gray-500 flex items-center">
                <span className="mr-1">📱</span>
                {contact.phone}
              </p>
            )}
          </div>

          <div className="mt-2 text-xs text-gray-400">
            {contact.contact_type === 'EMPLOYEE' && contact.code && (
              <span>工号: {contact.code}</span>
            )}
            {contact.contact_type === 'DEPARTMENT' && contact.code && (
              <span>编码: {contact.code}</span>
            )}
            {contact.contact_type === 'COMPANY' && contact.code && (
              <span>注册号: {contact.code}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactCard;
