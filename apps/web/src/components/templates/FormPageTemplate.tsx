import React, { useState, useCallback } from "react";
import type { BoxProps } from "@mui/material";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  Tooltip,
  Divider,
  Skeleton,
  Alert,
  Collapse,
  useTheme,
  useMediaQuery,
  FormControl,
  FormLabel,
  FormHelperText,
  Grid,
} from "@mui/material";
import {
  Save,
  X,
  ChevronDown,
  ChevronUp,
  Info,
  AlertCircle,
} from "lucide-react";
import { useForm, Controller, FormProvider, type FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import type { BreadcrumbItem } from "./PageHeader";
import { PageHeader } from "./PageHeader";

// ============ 类型定义 ============

export interface FormField {
  name: string;
  label: string;
  type:
    | "text"
    | "number"
    | "email"
    | "password"
    | "textarea"
    | "select"
    | "date"
    | "checkbox"
    | "switch"
    | "autocomplete";
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  defaultValue?: any;
  options?: Array<{ label: string; value: any }>;
  span?: number;
  rows?: number;
  helperText?: string;
  validation?: z.ZodTypeAny;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export interface FormPageTemplateProps extends Omit<BoxProps, "onSubmit"> {
  // 页面信息
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];

  // 表单配置
  sections: FormSection[];
  schema?: z.ZodType;
  defaultValues?: Record<string, any>;

  // 状态
  loading?: boolean;
  submitting?: boolean;
  error?: string;
  success?: string;

  // 操作
  onSubmit: (data: any) => Promise<void> | void;
  onCancel?: () => void;
  onReset?: () => void;
  submitText?: string;
  cancelText?: string;
  resetText?: string;

  // 布局
  columns?: number;
  stickyFooter?: boolean;

  // 子组件
  headerContent?: React.ReactNode;
  footerContent?: React.ReactNode;
}

// ============ 表单页模板组件 ============

export const FormPageTemplate: React.FC<FormPageTemplateProps> = ({
  title,
  subtitle,
  breadcrumbs,
  sections,
  schema,
  defaultValues,
  loading,
  submitting,
  error,
  success,
  onSubmit,
  onCancel,
  onReset,
  submitText = "保存",
  cancelText = "取消",
  resetText = "重置",
  columns = 3,
  stickyFooter = true,
  headerContent,
  footerContent,
  ...props
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(
      sections.filter((s) => s.defaultExpanded !== false).map((s) => s.id),
    ),
  );

  // 表单初始化
  const methods = useForm({
    resolver: schema ? (zodResolver(schema as z.ZodType) as any) : undefined,
    defaultValues: defaultValues || {},
    mode: "onBlur",
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = methods;

  // 处理提交
  const handleFormSubmit = useCallback(
    async (data: any) => {
      try {
        await onSubmit(data);
      } catch (err) {
        console.error("Form submit error:", err);
      }
    },
    [onSubmit],
  );

  // 处理重置
  const handleReset = useCallback(() => {
    reset();
    onReset?.();
  }, [reset, onReset]);

  // 切换区块展开
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

  // 渲染字段
  const renderField = (field: FormField) => {
    const fieldError = errors[field.name];
    const errorMessage = fieldError?.message as string | undefined;

    const commonProps = {
      label: field.label,
      placeholder: field.placeholder,
      disabled: field.disabled || submitting,
      error: !!fieldError,
      helperText: errorMessage || field.helperText,
      size: "small" as const,
      fullWidth: true,
    };

    return (
      <Controller
        key={field.name}
        name={field.name}
        control={control}
        defaultValue={field.defaultValue || ""}
        render={({ field: controllerField }) => {
          switch (field.type) {
            case "textarea":
              return (
                <TextField
                  {...commonProps}
                  {...controllerField}
                  multiline
                  rows={field.rows || 4}
                />
              );

            case "select":
              return (
                <TextField {...commonProps} {...controllerField} select>
                  <option value="">请选择</option>
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </TextField>
              );

            case "number":
              return (
                <TextField
                  {...commonProps}
                  {...controllerField}
                  type="number"
                  onChange={(e) =>
                    controllerField.onChange(Number(e.target.value))
                  }
                />
              );

            case "date":
              return (
                <TextField
                  {...commonProps}
                  {...controllerField}
                  type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              );

            case "email":
              return (
                <TextField
                  {...commonProps}
                  {...controllerField}
                  type="email"
                  autoComplete="email"
                />
              );

            case "password":
              return (
                <TextField
                  {...commonProps}
                  {...controllerField}
                  type="password"
                  autoComplete="new-password"
                />
              );

            default:
              return <TextField {...commonProps} {...controllerField} />;
          }
        }}
      />
    );
  };

  // 渲染区块
  const renderSection = (section: FormSection) => {
    const isExpanded = expandedSections.has(section.id);

    return (
      <Paper
        key={section.id}
        sx={{ borderRadius: 2, mb: 3, overflow: "hidden" }}
      >
        {/* 区块标题 */}
        <Box
          sx={{
            p: 2,
            borderBottom: 1,
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: section.collapsible ? "pointer" : "default",
          }}
          onClick={() => section.collapsible && toggleSection(section.id)}
        >
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {section.title}
            </Typography>
            {section.description && (
              <Typography variant="caption" color="text.secondary">
                {section.description}
              </Typography>
            )}
          </Box>
          {section.collapsible && (
            <IconButton size="small">
              {isExpanded ? (
                <ChevronUp style={{ width: 18, height: 18 }} />
              ) : (
                <ChevronDown style={{ width: 18, height: 18 }} />
              )}
            </IconButton>
          )}
        </Box>

        {/* 区块内容 */}
        <Collapse in={isExpanded}>
          <Box sx={{ p: 3 }}>
            {loading ? (
              <Grid container spacing={2}>
                {section.fields.map((field) => (
                  <Grid
                    key={field.name}
                    size={{
                      xs: 12,
                      sm: 6,
                      md: Math.floor(12 / columns) * (field.span || 1),
                    }}
                  >
                    <Skeleton
                      variant="rectangular"
                      height={56}
                      sx={{ borderRadius: 1 }}
                    />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Grid container spacing={2}>
                {section.fields.map((field) => (
                  <Grid
                    key={field.name}
                    size={{
                      xs: 12,
                      sm: 6,
                      md: Math.floor(12 / columns) * (field.span || 1),
                    }}
                  >
                    {renderField(field)}
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </Collapse>
      </Paper>
    );
  };

  // 渲染底部操作栏
  const renderFooter = () => (
    <Paper
      sx={{
        p: 2,
        borderRadius: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        position: stickyFooter ? "sticky" : "static",
        bottom: stickyFooter ? 0 : "auto",
        zIndex: 10,
        mt: 3,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        {isDirty && (
          <Typography variant="caption" color="text.secondary">
            有未保存的更改
          </Typography>
        )}
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {onCancel && (
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={submitting}
            startIcon={<X style={{ width: 16, height: 16 }} />}
          >
            {cancelText}
          </Button>
        )}
        {onReset && (
          <Button
            variant="text"
            onClick={handleReset}
            disabled={submitting || !isDirty}
          >
            {resetText}
          </Button>
        )}
        <Button
          type="submit"
          variant="contained"
          disabled={submitting || loading}
          startIcon={
            submitting ? (
              <Skeleton variant="circular" width={16} height={16} />
            ) : (
              <Save style={{ width: 16, height: 16 }} />
            )
          }
        >
          {submitting ? "保存中..." : submitText}
        </Button>
      </Box>
    </Paper>
  );

  return (
    <FormProvider {...methods}>
      <Box {...props}>
        {/* 页面头部 */}
        <PageHeader
          title={title}
          subtitle={subtitle}
          breadcrumbs={breadcrumbs}
          loading={loading}
        >
          {headerContent}
        </PageHeader>

        {/* 错误提示 */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* 成功提示 */}
        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {success}
          </Alert>
        )}

        {/* 表单 */}
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          {sections.map(renderSection)}
          {renderFooter()}
        </form>

        {/* 自定义底部内容 */}
        {footerContent}
      </Box>
    </FormProvider>
  );
};

export default FormPageTemplate;
