import i18n from '@/i18n';

export interface BadgeConfig {
  label: string;
  variant: 'default' | 'destructive' | 'outline' | 'secondary';
}

export const STATUS_MAP: Record<string, BadgeConfig> = {
  pending: { label: i18n.t('im.mail_page_constants.l1'), variant: 'secondary' },
  sent: { label: i18n.t('im.mail_page_constants.l2'), variant: 'default' },
  failed: { label: i18n.t('im.mail_page_constants.l3'), variant: 'destructive' },
};

export const PRIORITY_MAP: Record<string, BadgeConfig> = {
  low: { label: i18n.t('im.mail_page_constants.l4'), variant: 'outline' },
  normal: { label: i18n.t('im.mail_page_constants.l5'), variant: 'secondary' },
  high: { label: i18n.t('im.mail_page_constants.l6'), variant: 'default' },
  urgent: { label: i18n.t('im.mail_page_constants.l7'), variant: 'destructive' },
};

export const PREVIEW_SAMPLE_DATA: Record<string, string> = {
  user_name: i18n.t('im.mail_page_constants.l8'),
  username: 'zhangsan',
  process_name: i18n.t('im.mail_page_constants.l9'),
  approval_status: i18n.t('im.mail_page_constants.l10'),
  approver_name: i18n.t('im.mail_page_constants.l11'),
  approval_time: '2024-01-15 10:30',
  approval_comment: i18n.t('im.mail_page_constants.l12'),
  alert_type: i18n.t('im.mail_page_constants.l13'),
  alertlevel: i18n.t('im.mail_page_constants.l7'),
  alert_time: '2024-01-15 10:30',
  alert_message: i18n.t('im.mail_page_constants.l15'),
  contract_name: i18n.t('im.mail_page_constants.l16'),
  contractNo: 'CT-2024-001',
  contract_action: i18n.t('im.mail_page_constants.l17'),
  action_time: '2024-01-15 10:30',
  register_time: '2024-01-15 10:30',
  reset_link: 'https://example.com/reset-password',
  expire_time: i18n.t('im.mail_page_constants.l18'),
  title: i18n.t('im.mail_page_constants.l19'),
  content: i18n.t('im.mail_page_constants.l20'),
};
