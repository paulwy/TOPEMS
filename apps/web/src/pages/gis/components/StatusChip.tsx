import React from 'react';
import { Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const getStatusStyle = (status: string, t: (key: string) => string) => {
  if (!status) return { bgcolor: 'grey.100', color: 'grey.600' };
  const s = status.toLowerCase();
  if (s.includes('active') || s.includes(` + ${i18n.t('gis.index.status_active')} + `))
    return { bgcolor: 'success.lighter', color: 'success.700' };
  if (s.includes('pending') || s.includes(` + ${i18n.t('gis.index.status_pending')} + `))
    return { bgcolor: 'warning.light', color: 'warning.700' };
  if (s.includes('inactive') || s.includes(` + ${i18n.t('gis.index.status_inactive')} + `))
    return { bgcolor: 'error.lighter', color: 'error.darker' };
  return { bgcolor: 'grey.100', color: 'grey.600' };
};

interface StatusChipProps {
  status: string;
}

export const StatusChip: React.FC<StatusChipProps> = ({ status }) => {
  const { t } = useTranslation();
  const style = getStatusStyle(status, t);
  return (
    <Chip
      label={status}
      size='small'
      sx={{ bgcolor: style.bgcolor, color: style.color, fontWeight: 500 }}
    />
  );
};
