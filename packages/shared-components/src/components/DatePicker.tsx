import React from 'react';
import type { TextFieldProps, FormControlProps } from '@mui/material';
import { type Dayjs } from 'dayjs';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker as MuiDatePicker } from '@mui/x-date-pickers/DatePicker';

export interface DatePickerProps {
  name: string;
  label: string;
  value?: Dayjs | null;
  onChange?: (value: Dayjs | null) => void;
  compact?: boolean;
  sx?: FormControlProps['sx'];
  inputSx?: TextFieldProps['sx'];
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  minDate?: Dayjs;
  maxDate?: Dayjs;
  format?: string;
  readOnly?: boolean;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  name,
  label,
  value,
  onChange,
  compact = true,
  sx,
  inputSx,
  disabled,
  error,
  helperText,
  minDate,
  maxDate,
  format,
  readOnly,
}) => {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <MuiDatePicker
        label={label}
        value={value}
        onChange={onChange}
        disabled={disabled}
        minDate={minDate}
        maxDate={maxDate}
        format={format}
        readOnly={readOnly}
        slotProps={{
          textField: {
            name,
            size: compact ? 'small' : 'medium',
            error,
            helperText,
            sx: {
              '& .MuiFormHelperText-root': {
                marginTop: 0.5,
              },
              ...inputSx,
            },
          },
        }}
        sx={sx}
      />
    </LocalizationProvider>
  );
};

export default DatePicker;