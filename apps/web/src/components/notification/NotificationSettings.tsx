import React from 'react';
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
        backgroundColor: 'common.white',
        borderBottom: '1px solid grey.200',
      }}
    >
      <h4
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: 'text.primary',
          marginBottom: 16,
        }}
      >
        {i18n.t('components.notification_settings.k0')}
      </h4>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Monitor style={{ width: 16, height: 16, color: 'text.secondary' }} />
            <span style={{ fontSize: 14, color: 'var(--mui-palette-text-secondary)' }}>
              {i18n.t('components.notification_settings.k1')}
            </span>
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
              backgroundColor: settings.enableDesktop ? 'primary.dark' : 'grey.200',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                height: 16,
                width: 16,
                borderRadius: 'full',
                backgroundColor: 'common.white',
                transition: 'transform 0.15s',
                transform: settings.enableDesktop ? 'translateX(20px)' : 'translateX(4px)',
              }}
            />
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {settings.enableSound ? (
              <Volume2 style={{ width: 16, height: 16, color: 'text.secondary' }} />
            ) : (
              <VolumeX style={{ width: 16, height: 16, color: 'text.secondary' }} />
            )}
            <span style={{ fontSize: 14, color: 'var(--mui-palette-text-secondary)' }}>
              {i18n.t('components.notification_settings.k2')}
            </span>
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
              backgroundColor: settings.enableSound ? 'primary.dark' : 'grey.200',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                height: 16,
                width: 16,
                borderRadius: 'full',
                backgroundColor: 'common.white',
                transition: 'transform 0.15s',
                transform: settings.enableSound ? 'translateX(20px)' : 'translateX(4px)',
              }}
            />
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'spaceBetween',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Smartphone style={{ width: 16, height: 16, color: 'text.secondary' }} />
            <span style={{ fontSize: 14, color: 'var(--mui-palette-text-secondary)' }}>
              {i18n.t('components.notification_settings.k3')}
            </span>
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
              backgroundColor: settings.enableMobilePush ? 'primary.dark' : 'grey.200',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                height: 16,
                width: 16,
                borderRadius: 'full',
                backgroundColor: 'common.white',
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
              color: 'grey.700',
              marginBottom: 12,
            }}
          >
            {i18n.t('components.notification_settings.k4')}
          </h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(
              Object.entries(settings.types) as [keyof NotificationSettingsData['types'], boolean][]
            ).map(([type, enabled]) => (
              <div
                key={type}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontSize: 14, color: 'text.secondary' }}>
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
                    backgroundColor: enabled ? 'primary.dark' : 'grey.200',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      height: 12,
                      width: 12,
                      borderRadius: 'full',
                      backgroundColor: 'common.white',
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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <span
              style={{ fontSize: 12, fontWeight: 500, color: 'var(--mui-palette-text-secondary)' }}
            >
              {i18n.t('components.notification_settings.k5')}
            </span>
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
                backgroundColor: settings.quietHours.enabled ? 'primary.dark' : 'grey.200',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  height: 12,
                  width: 12,
                  borderRadius: 'full',
                  backgroundColor: 'common.white',
                  transition: 'transform 0.15s',
                  transform: settings.quietHours.enabled ? 'translateX(16px)' : 'translateX(4px)',
                }}
              />
            </button>
          </div>

          {settings.quietHours.enabled && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
              <span style={{ fontSize: 12, color: 'text.secondary' }}>
                {i18n.t('components.notification_settings.k6')}
              </span>
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
