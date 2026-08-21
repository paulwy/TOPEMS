import { Search, Download } from 'lucide-react';
import i18n from '@/i18n';

interface AddressbookHeaderProps {
  searchQuery: string;
  onSearchChange: (_query: string) => void;
  onExport: () => void;
}

const AddressbookHeader: React.FC<AddressbookHeaderProps> = ({
  searchQuery,
  onSearchChange,
  onExport,
}) => {
  return (
    <div
      style={{
        backgroundColor: 'common.white',
        borderBottom: '1px solid border.default',
        padding: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ flex: 1, maxWidth: 448 }}>
          <div style={{ position: 'relative' }}>
            <Search
              sx={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 20,
                height: 20,
                color: 'grey.400',
              }}
            />
            <input
              type='text'
              placeholder={i18n.t('components.addressbook_header.k0')}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: 40,
                paddingRight: 16,
                paddingTop: 8,
                paddingBottom: 8,
                border: '1px solid var(--color-text-disabled, var(--color-text-disabled))',
                borderRadius: 8,
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
            />
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginLeft: 16,
          }}
        >
          <button
            onClick={onExport}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              border: '1px solid var(--color-text-disabled, var(--color-text-disabled))',
              borderRadius: 8,
              color: 'grey.700',
              backgroundColor: 'common.white',
              cursor: 'pointer',
              transition: 'colors 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'grey.50';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary-foreground)';
            }}
          >
            <Download sx={{ width: 16, height: 16 }} />
            <span>{i18n.t('components.addressbook_header.k0')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
