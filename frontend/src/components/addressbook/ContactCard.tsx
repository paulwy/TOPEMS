import React from 'react';
import { User, Building, Users, Mail, Phone, MapPin } from 'lucide-react';
import type { AddressbookEntry } from '../../types/addressbook';

interface ContactCardProps {
  contact: AddressbookEntry;
  onClick: () => void;
}

export const ContactCard: React.FC<ContactCardProps> = ({ contact, onClick }) => {
  const getIcon = () => {
    switch (contact.contact_type) {
      case 'EMPLOYEE':
        return <User className="w-6 h-6" />;
      case 'DEPARTMENT':
        return <Users className="w-6 h-6" />;
      case 'COMPANY':
        return <Building className="w-6 h-6" />;
      default:
        return <User className="w-6 h-6" />;
    }
  };

  const getColor = () => {
    switch (contact.contact_type) {
      case 'EMPLOYEE':
        return 'bg-blue-100 text-blue-600';
      case 'DEPARTMENT':
        return 'bg-green-100 text-green-600';
      case 'COMPANY':
        return 'bg-purple-100 text-purple-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start space-x-4">
        <div className={`${getColor()} p-3 rounded-full`}>
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-slate-900 truncate">
            {contact.name}
          </h3>
          {contact.position && (
            <p className="text-sm text-slate-500 truncate">{contact.position}</p>
          )}
          {contact.department_name && (
            <p className="text-sm text-slate-400 truncate">{contact.department_name}</p>
          )}
          <div className="mt-2 space-y-1">
            {contact.email && (
              <div className="flex items-center text-sm text-slate-500">
                <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">{contact.email}</span>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center text-sm text-slate-500">
                <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{contact.phone}</span>
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              contact.status === 'active'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {contact.status === 'active' ? '在职' : '离职'}
          </span>
        </div>
      </div>
    </div>
  );
};
