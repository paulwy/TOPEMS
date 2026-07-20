import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Popover,
  TextField,
  Button,
  IconButton,
  Typography,
  Paper,
  Chip,
} from '@mui/material';
import { Calendar, X, ChevronLeft, ChevronRight } from 'lucide-react';

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

export interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (value: DateRange) => void;
  placeholder?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
  presets?: { label: string; days: number }[];
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value = { startDate: null, endDate: null },
  onChange,
  placeholder = '选择日期范围',
  disabled = false,
  fullWidth = false,
  className,
  minDate,
  maxDate,
  presets = [
    { label: '今天', days: 0 },
    { label: '昨天', days: 1 },
    { label: '本周', days: 7 },
    { label: '本月', days: 30 },
    { label: '本季度', days: 90 },
    { label: '本年', days: 365 },
  ],
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tempStartDate, setTempStartDate] = useState(value.startDate);
  const [tempEndDate, setTempEndDate] = useState(value.endDate);

  const open = Boolean(anchorEl);

  const formatDate = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const displayValue = useMemo(() => {
    if (!value.startDate && !value.endDate) return '';
    if (value.startDate && !value.endDate) return formatDate(value.startDate);
    if (!value.startDate && value.endDate) return formatDate(value.endDate);
    return `${formatDate(value.startDate!)} ~ ${formatDate(value.endDate!)}`;
  }, [value]);

  const handleOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (disabled) return;
    setAnchorEl(event.currentTarget);
    setTempStartDate(value.startDate);
    setTempEndDate(value.endDate);
  }, [disabled, value]);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handlePrevMonth = useCallback(() => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentMonth(newDate);
  }, [currentMonth]);

  const handleNextMonth = useCallback(() => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentMonth(newDate);
  }, [currentMonth]);

  const handleDateClick = useCallback((date: Date) => {
    if (minDate && date < minDate) return;
    if (maxDate && date > maxDate) return;

    if (!tempStartDate) {
      setTempStartDate(date);
    } else if (!tempEndDate) {
      if (date >= tempStartDate) {
        setTempEndDate(date);
      } else {
        setTempStartDate(date);
      }
    } else {
      setTempStartDate(date);
      setTempEndDate(null);
    }
  }, [tempStartDate, tempEndDate, minDate, maxDate]);

  const handlePresetClick = useCallback((days: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    setTempStartDate(startDate);
    setTempEndDate(endDate);
  }, []);

  const handleConfirm = useCallback(() => {
    onChange?.({ startDate: tempStartDate, endDate: tempEndDate });
    handleClose();
  }, [tempStartDate, tempEndDate, onChange, handleClose]);

  const handleClear = useCallback(() => {
    onChange?.({ startDate: null, endDate: null });
  }, [onChange]);

  const isDateInRange = (date: Date): boolean => {
    if (!tempStartDate || !tempEndDate) return false;
    return date >= tempStartDate && date <= tempEndDate;
  };

  const isStartDate = (date: Date): boolean => {
    if (!tempStartDate) return false;
    return date.toDateString() === tempStartDate.toDateString();
  };

  const isEndDate = (date: Date): boolean => {
    if (!tempEndDate) return false;
    return date.toDateString() === tempEndDate.toDateString();
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const generateCalendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days: (Date | null)[] = [];
    
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  }, [currentMonth]);

  return (
    <Box className={className}>
      <Box sx={{ position: 'relative' }}>
        <TextField
          onClick={handleOpen}
          value={displayValue}
          placeholder={placeholder}
          disabled={disabled}
          fullWidth={fullWidth}
          slotProps={{
            input: {
              readOnly: true,
            },
          }}
        />
        {value.startDate || value.endDate ? (
          <Chip
            icon={<X size={14} />}
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            sx={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }}
          />
        ) : undefined}
      </Box>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        slotProps={{
          paper: {
            sx: {
              width: 400,
            },
          },
        }}
      >
        <Box sx={{ p: 3 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              快速选择
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outlined"
                  size="small"
                  onClick={() => handlePresetClick(preset.days)}
                >
                  {preset.label}
                </Button>
              ))}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <IconButton onClick={handlePrevMonth} size="small">
              <ChevronLeft size={20} />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
            </Typography>
            <IconButton onClick={handleNextMonth} size="small">
              <ChevronRight size={20} />
            </IconButton>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 3 }}>
            {WEEKDAYS.map((day) => (
              <Typography key={day} variant="caption" sx={{ textAlign: 'center', fontWeight: 600, py: 1 }}>
                {day}
              </Typography>
            ))}
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
            {generateCalendarDays.map((date, index) => {
              if (!date) return <Box key={index} sx={{ aspectRatio: 1 }} />;
              
              const inRange = isDateInRange(date);
              const start = isStartDate(date);
              const end = isEndDate(date);
              const today = isToday(date);
              const disabled = (minDate && date < minDate) || (maxDate && date > maxDate);
              
              return (
                <Button
                  key={date.toISOString()}
                  onClick={() => handleDateClick(date)}
                  disabled={disabled}
                  sx={{
                    aspectRatio: 1,
                    padding: 0,
                    borderRadius: start || end ? '50%' : 0,
                    backgroundColor: start ? 'primary.main' : end ? 'primary.main' : inRange ? 'primary.light' : 'transparent',
                    color: start || end ? 'white' : inRange ? 'primary.contrastText' : today ? 'primary.main' : 'inherit',
                    '&:hover': {
                      backgroundColor: 'primary.light',
                    },
                    '&.Mui-disabled': {
                      opacity: 0.3,
                    },
                  }}
                >
                  {date.getDate()}
                </Button>
              );
            })}
          </Box>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button onClick={handleClose}>取消</Button>
            <Button onClick={handleConfirm} variant="contained">确定</Button>
          </Box>
        </Box>
      </Popover>
    </Box>
  );
};

export { DateRangePicker };