import React from 'react';
import { X, User, Building, Users, Mail, Phone, Calendar, MapPin } from 'lucide-react';
import type { AddressbookDetail } from '../../types/addressbook';

interface ContactDetailModalProps {
  contact: AddressbookDetail | null;
  onClose: () => void;
}

export const ContactDetailModal: React.FC<ContactDetailModalProps> = ({ contact, onClose }) => {
  if (!contact) return null;

  const getIcon = () => {
    switch (contact.contact_type) {
      case 'EMPLOYEE':
        return <User className='w-12 h-12' />;
      case 'DEPARTMENT':
        return <Users className='w-12 h-12' />;
      case 'COMPANY':
        return <Building className='w-12 h-12' />;
      default:
        return <User className='w-12 h-12' />;
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

  const getTypeLabel = () => {
    switch (contact.contact_type) {
      case 'EMPLOYEE':
        return '员工';
      case 'DEPARTMENT':
        return '部门';
      case 'COMPANY':
        return '公司';
      default:
        return '联系人';
    }
  };

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto'>
        <div className='p-6'>
          <div className='flex justify-between items-start mb-6'>
            <div className='flex items-center space-x-4'>
              <div className={`${getColor()} p-4 rounded-full`}>{getIcon()}</div>
              <div>
                <h2 className='text-2xl font-bold text-slate-900'>{contact.name}</h2>
                <p className='text-sm text-slate-500'>{getTypeLabel()}</p>
              </div>
            </div>
            <button onClick={onClose} className='p-2 hover:bg-slate-100 rounded-full transition-colors'>
              <X className='w-6 h-6 text-slate-500' />
            </button>
          </div>

          <div className='space-y-6'>
            {/* 基本信息 */}
            <div>
              <h3 className='text-sm font-semibold text-slate-900 mb-3'>基本信息</h3>
              <div className='bg-slate-50 rounded-lg p-4 space-y-3'>
                {contact.code && (
                  <div className='flex items-center justify-between'>
                    <span className='text-sm text-slate-500'>编号</span>
                    <span className='text-sm text-slate-900'>{contact.code}</span>
                  </div>
                )}
                {contact.position && (
                  <div className='flex items-center justify-between'>
                    <span className='text-sm text-slate-500'>职位</span>
                    <span className='text-sm text-slate-900'>{contact.position}</span>
                  </div>
                )}
                {contact.department_name && (
                  <div className='flex items-center justify-between'>
                    <span className='text-sm text-slate-500'>部门</span>
                    <span className='text-sm text-slate-900'>{contact.department_name}</span>
                  </div>
                )}
                <div className='flex items-center justify-between'>
                  <span className='text-sm text-slate-500'>状态</span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      contact.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {contact.status === 'active' ? '在职' : '离职'}
                  </span>
                </div>
              </div>
            </div>

            {/* 联系方式 */}
            <div>
              <h3 className='text-sm font-semibold text-slate-900 mb-3'>联系方式</h3>
              <div className='bg-slate-50 rounded-lg p-4 space-y-3'>
                {contact.email && (
                  <div className='flex items-center space-x-3'>
                    <Mail className='w-5 h-5 text-slate-400' />
                    <a href={`mailto:${contact.email}`} className='text-sm text-blue-600 hover:text-blue-700'>
                      {contact.email}
                    </a>
                  </div>
                )}
                {contact.phone && (
                  <div className='flex items-center space-x-3'>
                    <Phone className='w-5 h-5 text-slate-400' />
                    <a href={`tel:${contact.phone}`} className='text-sm text-blue-600 hover:text-blue-700'>
                      {contact.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* 其他信息 */}
            {contact.hire_date && (
              <div>
                <h3 className='text-sm font-semibold text-slate-900 mb-3'>入职信息</h3>
                <div className='bg-slate-50 rounded-lg p-4'>
                  <div className='flex items-center space-x-3'>
                    <Calendar className='w-5 h-5 text-slate-400' />
                    <span className='text-sm text-slate-900'>
                      入职时间: {new Date(contact.hire_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 系统信息 */}
            <div>
              <h3 className='text-sm font-semibold text-slate-900 mb-3'>系统信息</h3>
              <div className='bg-slate-50 rounded-lg p-4 space-y-3 text-sm text-slate-500'>
                <div className='flex justify-between'>
                  <span>创建时间</span>
                  <span>{new Date(contact.created_at).toLocaleString()}</span>
                </div>
                <div className='flex justify-between'>
                  <span>更新时间</span>
                  <span>{new Date(contact.updated_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className='mt-6 flex justify-end'>
            <button
              onClick={onClose}
              className='px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors'
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
