import { Search, Download } from 'lucide-react';

interface AddressbookHeaderProps {
  searchQuery: string;
  onSearchChange: (_query: string) => void;
  onExport: () => void;
}

export const AddressbookHeader: React.FC<AddressbookHeaderProps> = ({
  searchQuery,
  onSearchChange,
  onExport,
}) => {
  return (
    <div
      style={{
        backgroundColor: 'white',
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
                color: '#94a3b8',
              }}
            />
            <input
              type='text'
              placeholder='搜索联系人、部门或公司...'
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: 40,
                paddingRight: 16,
                paddingTop: 8,
                paddingBottom: 8,
                border: '1px solid #cbd5e1',
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
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              color: '#334155',
              backgroundColor: 'white',
              cursor: 'pointer',
              transition: 'colors 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'grey.50';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
            }}
          >
            <Download sx={{ width: 16, height: 16 }} />
            <span>导出</span>
          </button>
        </div>
      </div>
    </div>
  );
};
