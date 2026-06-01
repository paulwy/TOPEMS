import React from 'react';
import type { ContactType } from '../../types/addressbook';

interface AddressbookFiltersProps {
  selectedType: ContactType | null;
  selectedStatus: string | null;
  onTypeChange: (type: ContactType | null) => void;
  onStatusChange: (status: string | null) => void;
}

const AddressbookFilters: React.FC<AddressbookFiltersProps> = ({
  selectedType,
  selectedStatus,
  onTypeChange,
  onStatusChange,
}) => {
  const typeOptions: { type: ContactType | null; label: string }[] = [
    { type: null, label: '全部' },
    { type: 'EMPLOYEE', label: '员工' },
    { type: 'DEPARTMENT', label: '部门' },
    { type: 'COMPANY', label: '公司' },
  ];

  const statusOptions = [
    { value: null, label: '全部状态' },
    { value: 'active', label: '活跃' },
    { value: 'inactive', label: '停用' },
  ];

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">类型:</span>
          <div className="flex space-x-1">
            {typeOptions.map(({ type, label }) => (
              <button
                key={type || 'all'}
                onClick={() => onTypeChange(type)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  selectedType === type
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-6 w-px bg-gray-300" />

        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">状态:</span>
          <select
            value={selectedStatus || ''}
            onChange={(e) => onStatusChange(e.target.value || null)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            {statusOptions.map(({ value, label }) => (
              <option key={value || 'all'} value={value || ''}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default AddressbookFilters;
