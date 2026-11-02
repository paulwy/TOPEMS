import React, { useState, useRef, useEffect } from 'react';
import cx from 'clsx';
import styles from './TopBar.module.css';
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
import { ThemeSelector } from '@/components/ThemeSelector';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { AUTH_PATHS } from '@/routes/auth';
import i18n from '@/i18n';
import { designTokens } from '@topems/tokens';

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
      <div className={styles.il1}>
        {handleToggle && (
          <Button
            data-testid='topbar-sidebar-toggle'
            variant='ghost'
            size='sm'
            onClick={handleToggle}
            aria-label={sidebarExpanded ? t('topbar.collapse_sidebar') : t('topbar.expand_sidebar')}
          >
            <ToggleIcon size={18} />
          </Button>
        )}
        <div className={styles.il2}>
          <span
            className={styles.il3}
          >
            {title}
          </span>
          <span
            className={styles.il4}
          >
            OS
          </span>
        </div>
      </div>

      <div className={styles.il5}>
        <Button
          data-testid='topbar-command-palette'
          variant='ghost'
          size='sm'
          leftIcon={<Search size={16} />}
          onClick={onCommandOpen}
          aria-label={`${i18n.t('common.search')} ⌘K`}
        >
          <span className='desktop-only'>{i18n.t('common.search')}</span>
          <kbd
            aria-hidden='true'
            className={cx('desktop-only', styles.il6)}
          >
            ⌘K
          </kbd>
        </Button>

        <ThemeSelector showMenu={false} />

        <Button
          data-testid='topbar-notifications'
          variant='ghost'
          size='sm'
          onClick={onNotificationsOpen}
          aria-label={t('components.top_bar.notifications')}
        >
          <Bell size={18} />
        </Button>

        <Button
          data-testid='topbar-settings'
          variant='ghost'
          size='sm'
          onClick={onSettingsOpen}
          aria-label={t('components.top_bar.settings')}
        >
          <Settings size={18} />
        </Button>

        {/* 用户菜单 */}
        <div
          className={styles.il7}
          ref={userMenuRef}
        >
          <Button
            data-testid='topbar-profile'
            variant='ghost'
            size='sm'
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            aria-label={t('components.top_bar.profile')}
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
                boxShadow: 'var(--shadow-topbar)',
                zIndex: designTokens.zIndex.mobileStepper,
                overflow: 'hidden',
              }}
            >
              {/* 用户信息 */}
              <div
                className={styles.il8}
              >
                <div className={styles.il9}>
                  {user?.name || user?.username || t('components.top_bar.user_fallback')}
                </div>
                <div className={styles.il10}>
                  {user?.email || ''}
                </div>
              </div>

              {/* 菜单选项 */}
              <div className={styles.il11}>
                <button
                  onClick={handleProfileClick}
                  className={styles.il12}
                >
                  <UserCircle size={16} />
                  {t('components.top_bar.profile')}
                </button>

                <button
                  onClick={handleSettingsClick}
                  className={styles.il13}
                >
                  <SettingsIcon size={16} />
                  {t('components.top_bar.account_settings')}
                </button>
              </div>

              {/* 退出登录 */}
              <div
                className={styles.il14}
              >
                <button
                  onClick={handleLogout}
                  className={styles.il15}
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
