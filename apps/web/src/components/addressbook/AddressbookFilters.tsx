import React from 'react';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

interface AddressbookFiltersProps {
  statusFilter: string;
  onStatusChange: (_status: string) => void;
}
export const AddressbookFilters: React.FC<AddressbookFiltersProps> = ({
  statusFilter,
  onStatusChange,
}) => {
  const statuses = [
    { value: '', label: i18n.t('shared.addressbook_filters.k0') },
    { value: 'active', label: i18n.t('shared.addressbook_filters.k1') },
    { value: 'inactive', label: i18n.t('shared.addressbook_filters.k2') },
  ];
  return (
    <div
      style={{
        backgroundColor: 'common.white',
        borderBottom: '1px solid border.default',
        padding: `${designTokens.spacing.md} 16px`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, color: 'grey.600' }}>
            {i18n.t('components.addressbook.k0')}
          </span>
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            style={{
              padding: `${designTokens.spacing.xs} 12px`,
              fontSize: 14,
              border: `1px solid ${designTokens.colors.grey[300]}`,
              borderRadius: 6,
              outline: 'none',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'primary.main';
              e.target.style.boxShadow = `0 0 0 2px ${designTokens.colors.cyber.grid.lineHeavy}`;
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
