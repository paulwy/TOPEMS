import React from 'react';
import type { TextFieldProps, FormControlProps } from '@mui/material';
import { TextField } from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker as MuiDatePicker, type DatePickerProps as MuiDatePickerProps } from '@mui/x-date-pickers/DatePicker';

export interface DatePickerProps extends Omit<MuiDatePickerProps<Date>, 'renderInput'> {
  name: string;
  label: string;
  compact?: boolean;
  sx?: FormControlProps['sx'];
  inputSx?: TextFieldProps['sx'];
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
        renderInput={(params) => (
          <TextField
            {...params}
            name={name}
            size={compact ? 'small' : 'medium'}
            sx={{
              '& .MuiFormHelperText-root': {
                marginTop: 0.5,
              },
              ...inputSx,
            }}
          />
        )}
        slotProps={{
          textField: {
            sx,
          },
        }}
      />
    </LocalizationProvider>
  );
};

export default DatePicker;