import React from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { FormControl, FormHelperText } from '@mui/material';
import { FileUpload, type UploadFile, type FileUploadLocale } from '@topems/shared-components';
import i18n from '@/i18n';

interface FormFileUploadProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label?: string;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  maxFiles?: number;
  required?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  onUpload?: (files: File[]) => Promise<void>;
  locale?: FileUploadLocale;
}

export function FormFileUpload<T extends FieldValues>({
  name,
  control,
  accept,
  multiple = true,
  maxSize = 10 * 1024 * 1024,
  maxFiles = 10,
  required,
  disabled,
  fullWidth = true,
  onUpload,
  locale,
}: FormFileUploadProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={{
        required: required ? i18n.t('components.form_file_upload.k0') : false,
        validate: (value: UploadFile[] | undefined) => {
          if (!required) return true;
          if (!value || value.length === 0) {
            return i18n.t('components.form_file_upload.k1');
          }
          const hasError = value.some((f) => f.status === 'error');
          if (hasError) {
            return i18n.t('components.form_file_upload.k2');
          }
          const allCompleted = value.every((f) => f.status === 'completed');
          if (!allCompleted) {
            return i18n.t('components.form_file_upload.k3');
          }
          return true;
        },
      }}
      render={({ field: { value, onChange }, fieldState: { error } }) => (
        <FormControl
          fullWidth={fullWidth}
          error={!!error}
        >
          <FileUpload
            files={value || []}
            onChange={onChange}
            onUpload={onUpload}
            accept={accept}
            multiple={multiple}
            maxSize={maxSize}
            maxFiles={maxFiles}
            disabled={disabled}
            fullWidth={fullWidth}
            locale={locale}
          />
          {error && <FormHelperText>{error.message}</FormHelperText>}
        </FormControl>
      )}
    />
  );
}
