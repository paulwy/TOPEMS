import React from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { FormControl, FormHelperText } from '@mui/material';
import {
  DateRangePicker,
  type DateRange,
  type DateRangePickerLocale,
} from '@topems/shared-components';
import i18n from '@/i18n';

interface FormDateRangePickerProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  minDate?: Date;
  maxDate?: Date;
  presets?: { label: string; days: number }[];
  locale?: DateRangePickerLocale;
}

export function FormDateRangePicker<T extends FieldValues>({
  name,
  control,
  placeholder,
  required,
  disabled,
  fullWidth = true,
  minDate,
  maxDate,
  presets,
  locale,
}: FormDateRangePickerProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={{
        required: required ? i18n.t('components.form_date_range_picker.k0') : false,
        validate: (value: DateRange | undefined) => {
          if (!required) return true;
          if (!value?.startDate || !value?.endDate) {
            return i18n.t('components.form_date_range_picker.k1');
          }
          if (value.startDate > value.endDate) {
            return i18n.t('components.form_date_range_picker.k2');
          }
          return true;
        },
      }}
      render={({ field: { value, onChange }, fieldState: { error } }) => (
        <FormControl
          fullWidth={fullWidth}
          error={!!error}
        >
          <DateRangePicker
            value={value || { startDate: null, endDate: null }}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            fullWidth={fullWidth}
            minDate={minDate}
            maxDate={maxDate}
            presets={presets}
            locale={locale}
          />
          {error && <FormHelperText>{error.message}</FormHelperText>}
        </FormControl>
      )}
    />
  );
}
