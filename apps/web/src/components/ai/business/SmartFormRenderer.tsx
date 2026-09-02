import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { Grid } from '@/components/common';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Error from '@mui/icons-material/Error';
import Save from '@mui/icons-material/Save';
import Send from '@mui/icons-material/Send';

export interface FormFieldDefinition {
  field_id: string;
  name: string;
  label: string;
  field_type: string;
  description?: string;
  placeholder?: string;
  default_value?: any;
  required?: boolean;
  read_only?: boolean;
  hidden?: boolean;
  options?: Array<{ value: string; label: string }>;
  group?: string;
  order?: number;
  validation?: {
    min_length?: number;
    max_length?: number;
    min_value?: number;
    max_value?: number;
    pattern?: string;
    error_message?: string;
  };
}

export interface FormDefinition {
  form_id: string;
  name: string;
  description?: string;
  category?: string;
  fields: FormFieldDefinition[];
}

export interface FormValidationError {
  field_id: string;
  message: string;
}

interface SmartFormRendererProps {
  form: FormDefinition;
  initialValues?: Record<string, any>;
  onSubmit?: (values: Record<string, any>) => void;
  onSaveDraft?: (values: Record<string, any>) => void;
  onValuesChange?: (values: Record<string, any>) => void;
  readOnly?: boolean;
  showActions?: boolean;
}

