import React from 'react';
import { Volume2, VolumeX, Monitor, Smartphone } from 'lucide-react';
import type { NotificationSettingsData } from '../../hooks/useNotificationSettings';
import useNotificationSettings from '../../hooks/useNotificationSettings';

const NotificationSettings: React.FC = () => {
  const { settings, toggleSetting, toggleNotificationType, toggleQuietHours, updateQuietHours } =
    useNotificationSettings();

  return (
    <div
      style={{
        padding: 16,
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      <h4
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: '#111827',
          marginBottom: 16,
        }}
      >
        通知设置
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
            <Monitor style={{ width: 16, height: 16, color: '#4b5563' }} />
            <span style={{ fontSize: 14, color: '#374151' }}>桌面通知</span>
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
              backgroundColor: settings.enableDesktop ? '#2563eb' : '#e5e7eb',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                height: 16,
                width: 16,
                borderRadius: '9999px',
                backgroundColor: '#ffffff',
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
              <Volume2 style={{ width: 16, height: 16, color: '#4b5563' }} />
            ) : (
              <VolumeX style={{ width: 16, height: 16, color: '#4b5563' }} />
            )}
            <span style={{ fontSize: 14, color: '#374151' }}>声音提示</span>
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
              backgroundColor: settings.enableSound ? '#2563eb' : '#e5e7eb',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                height: 16,
                width: 16,
                borderRadius: '9999px',
                backgroundColor: '#ffffff',
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
            <Smartphone style={{ width: 16, height: 16, color: '#4b5563' }} />
            <span style={{ fontSize: 14, color: '#374151' }}>移动推送</span>
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
              backgroundColor: settings.enableMobilePush ? '#2563eb' : '#e5e7eb',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                height: 16,
                width: 16,
                borderRadius: '9999px',
                backgroundColor: '#ffffff',
                transition: 'transform 0.15s',
                transform: settings.enableMobilePush ? 'translateX(20px)' : 'translateX(4px)',
              }}
            />
          </button>
        </div>

        <div style={{ paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
          <h5
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: '#374151',
              marginBottom: 12,
            }}
          >
            通知类型
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
                <span style={{ fontSize: 14, color: '#4b5563' }}>
                  {type === 'system' && '系统通知'}
                  {type === 'workflow' && '审批通知'}
                  {type === 'reminder' && '提醒通知'}
                  {type === 'alert' && '告警通知'}
                  {type === 'message' && '消息通知'}
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
                    backgroundColor: enabled ? '#2563eb' : '#e5e7eb',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      height: 12,
                      width: 12,
                      borderRadius: '9999px',
                      backgroundColor: '#ffffff',
                      transition: 'transform 0.15s',
                      transform: enabled ? 'translateX(16px)' : 'translateX(4px)',
                    }}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>免打扰时段</span>
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
                backgroundColor: settings.quietHours.enabled ? '#2563eb' : '#e5e7eb',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  height: 12,
                  width: 12,
                  borderRadius: '9999px',
                  backgroundColor: '#ffffff',
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
                  padding: '4px 8px',
                  fontSize: 12,
                  border: '1px solid #d1d5db',
                  borderRadius: 4,
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: 12, color: '#6b7280' }}>至</span>
              <input
                type='time'
                value={settings.quietHours.end}
                onChange={(e) => updateQuietHours('end', e.target.value)}
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  fontSize: 12,
                  border: '1px solid #d1d5db',
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
