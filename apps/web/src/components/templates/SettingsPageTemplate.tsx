import React, { useState, useCallback, useEffect } from 'react';
import type { BoxProps } from '@mui/material';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Switch,
  Select,
  MenuItem,
  FormControl,
  FormLabel,
  FormHelperText,
  InputLabel,
  IconButton,
  Tooltip,
  Skeleton,
  useTheme,
  useMediaQuery,
  Alert,
  Tabs,
  Tab,
  Chip,
} from '@mui/material';
import {
  Save,
  RotateCcw,
  Info,
  CheckCircle,
  AlertCircle,
  X,
  ChevronRight,
  Settings,
} from 'lucide-react';
import type { BreadcrumbItem } from './PageHeader';
import { PageHeader } from './PageHeader';

// ============ 类型定义 ============

export type SettingValueType = string | number | boolean | string[];

export interface SettingOption {
  label: string;
  value: SettingValueType;
  description?: string;
  disabled?: boolean;
}

export interface SettingField {
  id: string;
  label: string;
  description?: string;
  type: 'text' | 'number' | 'password' | 'textarea' | 'select' | 'switch' | 'checkbox';
  value: SettingValueType;
  defaultValue?: SettingValueType;
  options?: SettingOption[];
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  helperText?: string;
  validation?: (value: SettingValueType) => string | boolean;
  onChange?: (value: SettingValueType) => void;
  icon?: React.ReactNode;
}

export interface SettingSection {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'success' | 'info';
  fields: SettingField[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export interface SettingTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  sections: SettingSection[];
}

export interface SettingsPageTemplateProps extends BoxProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];

  tabs?: SettingTab[];
  sections?: SettingSection[];

  loading?: boolean;
  saving?: boolean;
  error?: string;
  success?: string;

  onSave?: (data: Record<string, SettingValueType>) => Promise<void> | void;
  onReset?: () => void;

  showSaveButton?: boolean;
  showResetButton?: boolean;
  saveButtonText?: string;
  resetButtonText?: string;

  stickyFooter?: boolean;

  headerContent?: React.ReactNode;
  footerContent?: React.ReactNode;
}

// ============ 设置页模板组件 ============

