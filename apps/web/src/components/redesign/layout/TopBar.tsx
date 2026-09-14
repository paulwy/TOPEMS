import React from 'react';
import { Bell, Menu, Search, Settings, User } from 'lucide-react';
import { Button } from '../primitives';

export interface TopBarProps {
  onMenuToggle?: () => void;
  onCommandOpen?: () => void;
  onNotificationsOpen?: () => void;
  onSettingsOpen?: () => void;
  onProfileOpen?: () => void;
  title?: React.ReactNode;
}

export const TopBar: React.FC<TopBarProps> = ({
  onMenuToggle,
  onCommandOpen,
  onNotificationsOpen,
  onSettingsOpen,
  onProfileOpen,
  title = 'TOPEMS',
}) => {
  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 'var(--z-sticky)',
        height: 'var(--topbar-height)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-4)',
        padding: '0 var(--space-4)',
        backgroundColor: 'color-mix(in srgb, var(--bg-primary) 85%, transparent)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-default)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        {onMenuToggle && (
          <Button
            variant='ghost'
            size='sm'
            onClick={onMenuToggle}
            aria-label='Toggle navigation'
          >
            <Menu size={18} />
          </Button>
        )}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
          <span
            style={{
              fontFamily: 'var(--font-brand)',
              fontSize: 'var(--text-xl)',
              fontWeight: 'var(--font-bold)',
              letterSpacing: 'var(--tracking-tight)',
              color: 'var(--text-primary)',
            }}
          >
            {title}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              color: 'var(--accent-primary)',
              letterSpacing: 'var(--tracking-wider)',
            }}
          >
            OS
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <Button
          variant='ghost'
          size='sm'
          leftIcon={<Search size={16} />}
          onClick={onCommandOpen}
          aria-label='Open command palette'
        >
          <span className='desktop-only'>Search</span>
          <kbd
            className='desktop-only'
            style={{
              marginLeft: 'var(--space-2)',
              padding: '2px 6px',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-tertiary)',
              backgroundColor: 'var(--surface-2)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            ⌘K
          </kbd>
        </Button>

        <Button
          variant='ghost'
          size='sm'
          onClick={onNotificationsOpen}
          aria-label='Notifications'
        >
          <Bell size={18} />
        </Button>

        <Button
          variant='ghost'
          size='sm'
          onClick={onSettingsOpen}
          aria-label='Settings'
        >
          <Settings size={18} />
        </Button>

        <Button
          variant='ghost'
          size='sm'
          onClick={onProfileOpen}
          aria-label='Profile'
        >
          <User size={18} />
        </Button>
      </div>
    </header>
  );
};
