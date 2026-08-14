import type { ChipProps } from '@mui/material';
import { getStatusColor as getSharedStatusColor } from '@/utils/status';
import i18n from '@/i18n';

export const getStatusColor = (status: string) => getSharedStatusColor(status);

export const getStatusLabel = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: i18n.t('pages.utils.k0'),
    success: i18n.t('pages.utils.k1'),
    failed: i18n.t('pages.utils.k2'),
    running: i18n.t('pages.utils.k3'),
    stopped: i18n.t('pages.utils.k4'),
    active: i18n.t('pages.utils.k5'),
    inactive: i18n.t('pages.utils.k6'),
    manual: i18n.t('pages.utils.k7'),
    scheduled: i18n.t('pages.utils.k8'),
    interval: i18n.t('pages.utils.k9'),
  };
  return statusMap[status] || status;
};

export const formatJson = (obj: Record<string, unknown> | undefined) => {
  if (!obj) return '{}';
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return '{}';
  }
};

export const parseJsonInput = (str: string) => {
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
};

export type ChipColor = ChipProps['color'];
