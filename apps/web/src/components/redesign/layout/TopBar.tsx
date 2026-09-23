import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  User,
  LogOut,
  UserCircle,
  Settings as SettingsIcon,
} from 'lucide-react';
import { Button } from '../primitives';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { AUTH_PATHS } from '@/routes/auth';
import i18n from '@/i18n';

export interface TopBarProps {
  onMenuToggle?: () => void;
  onCommandOpen?: () => void;
  onNotificationsOpen?: () => void;
  onSettingsOpen?: () => void;
  onProfileOpen?: () => void;
  onToggleSidebar?: () => void;
  sidebarExpanded?: boolean;
  title?: React.ReactNode;
}

export const TopBar: React.FC<TopBarProps> = ({
  onMenuToggle,
  onCommandOpen,
  onNotificationsOpen,
  onSettingsOpen,
  onProfileOpen,
  onToggleSidebar,
  sidebarExpanded = true,
  title = 'TOPEMS',
}) => {
  const { t } = useTranslation();
  const handleToggle = onToggleSidebar || onMenuToggle;
  const ToggleIcon = sidebarExpanded ? PanelLeftClose : PanelLeftOpen;

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate(AUTH_PATHS.login);
    setUserMenuOpen(false);
  };

  const handleProfileClick = () => {
    setUserMenuOpen(false);
    onProfileOpen?.();
  };

  const handleSettingsClick = () => {
    setUserMenuOpen(false);
    onSettingsOpen?.();
  };

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
        {handleToggle && (
          <Button
            variant='ghost'
            size='sm'
            onClick={handleToggle}
            aria-label={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <ToggleIcon size={18} />
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
          <span className='desktop-only'>{i18n.t('common.search')}</span>
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

        {/* 用户菜单 */}
        <div
          style={{ position: 'relative' }}
          ref={userMenuRef}
        >
          <Button
            variant='ghost'
            size='sm'
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            aria-label='Profile'
          >
            <User size={18} />
          </Button>

          {userMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '8px',
                minWidth: '200px',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                zIndex: 1000,
                overflow: 'hidden',
              }}
            >
              {/* 用户信息 */}
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border-default)',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {user?.name || user?.username || t('components.top_bar.user_fallback')}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                  {user?.email || ''}
                </div>
              </div>

              {/* 菜单选项 */}
              <div style={{ padding: '4px 0' }}>
                <button
                  onClick={handleProfileClick}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 16px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  <UserCircle size={16} />
                  {t('components.top_bar.profile')}
                </button>

                <button
                  onClick={handleSettingsClick}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 16px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  <SettingsIcon size={16} />
                  {t('components.top_bar.account_settings')}
                </button>
              </div>

              {/* 退出登录 */}
              <div
                style={{
                  borderTop: '1px solid var(--border-default)',
                  padding: '4px 0',
                }}
              >
                <button
                  onClick={handleLogout}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 16px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: 'var(--error)',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  <LogOut size={16} />
                  {t('components.top_bar.logout')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
