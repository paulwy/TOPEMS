import i18n from '@/i18n';

interface BadgeConfig {
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