export const SettingsPageTemplate: React.FC<SettingsPageTemplateProps> = ({
  title,
  subtitle,
  breadcrumbs,
  tabs,
  sections: externalSections,
  loading,
  saving,
  error,
  success,
  onSave,
  onReset,
  showSaveButton = true,
  showResetButton = true,
  saveButtonText = '保存设置',
  resetButtonText = '重置',
  stickyFooter = true,
  headerContent,
  footerContent,
  ...props
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [activeTab, setActiveTab] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [values, setValues] = useState<Record<string, SettingValueType>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const allSections = tabs ? tabs[activeTab]?.sections : externalSections || [];

  useEffect(() => {
    const initialValues: Record<string, SettingValueType> = {};
    allSections.forEach((section) => {
      section.fields.forEach((field) => {
        initialValues[field.id] = field.value;
      });
    });
    setValues(initialValues);
    setErrors({});
    setHasChanges(false);
  }, [allSections]);

  const handleFieldChange = useCallback(
    (fieldId: string, value: SettingValueType) => {
      setValues((prev) => ({ ...prev, [fieldId]: value }));
      setHasChanges(true);

      const field = allSections.flatMap((s) => s.fields).find((f) => f.id === fieldId);

      if (field?.validation) {
        const validationResult = field.validation(value);
        if (typeof validationResult === 'string') {
          setErrors((prev) => ({ ...prev, [fieldId]: validationResult }));
        } else {
          setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[fieldId];
            return newErrors;
          });
        }
      }
    },
    [allSections]
  );

  const handleSave = useCallback(async () => {
    let isValid = true;
    const newErrors: Record<string, string> = {};

    allSections.forEach((section) => {
      section.fields.forEach((field) => {
        if (field.validation) {
          const validationResult = field.validation(values[field.id]);
          if (typeof validationResult === 'string') {
            isValid = false;
            newErrors[field.id] = validationResult;
          }
        }
        if (field.required && !values[field.id]) {
          isValid = false;
          newErrors[field.id] = `${field.label}不能为空`;
        }
      });
    });

    if (!isValid) {
      setErrors(newErrors);
      return;
    }

    try {
      await onSave?.(values);
      setHasChanges(false);
    } catch (err) {
      setErrors({ __global: err instanceof Error ? err.message : '保存失败' });
    }
  }, [allSections, values, onSave]);

  const handleReset = useCallback(() => {
    const initialValues: Record<string, SettingValueType> = {};
    allSections.forEach((section) => {
      section.fields.forEach((field) => {
        initialValues[field.id] = field.defaultValue ?? field.value;
      });
    });
    setValues(initialValues);
    setErrors({});
    setHasChanges(false);
    onReset?.();
  }, [allSections, onReset]);

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  const getSectionIcon = (icon?: React.ReactNode) => {
    if (icon) return icon;
    return <Settings style={{ width: 20, height: 20 }} />;
  };

  const renderField = (field: SettingField) => {
    const value = values[field.id];
    const error = errors[field.id];
    const isDisabled = field.disabled || loading;

    return (
      <Box
        key={field.id}
        sx={{ mb: 3 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <FormLabel sx={{ fontWeight: 500 }}>
            {field.label}
            {field.required && (
              <Typography
                component='span'
                color='error'
                sx={{ ml: 0.5 }}
              >
                *
              </Typography>
            )}
          </FormLabel>
          {field.description && (
            <Tooltip title={field.description}>
              <IconButton
                size='small'
                aria-label='信息'
              >
                <Info style={{ width: 16, height: 16, color: theme.palette.text.secondary }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {field.type === 'switch' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Switch
              checked={value as boolean}
              onChange={(e) => handleFieldChange(field.id, e.target.checked)}
              disabled={isDisabled}
            />
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {value ? '开启' : '关闭'}
            </Typography>
          </Box>
        )}

        {field.type === 'checkbox' && (
          <Box>
            <Button
              variant='outlined'
              fullWidth
              onClick={() => handleFieldChange(field.id, !value)}
              disabled={isDisabled}
              sx={{ justifyContent: 'flex-start', gap: 2 }}
            >
              <CheckCircle
                style={{
                  width: 20,
                  height: 20,
                  color: value ? theme.palette.success.main : theme.palette.text.secondary,
                }}
              />
              <Typography variant='body2'>{field.label}</Typography>
            </Button>
          </Box>
        )}

        {field.type === 'select' && (
          <FormControl
            fullWidth
            size='small'
            error={!!error}
          >
            <InputLabel>{field.label}</InputLabel>
            <Select
              value={value as string}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              disabled={isDisabled}
              label={field.label}
              error={!!error}
            >
              {field.options?.map((option) => (
                <MenuItem
                  key={String(option.value)}
                  value={option.value as string}
                  disabled={option.disabled}
                >
                  {option.label}
                  {option.description && (
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {option.description}
                    </Typography>
                  )}
                </MenuItem>
              ))}
            </Select>
            {(error || field.helperText) && (
              <FormHelperText error={!!error}>{error || field.helperText}</FormHelperText>
            )}
          </FormControl>
        )}

        {field.type === 'textarea' && (
          <TextField
            fullWidth
            multiline
            rows={4}
            size='small'
            value={value as string}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            disabled={isDisabled}
            placeholder={field.placeholder}
            error={!!error}
            helperText={error || field.helperText}
          />
        )}

        {field.type === 'password' && (
          <TextField
            fullWidth
            type='password'
            size='small'
            value={value as string}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            disabled={isDisabled}
            placeholder={field.placeholder}
            error={!!error}
            helperText={error || field.helperText}
          />
        )}

        {field.type === 'number' && (
          <TextField
            fullWidth
            type='number'
            size='small'
            value={value as number}
            onChange={(e) =>
              handleFieldChange(field.id, e.target.value === '' ? '' : Number(e.target.value))
            }
            disabled={isDisabled}
            placeholder={field.placeholder}
            error={!!error}
            helperText={error || field.helperText}
          />
        )}

        {field.type === 'text' && (
          <TextField
            fullWidth
            size='small'
            value={value as string}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            disabled={isDisabled}
            placeholder={field.placeholder}
            error={!!error}
            helperText={error || field.helperText}
          />
        )}
      </Box>
    );
  };

  const renderSection = (section: SettingSection) => {
    const isExpanded = expandedSections.has(section.id);

    return (
      <Paper
        key={section.id}
        className='settings-page-section'
        sx={{ borderRadius: 3, mb: 2, overflow: 'hidden' }}
      >
        <Box
          sx={{
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: section.collapsible ? 'pointer' : 'default',
            bgcolor: section.color ? `${section.color}.lighter` : 'inherit',
          }}
          onClick={() => section.collapsible && toggleSection(section.id)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: section.color ? `${section.color}.light` : 'primary.light',
                color: section.color ? `${section.color}.main` : 'primary.main',
              }}
            >
              {getSectionIcon(section.icon)}
            </Box>
            <Box>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600 }}
              >
                {section.title}
              </Typography>
              {section.description && (
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {section.description}
                </Typography>
              )}
            </Box>
          </Box>
          {section.collapsible && (
            <IconButton
              size='small'
              aria-label='展开'
            >
              <ChevronRight
                style={{
                  width: 18,
                  height: 18,
                  transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                }}
              />
            </IconButton>
          )}
        </Box>

        <Box sx={{ p: 3 }}>
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <Skeleton
                key={index}
                variant='rectangular'
                height={48}
                sx={{ borderRadius: 1.5, mb: 2 }}
              />
            ))
          ) : isExpanded || !section.collapsible ? (
            section.fields.map(renderField)
          ) : (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                点击展开查看 {section.fields.length} 个设置项
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
    );
  };

  const renderTabs = () => {
    if (!tabs || tabs.length === 0) return null;

    return (
      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
        sx={{ mb: 3 }}
        variant={isMobile ? 'scrollable' : 'standard'}
        scrollButtons={isMobile}
      >
        {tabs.map((tab, _index) => (
          <Tab
            key={tab.id}
            label={tab.label}
            icon={tab.icon as React.ReactElement | undefined}
            iconPosition={isMobile ? ('start' as const) : ('top' as const)}
          />
        ))}
      </Tabs>
    );
  };

  const renderFooter = () => {
    if (!showSaveButton && !showResetButton) return null;

    return (
      <Paper
        sx={{
          p: 2,
          borderRadius: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          position: stickyFooter ? 'sticky' : 'static',
          bottom: stickyFooter ? 0 : 'auto',
          zIndex: 10,
          mt: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {hasChanges && (
            <Chip
              label='有未保存的更改'
              size='small'
              color='primary'
              sx={{ height: 24 }}
            />
          )}
          {Object.keys(errors).length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', color: 'error.main' }}>
              <AlertCircle style={{ width: 16, height: 16 }} />
              <Typography variant='caption'>
                {Object.keys(errors).length}个设置项存在错误
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {showResetButton && (
            <Button
              variant='outlined'
              className='settings-page-reset-btn'
              onClick={handleReset}
              disabled={saving || loading || !hasChanges}
              startIcon={<RotateCcw style={{ width: 16, height: 16 }} />}
            >
              {resetButtonText}
            </Button>
          )}
          {showSaveButton && (
            <Button
              variant='contained'
              className='settings-page-save-btn'
              onClick={handleSave}
              disabled={saving || loading || !hasChanges}
              startIcon={
                saving ? (
                  <Skeleton
                    variant='circular'
                    width={16}
                    height={16}
                  />
                ) : (
                  <Save style={{ width: 16, height: 16 }} />
                )
              }
            >
              {saving ? '保存中...' : saveButtonText}
            </Button>
          )}
        </Box>
      </Paper>
    );
  };

  return (
    <Box {...props}>
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs}
        loading={loading}
      >
        {headerContent}
      </PageHeader>

      {error && (
        <Alert
          severity='error'
          sx={{ mb: 3 }}
          icon={<AlertCircle style={{ width: 20, height: 20 }} />}
          action={
            <IconButton
              size='small'
              onClick={() => setErrors({})}
              aria-label='关闭'
            >
              <X style={{ width: 16, height: 16 }} />
            </IconButton>
          }
        >
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity='success'
          sx={{ mb: 3 }}
          icon={<CheckCircle style={{ width: 20, height: 20 }} />}
          action={
            <IconButton
              size='small'
              onClick={() => {}}
              aria-label='关闭'
            >
              <X style={{ width: 16, height: 16 }} />
            </IconButton>
          }
        >
          {success}
        </Alert>
      )}

      {renderTabs()}

      {allSections.map(renderSection)}

      {renderFooter()}

      {footerContent}
    </Box>
  );
};

export default SettingsPageTemplate;
