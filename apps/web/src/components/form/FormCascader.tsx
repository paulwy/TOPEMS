import React from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { FormControl, FormHelperText } from '@mui/material';
import { Cascader, type CascaderOption, type CascaderLocale } from '@topems/shared-components';

interface FormCascaderProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label?: string;
  options: CascaderOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  multiple?: boolean;
  maxTagCount?: number;
  locale?: CascaderLocale;
}

export function FormCascader<T extends FieldValues>({
  name,
  control,
  options,
  placeholder,
  required,
  disabled,
  fullWidth = true,
  multiple,
  maxTagCount,
  locale,
}: FormCascaderProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={{
        required: required ? '此项为必填项' : false,
      }}
      render={({ field: { value, onChange }, fieldState: { error } }) => (
        <FormControl fullWidth={fullWidth} error={!!error}>
          <Cascader
            value={value || []}
            onChange={onChange}
            options={options}
            placeholder={placeholder}
            disabled={disabled}
            fullWidth={fullWidth}
            multiple={multiple}
            maxTagCount={maxTagCount}
            locale={locale}
          />
          {error && <FormHelperText>{error.message}</FormHelperText>}
        </FormControl>
      )}
    />
  );
}
