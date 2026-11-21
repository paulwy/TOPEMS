import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCard } from '@/components/common';
import { hrmSetupApi } from '@/api/hrm/hrmSetup';

/**
 * 落地页轻量引导：GET /setup/progress 返回 is_completed=false 时，
 * 展示一条可关闭的非阻塞提醒并提供前往向导的入口；已完成或查询失败时静默隐藏。
 */
const SetupReminderBanner: React.FC = () => {
  const { t } = useTranslation('hrm');
  const navigate = useNavigate();
  const [incomplete, setIncomplete] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    hrmSetupApi
      .getInitProgress()
      .then((res) => {
        if (!cancelled && res.success && res.data && !res.data.is_completed) {
          setIncomplete(true);
        }
      })
      .catch(() => {
        // 未登录/无权限/接口暂缺时静默隐藏，不打扰
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!incomplete || dismissed) return null;

  return (
    <AlertCard
      level='warning'
      title={t('hrm.setup_wizard.reminder.title')}
      message={t('hrm.setup_wizard.reminder.message')}
      closable
      onClose={() => setDismissed(true)}
      sx={{ mb: 2 }}
      actions={[
        {
          label: t('hrm.setup_wizard.reminder.action'),
          primary: true,
          onClick: () => navigate('/hrm/setup'),
        },
      ]}
    />
  );
};

export default SetupReminderBanner;
