import React from 'react';
import type { SxProps, Theme } from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker as MuiDatePicker, type DatePickerProps as MuiDatePickerProps } from '@mui/x-date-pickers/DatePicker';

export interface DatePickerProps extends Omit<MuiDatePickerProps, 'renderInput'> {
  name: string;
  label: string;
  compact?: boolean;
  sx?: SxProps<Theme>;
  inputSx?: SxProps<Theme>;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  name,
  label,
  compact = true,
  sx,
  inputSx,
  ...props
}) => {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <MuiDatePicker
        {...props}
        label={label}
        slotProps={{
          textField: {
            name,
            size: compact ? 'small' : 'medium',
            sx: {
              '& .MuiFormHelperText-root': {
                marginTop: 0.5,
              },
              ...inputSx,
              ...sx,
            } as SxProps<Theme>,
          },
        }}
      />
    </LocalizationProvider>
  );
};

export default DatePicker;
