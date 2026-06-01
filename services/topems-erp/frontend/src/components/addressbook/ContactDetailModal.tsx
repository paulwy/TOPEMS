import React from 'react';
import type { AddressbookDetail } from '../../types/addressbook';

interface ContactDetailModalProps {
  contact: AddressbookDetail | null;
  isOpen: boolean;
  onClose: () => void;
}

const ContactDetailModal: React.FC<ContactDetailModalProps> = ({
  contact,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !contact) return null;

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      EMPLOYEE: '员工',
      DEPARTMENT: '部门',
      COMPANY: '公司',
    };
    return labels[type] || type;
  };

  const handleEmailClick = () => {
    if (contact.email) {
      window.location.href = `mailto:${contact.email}`;
    }
  };

  const handlePhoneClick = () => {
    if (contact.phone) {
      window.location.href = `tel:${contact.phone}`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-medium text-gray-900">联系人详情</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">关闭</span>
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-center space-x-4">
              <div className="text-4xl">
                {contact.contact_type === 'EMPLOYEE' && '👤'}
                {contact.contact_type === 'DEPARTMENT' && '🏢'}
                {contact.contact_type === 'COMPANY' && '🏛️'}
              </div>
              <div>
                <h4 className="text-xl font-semibold text-gray-900">
                  {contact.name}
                </h4>
                <p className="text-sm text-gray-500">{getTypeLabel(contact.contact_type)}</p>
              </div>
            </div>

            <div className="space-y-3">
              {contact.position && (
                <div className="flex items-center">
                  <span className="w-20 text-sm text-gray-500">职位</span>
                  <span className="text-sm text-gray-900">{contact.position}</span>
                </div>
              )}

              {contact.department_name && (
                <div className="flex items-center">
                  <span className="w-20 text-sm text-gray-500">部门</span>
                  <span className="text-sm text-gray-900">{contact.department_name}</span>
                </div>
              )}

              {contact.email && (
                <div className="flex items-center">
                  <span className="w-20 text-sm text-gray-500">邮箱</span>
                  <button
                    onClick={handleEmailClick}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {contact.email}
                  </button>
                </div>
              )}

              {contact.phone && (
                <div className="flex items-center">
                  <span className="w-20 text-sm text-gray-500">电话</span>
                  <button
                    onClick={handlePhoneClick}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {contact.phone}
                  </button>
                </div>
              )}

              {contact.code && (
                <div className="flex items-center">
                  <span className="w-20 text-sm text-gray-500">编码</span>
                  <span className="text-sm text-gray-900">{contact.code}</span>
                </div>
              )}

              <div className="flex items-center">
                <span className="w-20 text-sm text-gray-500">状态</span>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    contact.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {contact.status === 'active' ? '活跃' : '停用'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 p-4 border-t bg-gray-50">
            {contact.email && (
              <button
                onClick={handleEmailClick}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                📧 发送邮件
              </button>
            )}
            {contact.phone && (
              <button
                onClick={handlePhoneClick}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
              >
                📞 拨打电话
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactDetailModal;
