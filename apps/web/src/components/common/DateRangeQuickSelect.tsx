import React, { useState } from 'react';
import { Box, Button, Typography, Popover, Divider } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { Calendar, ChevronDown, Clock } from 'lucide-react';
import { formatDate } from '@/utils/format';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

export interface DateRange {
  startDate: string;
  endDate: string;
  label: string;
}

export interface DateRangeQuickSelectProps {
  value?: DateRange;
  onChange: (range: DateRange) => void;
  label?: string;
  placeholder?: string;
  sx?: SxProps<Theme>;
}

const getDateRange = (type: string): DateRange => {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  switch (type) {
    case 'today':
      return {
        startDate: formatDate(now.toISOString(), 'YYYY-MM-DD'),
        endDate: formatDate(now.toISOString(), 'YYYY-MM-DD'),
        label: i18n.t('shared.date_range_quick_select.k0'),
      };
    case 'yesterday':
      start.setDate(now.getDate() - 1);
      end.setDate(now.getDate() - 1);
      return {
        startDate: formatDate(start.toISOString(), 'YYYY-MM-DD'),
        endDate: formatDate(end.toISOString(), 'YYYY-MM-DD'),
        label: i18n.t('shared.date_range_quick_select.k1'),
      };
    case 'week':
      const weekDay = now.getDay();
      start.setDate(now.getDate() - (weekDay === 0 ? 6 : weekDay - 1));
      return {
        startDate: formatDate(start.toISOString(), 'YYYY-MM-DD'),
        endDate: formatDate(now.toISOString(), 'YYYY-MM-DD'),
        label: i18n.t('shared.date_range_quick_select.k2'),
      };
    case 'lastWeek':
      const lastWeekDay = now.getDay();
      start.setDate(now.getDate() - (lastWeekDay === 0 ? 6 : lastWeekDay - 1) - 7);
      end.setDate(now.getDate() - (lastWeekDay === 0 ? 6 : lastWeekDay - 1));
      return {
        startDate: formatDate(start.toISOString(), 'YYYY-MM-DD'),
        endDate: formatDate(end.toISOString(), 'YYYY-MM-DD'),
        label: i18n.t('shared.date_range_quick_select.k3'),
      };
    case 'month':
      start.setDate(1);
      return {
        startDate: formatDate(start.toISOString(), 'YYYY-MM-DD'),
        endDate: formatDate(now.toISOString(), 'YYYY-MM-DD'),
        label: i18n.t('shared.date_range_quick_select.k4'),
      };
    case 'lastMonth':
      start.setMonth(now.getMonth() - 1);
      start.setDate(1);
      end.setMonth(now.getMonth() - 1);
      end.setDate(new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate());
      return {
        startDate: formatDate(start.toISOString(), 'YYYY-MM-DD'),
        endDate: formatDate(end.toISOString(), 'YYYY-MM-DD'),
        label: i18n.t('shared.date_range_quick_select.k5'),
      };
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      start.setMonth(quarter * 3);
      start.setDate(1);
      return {
        startDate: formatDate(start.toISOString(), 'YYYY-MM-DD'),
        endDate: formatDate(now.toISOString(), 'YYYY-MM-DD'),
        label: i18n.t('shared.date_range_quick_select.k6'),
      };
    case 'year':
      start.setMonth(0);
      start.setDate(1);
      return {
        startDate: formatDate(start.toISOString(), 'YYYY-MM-DD'),
        endDate: formatDate(now.toISOString(), 'YYYY-MM-DD'),
        label: i18n.t('shared.date_range_quick_select.k7'),
      };
    case 'last7Days':
      start.setDate(now.getDate() - 6);
      return {
        startDate: formatDate(start.toISOString(), 'YYYY-MM-DD'),
        endDate: formatDate(now.toISOString(), 'YYYY-MM-DD'),
        label: i18n.t('shared.date_range_quick_select.7_8'),
      };
    case 'last30Days':
      start.setDate(now.getDate() - 29);
      return {
        startDate: formatDate(start.toISOString(), 'YYYY-MM-DD'),
        endDate: formatDate(now.toISOString(), 'YYYY-MM-DD'),
        label: i18n.t('shared.date_range_quick_select.30_9'),
      };
    case 'last90Days':
      start.setDate(now.getDate() - 89);
      return {
        startDate: formatDate(start.toISOString(), 'YYYY-MM-DD'),
        endDate: formatDate(now.toISOString(), 'YYYY-MM-DD'),
        label: i18n.t('shared.date_range_quick_select.90_10'),
      };
    default:
      return {
        startDate: '',
        endDate: '',
        label: i18n.t('shared.date_range_quick_select.k11'),
      };
  }
};

