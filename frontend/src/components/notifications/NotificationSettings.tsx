import React from 'react';
import { Bell, Volume2, VolumeX, Monitor, Smartphone } from 'lucide-react';
import type { NotificationSettingsData } from '../../hooks/useNotificationSettings';
import useNotificationSettings from '../../hooks/useNotificationSettings';

const NotificationSettings: React.FC = () => {
  const { settings, toggleSetting, toggleNotificationType, toggleQuietHours, updateQuietHours } =
    useNotificationSettings();

  return (
    <div className='p-4 bg-white border-b border-gray-200'>
      <h4 className='text-sm font-medium text-gray-900 mb-4'>通知设置</h4>

      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Monitor className='w-4 h-4 text-gray-600' />
            <span className='text-sm text-gray-700'>桌面通知</span>
          </div>
          <button
            onClick={() => toggleSetting('enableDesktop')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.enableDesktop ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.enableDesktop ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            {settings.enableSound ? (
              <Volume2 className='w-4 h-4 text-gray-600' />
            ) : (
              <VolumeX className='w-4 h-4 text-gray-600' />
            )}
            <span className='text-sm text-gray-700'>声音提示</span>
          </div>
          <button
            onClick={() => toggleSetting('enableSound')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.enableSound ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.enableSound ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Smartphone className='w-4 h-4 text-gray-600' />
            <span className='text-sm text-gray-700'>移动推送</span>
          </div>
          <button
            onClick={() => toggleSetting('enableMobilePush')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.enableMobilePush ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.enableMobilePush ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className='pt-3 border-t border-gray-200'>
          <h5 className='text-xs font-medium text-gray-700 mb-3'>通知类型</h5>
          <div className='space-y-2'>
            {(Object.entries(settings.types) as [keyof NotificationSettingsData['types'], boolean][]).map(
              ([type, enabled]) => (
                <div key={type} className='flex items-center justify-between'>
                  <span className='text-sm text-gray-600'>
                    {type === 'system' && '系统通知'}
                    {type === 'workflow' && '审批通知'}
                    {type === 'reminder' && '提醒通知'}
                    {type === 'alert' && '告警通知'}
                    {type === 'message' && '消息通知'}
                  </span>
                  <button
                    onClick={() => toggleNotificationType(type)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      enabled ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        enabled ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              )
            )}
          </div>
        </div>

        <div className='pt-3 border-t border-gray-200'>
          <div className='flex items-center justify-between mb-3'>
            <span className='text-xs font-medium text-gray-700'>免打扰时段</span>
            <button
              onClick={toggleQuietHours}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                settings.quietHours.enabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  settings.quietHours.enabled ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {settings.quietHours.enabled && (
            <div className='flex items-center gap-2'>
              <input
                type='time'
                value={settings.quietHours.start}
                onChange={(e) => updateQuietHours('start', e.target.value)}
                className='flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
              <span className='text-xs text-gray-500'>至</span>
              <input
                type='time'
                value={settings.quietHours.end}
                onChange={(e) => updateQuietHours('end', e.target.value)}
                className='flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
