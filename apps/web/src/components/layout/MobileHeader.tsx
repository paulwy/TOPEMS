import React from 'react';
import { Menu, Bell, User } from 'lucide-react';

interface MobileHeaderProps {
  title: string;
  onMenuClick?: () => void;
  hasNotifications?: boolean;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  onMenuClick,
  hasNotifications = false,
}) => {
  return (
    <header className='mobile-header mobile-only'>
      <button
        onClick={onMenuClick}
        style={{
          padding: '4px',
          marginLeft: '-8px',
          borderRadius: '8px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
        }}
      >
        <Menu size={24} />
      </button>
      <h1
        style={{
          fontSize: '18px',
          fontWeight: 600,
          flex: 1,
          textAlign: 'center',
          paddingLeft: '16px',
          paddingRight: '16px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {title}
      </h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          style={{
            padding: '4px',
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            position: 'relative',
          }}
        >
          <Bell size={20} />
          {hasNotifications && (
            <span
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '8px',
                height: '8px',
                backgroundColor: 'error.main',
                borderRadius: '9999px',
              }}
            />
          )}
        </button>
        <button
          style={{
            padding: '4px',
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
        >
          <User size={20} />
        </button>
      </div>
    </header>
  );
};

export default MobileHeader;
