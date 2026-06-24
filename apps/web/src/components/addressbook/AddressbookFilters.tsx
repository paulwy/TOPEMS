import React from 'react';

interface AddressbookFiltersProps {
  statusFilter: string;
  onStatusChange: (_status: string) => void;
}

export const AddressbookFilters: React.FC<AddressbookFiltersProps> = ({
  statusFilter,
  onStatusChange,
}) => {
  const statuses = [
    { value: '', label: '全部状态' },
    { value: 'active', label: '在职' },
    { value: 'inactive', label: '离职' },
  ];

  return (
    <div
      style={{
        backgroundColor: 'white',
        borderBottom: '1px solid border.default',
        padding: '12px 16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, color: '#475569' }}>状态:</span>
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            style={{
              padding: '4px 12px',
              fontSize: 14,
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              outline: 'none',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'primary.main';
              e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.2)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'grey.400';
              e.target.style.boxShadow = 'none';
            }}
          >
            {statuses.map((status) => (
              <option
                key={status.value}
                value={status.value}
              >
                {status.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
