import React from 'react';
import i18n from '@/i18n';

const NotificationCenter: React.FC = () => {
  return React.createElement(
    'div',
    { className: 'page-placeholder' },
    i18n.t('notification.notification_center.k0')
  );
};

export default NotificationCenter;
