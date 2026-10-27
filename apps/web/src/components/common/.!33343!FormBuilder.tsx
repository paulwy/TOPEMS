import React, { useCallback } from 'react';
import {
  TextField,
  Select,
  MenuItem,
  FormControl,
  FormControlLabel,
  FormLabel,
  Checkbox,
  Card,
  CardContent,
  CardHeader,
  InputLabel,
  Box,
  Button,
  Autocomplete,
  Typography,
} from '@mui/material';
import i18n from '@/i18n';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { enUS, zhCN } from '@mui/x-date-pickers/locales';
import dayjs from 'dayjs';

export type ValidationRule<T extends Record<string, unknown> = Record<string, unknown>> =
  | {
      type: 'required';
      message?: string;
    }
  | {
      type: 'minLength';
      value: number;
      message?: string;
    }
  | {
      type: 'maxLength';
      value: number;
      message?: string;
    }
  | {
      type: 'min';
      value: number;
      message?: string;
    }
  | {
      type: 'max';
      value: number;
      message?: string;
    }
  | {
      type: 'pattern';
      value: RegExp;
      message?: string;
    }
  | {
      type: 'email';
      message?: string;
    }
  | {
      type: 'url';
      message?: string;
    }
  | {
      type: 'phone';
      message?: string;
    }
  | {
      type: 'custom';
      validate: (value: unknown, formValues: T) => string | null;
      message?: string;
    };

type FieldVisibility<T extends Record<string, unknown> = Record<string, unknown>> =
  boolean | ((values: T) => boolean);

type FieldDisabled<T extends Record<string, unknown> = Record<string, unknown>> =
  boolean | ((values: T) => boolean);

export interface FormFieldConfig<T extends Record<string, unknown> = Record<string, unknown>> {
  name: string;
  label: string;
  type:
    | 'text'
    | 'email'
    | 'password'
    | 'number'
    | 'textarea'
    | 'select'
    | 'autocomplete'
    | 'checkbox'
    | 'checkbox-group'
    | 'radio'
    | 'date'
    | 'datetime'
    | 'file'
    | 'switch';
  placeholder?: string;
  required?: boolean | ((values: T) => boolean);
  disabled?: FieldDisabled<T>;
  visible?: FieldVisibility<T>;
  defaultValue?: unknown;
  options?: { value: string | number; label: string }[];
  optionsAsync?: (search: string) => Promise<{ value: string | number; label: string }[]>;
  validation?: ValidationRule<T>[];
  colSpan?: number;
  dependsOn?: string[];
  onChange?: (name: string, value: unknown, values: T) => void;
  render?: (props: {
    name: string;
    value: unknown;
    onChange: (value: unknown) => void;
    isRequired: boolean;
    isDisabled: boolean;
    errors: Record<string, string>;
    formValues: T;
  }) => React.ReactNode;
}

type FormBuilderMode = 'create' | 'edit' | 'view';

/** 表单分组配置 */
export interface FormSectionConfig {
  title: string;
  fields: string[];
}

interface FormBuilderConfig<T extends Record<string, unknown> = Record<string, unknown>> {
  fields: FormFieldConfig<T>[];
  onSubmit: (values: T) => Promise<void> | void;
  submitLabel?: string;
  resetLabel?: string;
  showReset?: boolean;
  title?: string;
  initialValues?: Partial<T>;
  colCount?: number;
  onFieldChange?: (name: string, value: unknown, values: T) => void;
  /** 提交成功后回调（onSubmit 不抛异常即视为成功） */
  onSubmitSuccess?: () => void;
  /** 重置/取消按钮回调，默认只清空表单 */
  onReset?: () => void;
  /** 表单模式：create=新建（默认）, edit=编辑（字段级 disabled 生效）, view=只读（全部禁用，隐藏提交按钮） */
  mode?: FormBuilderMode;
  /** 表单分组配置 */
  formSections?: FormSectionConfig[];
}

export default function FormBuilder<T extends Record<string, unknown> = Record<string, unknown>>({
  fields,
  onSubmit,
  submitLabel = i18n.t('shared.form_builder.k0'),
  resetLabel = i18n.t('shared.form_builder.k1'),
  showReset = true,
  title,
  initialValues = {},
  colCount = 2,
  onFieldChange,
  onSubmitSuccess,
  onReset,
  mode = 'create',
  formSections,
}: FormBuilderConfig<T>) {
  const [values, setValues] = React.useState<T>(() => {
    const initial: Record<string, unknown> = {};
    fields.forEach((field) => {
      initial[field.name] =
        (initialValues as Record<string, unknown>)[field.name] ?? field.defaultValue ?? '';
    });
    return initial as T;
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [asyncOptions, setAsyncOptions] = React.useState<
    Record<string, { value: string | number; label: string }[]>
  >({});