export const SmartFormRenderer: React.FC<SmartFormRendererProps> = ({
  form,
  initialValues = {},
  onSubmit,
  onSaveDraft,
  onValuesChange,
  readOnly = false,
  showActions = true,
}) => {
  const theme = useTheme();
  const [values, setValues] = useState<Record<string, any>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const groupedFields = useMemo(() => {
    const groups: Record<string, FormFieldDefinition[]> = {};
    form.fields
      .filter((f) => !f.hidden)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .forEach((field) => {
        const group = field.group || '基本信息';
        if (!groups[group]) {
          groups[group] = [];
        }
        groups[group].push(field);
      });
    return groups;
  }, [form.fields]);

  const validateField = (field: FormFieldDefinition, value: any): string | null => {
    if (field.required && (value === undefined || value === null || value === '')) {
      return `${field.label} 为必填项`;
    }

    if (value && field.validation) {
      if (field.validation.min_length && typeof value === 'string' && value.length < field.validation.min_length) {
        return field.validation.error_message || `${field.label} 最少需要 ${field.validation.min_length} 个字符`;
      }
      if (field.validation.max_length && typeof value === 'string' && value.length > field.validation.max_length) {
        return field.validation.error_message || `${field.label} 最多 ${field.validation.max_length} 个字符`;
      }
      if (field.validation.min_value && typeof value === 'number' && value < field.validation.min_value) {
        return field.validation.error_message || `${field.label} 不能小于 ${field.validation.min_value}`;
      }
      if (field.validation.max_value && typeof value === 'number' && value > field.validation.max_value) {
        return field.validation.error_message || `${field.label} 不能大于 ${field.validation.max_value}`;
      }
    }

    return null;
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    const newValues = { ...values, [fieldId]: value };
    setValues(newValues);
    onValuesChange?.(newValues);

    if (submitted) {
      const field = form.fields.find((f) => f.field_id === fieldId);
      if (field) {
        const error = validateField(field, value);
        setErrors((prev) => {
          const next = { ...prev };
          if (error) {
            next[fieldId] = error;
          } else {
            delete next[fieldId];
          }
          return next;
        });
      }
    }
  };

  const validateAll = (): boolean => {
    const newErrors: Record<string, string> = {};
    form.fields
      .filter((f) => !f.hidden && !f.read_only)
      .forEach((field) => {
        const error = validateField(field, values[field.field_id]);
        if (error) {
          newErrors[field.field_id] = error;
        }
      });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    setSubmitted(true);
    if (validateAll()) {
      onSubmit?.(values);
    }
  };

  const handleSaveDraft = () => {
    onSaveDraft?.(values);
  };

  const renderField = (field: FormFieldDefinition) => {
    const value = values[field.field_id] ?? field.default_value ?? '';
    const error = errors[field.field_id];
    const disabled = readOnly || field.read_only;

    const commonProps = {
      fullWidth: true,
      size: 'small' as const,
      disabled,
      error: !!error,
      helperText: error || field.description,
      value,
      onChange: (e: any) => handleFieldChange(field.field_id, e.target.value),
    };

    switch (field.field_type) {
      case 'textarea':
      case 'richtext':
        return (
          <TextField
            {...commonProps}
            label={field.label}
            placeholder={field.placeholder}
            multiline
            rows={4}
            required={field.required}
          />
        );

      case 'number':
      case 'integer':
      case 'decimal':
        return (
          <TextField
            {...commonProps}
            label={field.label}
            placeholder={field.placeholder}
            type="number"
            required={field.required}
            slotProps={{
              htmlInput: {
                step: field.field_type === 'integer' ? 1 : 'any',
              },
            }}
          />
        );

      case 'date':
        return (
          <TextField
            {...commonProps}
            label={field.label}
            type="date"
            required={field.required}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        );

      case 'datetime':
        return (
          <TextField
            {...commonProps}
            label={field.label}
            type="datetime-local"
            required={field.required}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        );

      case 'boolean':
      case 'checkbox':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={!!value}
                onChange={(e) => handleFieldChange(field.field_id, e.target.checked)}
                disabled={disabled}
              />
            }
            label={field.label}
          />
        );

      case 'select':
      case 'radio':
        return (
          <FormControl fullWidth size="small" error={!!error} disabled={disabled}>
            <InputLabel>{field.label}{field.required && ' *'}</InputLabel>
            <Select
              value={value}
              label={`${field.label}${field.required ? ' *' : ''}`}
              onChange={(e) => handleFieldChange(field.field_id, e.target.value)}
            >
              {field.options?.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
            {error && <FormHelperText>{error}</FormHelperText>}
          </FormControl>
        );

      case 'multiselect':
        return (
          <TextField
            {...commonProps}
            label={field.label}
            placeholder={field.placeholder}
            required={field.required}
            value={Array.isArray(value) ? value.join(', ') : value}
          />
        );

      case 'email':
        return (
          <TextField
            {...commonProps}
            label={field.label}
            placeholder={field.placeholder || 'example@email.com'}
            type="email"
            required={field.required}
          />
        );

      case 'phone':
        return (
          <TextField
            {...commonProps}
            label={field.label}
            placeholder={field.placeholder || '请输入手机号'}
            type="tel"
            required={field.required}
          />
        );

      case 'url':
        return (
          <TextField
            {...commonProps}
            label={field.label}
            placeholder={field.placeholder || 'https://'}
            type="url"
            required={field.required}
          />
        );

      case 'password':
        return (
          <TextField
            {...commonProps}
            label={field.label}
            placeholder={field.placeholder}
            type="password"
            required={field.required}
          />
        );

      case 'calculated':
        return (
          <TextField
            {...commonProps}
            label={field.label}
            value={value}
            slotProps={{ input: { readOnly: true } }}
            required={false}
          />
        );

      default:
        return (
          <TextField
            {...commonProps}
            label={field.label}
            placeholder={field.placeholder}
            required={field.required}
          />
        );
    }
  };

  const errorCount = Object.keys(errors).length;

  return (
    <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
          {form.name}
        </Typography>
        {form.description && (
          <Typography variant="body2" color="text.secondary">
            {form.description}
          </Typography>
        )}
      </Box>

      {submitted && errorCount > 0 && (
        <Alert severity="error" sx={{ mb: 2 }} icon={<Error />}>
          表单包含 {errorCount} 个错误，请检查后重新提交。
        </Alert>
      )}

      {submitted && errorCount === 0 && (
        <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircle />}>
          表单验证通过！
        </Alert>
      )}

      {Object.entries(groupedFields).map(([group, fields], groupIndex) => (
        <Box key={group} sx={{ mb: groupIndex < Object.keys(groupedFields).length - 1 ? 3 : 0 }}>
          {groupIndex > 0 && <Divider sx={{ mb: 2 }} />}
          <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600, mb: 1.5 }}>
            {group}
          </Typography>
          <Grid container spacing={2}>
            {fields.map((field) => (
              <Grid
                item
                xs={12}
                sm={field.field_type === 'textarea' || field.field_type === 'richtext' ? 12 : 6}
                key={field.field_id}
              >
                {renderField(field)}
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}

      {showActions && !readOnly && (
        <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          {onSaveDraft && (
            <Button
              variant="outlined"
              startIcon={<Save />}
              onClick={handleSaveDraft}
            >
              保存草稿
            </Button>
          )}
          {onSubmit && (
            <Button
              variant="contained"
              startIcon={<Send />}
              onClick={handleSubmit}
            >
              提交
            </Button>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default SmartFormRenderer;
