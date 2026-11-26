import React from 'react';
import styles from './NotificationSettings.module.css';
import { flexRowCenter, flexColumnGap16 } from '../sharedStyles';
import { Volume2, VolumeX, Monitor, Smartphone } from 'lucide-react';
import type { NotificationSettingsData } from '../../hooks/useNotificationSettings';
import useNotificationSettings from '../../hooks/useNotificationSettings';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

const NotificationSettings: React.FC = () => {
  const { settings, toggleSetting, toggleNotificationType, toggleQuietHours, updateQuietHours } =
    useNotificationSettings();

  return (
    <div
      style={{
        padding: 16,
        backgroundColor: 'var(--bg-elevated)',
        borderBottom: '1px solid grey.200',
      }}
    >
      <h4 className={styles.il1}>{i18n.t('components.notification_settings.k0')}</h4>

      <div style={flexColumnGap16}>
        <div className={styles.il2}>
          <div style={flexRowCenter}>
            <Monitor className={styles.il3} />
            <span className={styles.il1}>{i18n.t('components.notification_settings.k1')}</span>
          </div>
          <button
            onClick={() => toggleSetting('enableDesktop')}
            style={{
              position: 'relative',
              display: 'inline-flex',
              height: 24,
              width: 44,
              alignItems: 'center',
              borderRadius: 9999,
              transition: 'background-color 0.15s',
              backgroundColor: settings.enableDesktop
                ? 'var(--accent-primary-active)'
                : 'var(--surface-3)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                height: 16,
                width: 16,
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--bg-elevated)',
                transition: 'transform 0.15s',
                transform: settings.enableDesktop ? 'translateX(20px)' : 'translateX(4px)',
              }}
            />
          </button>
        </div>

        <div className={styles.il4}>
          <div style={flexRowCenter}>
            {settings.enableSound ? (
              <Volume2 className={styles.il5} />
            ) : (
              <VolumeX className={styles.il6} />
            )}
            <span className={styles.il2}>{i18n.t('components.notification_settings.k2')}</span>
          </div>
          <button
            onClick={() => toggleSetting('enableSound')}
            style={{
              position: 'relative',
              display: 'inline-flex',
              height: 24,
              width: 44,
              alignItems: 'center',
              borderRadius: 9999,
              transition: 'background-color 0.15s',
              backgroundColor: settings.enableSound
                ? 'var(--accent-primary-active)'
                : 'var(--surface-3)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                height: 16,
                width: 16,
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--bg-elevated)',
                transition: 'transform 0.15s',
                transform: settings.enableSound ? 'translateX(20px)' : 'translateX(4px)',
              }}
            />
          </button>
        </div>

        <div className={styles.il7}>
          <div style={flexRowCenter}>
            <Smartphone className={styles.il8} />
            <span className={styles.il3}>{i18n.t('components.notification_settings.k3')}</span>
          </div>
          <button
            onClick={() => toggleSetting('enableMobilePush')}
            style={{
              position: 'relative',
              display: 'inline-flex',
              height: 24,
              width: 44,
              alignItems: 'center',
              borderRadius: 9999,
              transition: 'background-color 0.15s',
              backgroundColor: settings.enableMobilePush
                ? 'var(--accent-primary-active)'
                : 'var(--surface-3)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                height: 16,
                width: 16,
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--bg-elevated)',
                transition: 'transform 0.15s',
                transform: settings.enableMobilePush ? 'translateX(20px)' : 'translateX(4px)',
              }}
            />
          </button>
        </div>

        <div style={{ paddingTop: 12, borderTop: '1px solid var(--mui-palette-divider)' }}>
          <h5
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              marginBottom: 12,
            }}
          >
            {i18n.t('components.notification_settings.k4')}
          </h5>
          <div className={styles.il9}>
            {(
              Object.entries(settings.types) as [keyof NotificationSettingsData['types'], boolean][]
            ).map(([type, enabled]) => (
              <div
                key={type}
                className={styles.il10}
              >
                <span className={styles.il11}>
                  {type === 'system' && i18n.t('shared.notification_settings.k0')}
                  {type === 'workflow' && i18n.t('shared.notification_settings.k1')}
                  {type === 'reminder' && i18n.t('shared.notification_settings.k2')}
                  {type === 'alert' && i18n.t('shared.notification_settings.k3')}
                  {type === 'message' && i18n.t('shared.notification_settings.k4')}
                </span>
                <button
                  onClick={() => toggleNotificationType(type)}
                  style={{
                    position: 'relative',
                    display: 'inline-flex',
                    height: 20,
                    width: 36,
                    alignItems: 'center',
                    borderRadius: 9999,
                    transition: 'background-color 0.15s',
                    backgroundColor: enabled ? 'var(--accent-primary-active)' : 'var(--surface-3)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      height: 12,
                      width: 12,
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--bg-elevated)',
                      transition: 'transform 0.15s',
                      transform: enabled ? 'translateX(16px)' : 'translateX(4px)',
                    }}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ paddingTop: 12, borderTop: '1px solid var(--mui-palette-divider)' }}>
          <div className={styles.il12}>
            <span className={styles.il4}>{i18n.t('components.notification_settings.k5')}</span>
            <button
              onClick={toggleQuietHours}
              style={{
                position: 'relative',
                display: 'inline-flex',
                height: 20,
                width: 36,
                alignItems: 'center',
                borderRadius: 9999,
                transition: 'background-color 0.15s',
                backgroundColor: settings.quietHours.enabled
                  ? 'var(--accent-primary-active)'
                  : 'var(--surface-3)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  height: 12,
                  width: 12,
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--bg-elevated)',
                  transition: 'transform 0.15s',
                  transform: settings.quietHours.enabled ? 'translateX(16px)' : 'translateX(4px)',
                }}
              />
            </button>
          </div>

          {settings.quietHours.enabled && (
            <div style={flexRowCenter}>
              <input
                type='time'
                value={settings.quietHours.start}
                onChange={(e) => updateQuietHours('start', e.target.value)}
                style={{
                  flex: 1,
                  padding: `${designTokens.spacing.xs} ${designTokens.spacing.sm}px`,
                  fontSize: 12,
                  border: '1px solid grey.300',
                  borderRadius: 4,
                  outline: 'none',
                }}
              />
              <span className={styles.il13}>{i18n.t('components.notification_settings.k6')}</span>
              <input
                type='time'
                value={settings.quietHours.end}
                onChange={(e) => updateQuietHours('end', e.target.value)}
                style={{
                  flex: 1,
                  padding: `${designTokens.spacing.xs} ${designTokens.spacing.sm}px`,
                  fontSize: 12,
                  border: '1px solid grey.300',
                  borderRadius: 4,
                  outline: 'none',
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