const quickRanges = [
  { type: 'today', label: i18n.t('shared.date_range_quick_select.k12'), icon: Calendar },
  { type: 'yesterday', label: i18n.t('shared.date_range_quick_select.k13'), icon: Calendar },
  { type: 'week', label: i18n.t('shared.date_range_quick_select.k14'), icon: Calendar },
  { type: 'lastWeek', label: i18n.t('shared.date_range_quick_select.k15'), icon: Calendar },
  { type: 'month', label: i18n.t('shared.date_range_quick_select.k16'), icon: Calendar },
  { type: 'lastMonth', label: i18n.t('shared.date_range_quick_select.k17'), icon: Calendar },
  { type: 'quarter', label: i18n.t('shared.date_range_quick_select.k18'), icon: Calendar },
  { type: 'year', label: i18n.t('shared.date_range_quick_select.k19'), icon: Calendar },
];

const recentRanges = [
  { type: 'last7Days', label: i18n.t('shared.date_range_quick_select.7_20'), icon: Clock },
  { type: 'last30Days', label: i18n.t('shared.date_range_quick_select.30_21'), icon: Clock },
  { type: 'last90Days', label: i18n.t('shared.date_range_quick_select.90_22'), icon: Clock },
];

export const DateRangeQuickSelect: React.FC<DateRangeQuickSelectProps> = ({
  value,
  onChange,
  label,
  placeholder = i18n.t('shared.date_range_quick_select.k23'),
  sx,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleRangeSelect = (type: string) => {
    const range = getDateRange(type);
    onChange(range);
    handleClose();
  };

  const open = Boolean(anchorEl);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, ...sx }}>
      {label && (
        <Typography
          variant='body2'
          sx={{ fontWeight: 500 }}
        >
          {label}
        </Typography>
      )}
      <Button
        variant='outlined'
        fullWidth
        onClick={handleClick}
        sx={{
          justifyContent: 'flex-start',
          textTransform: 'none',
          padding: `${designTokens.spacing.sm} 12px`,
          minHeight: 36,
        }}
      >
        <Calendar
          size={18}
          sx={{ mr: 1, color: 'text.secondary' }}
        />
        {value?.label ? (
          <Box
            sx={{ display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'space-between' }}
          >
            <Typography variant='body2'>
              {value.label} ({value.startDate} ~ {value.endDate})
            </Typography>
            <ChevronDown size={16} />
          </Box>
        ) : (
          <Box
            sx={{ display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'space-between' }}
          >
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary' }}
            >
              {placeholder}
            </Typography>
            <ChevronDown size={16} />
          </Box>
        )}
      </Button>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        sx={{
          '& .MuiPaper-root': {
            borderRadius: 1,
            minWidth: 200,
            boxShadow: 2,
          },
        }}
      >
        <Box sx={{ p: 1 }}>
          <Typography
            variant='caption'
            sx={{ px: 2, color: 'text.secondary' }}
          >
            {i18n.t('components.date_range_quick_select.k0')}
          </Typography>
          {quickRanges.map((range) => (
            <Button
              key={range.type}
              fullWidth
              onClick={() => handleRangeSelect(range.type)}
              sx={{
                justifyContent: 'flex-start',
                textTransform: 'none',
                py: 1.5,
                px: 2,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <range.icon
                size={16}
                sx={{ mr: 1.5, color: 'text.secondary' }}
              />
              <Typography variant='body2'>{range.label}</Typography>
            </Button>
          ))}

          <Divider sx={{ my: 1 }} />

          <Typography
            variant='caption'
            sx={{ px: 2, color: 'text.secondary' }}
          >
            {i18n.t('components.date_range_quick_select.k1')}
          </Typography>
          {recentRanges.map((range) => (
            <Button
              key={range.type}
              fullWidth
              onClick={() => handleRangeSelect(range.type)}
              sx={{
                justifyContent: 'flex-start',
                textTransform: 'none',
                py: 1.5,
                px: 2,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <range.icon
                size={16}
                sx={{ mr: 1.5, color: 'text.secondary' }}
              />
              <Typography variant='body2'>{range.label}</Typography>
            </Button>
          ))}
        </Box>
      </Popover>
    </Box>
  );
};

export default DateRangeQuickSelect;
