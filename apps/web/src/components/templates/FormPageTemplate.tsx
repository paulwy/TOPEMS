import React, { useState, useCallback, useEffect, useMemo } from "react";
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
  Snackbar,
  Alert as MuiAlert,
  Slide,
  Chip,
  Badge,
  LinearProgress,
  Tab,
  Tabs,
} from "@mui/material";
import { Grid } from "@/components/Grid";
import {
  Save,
  X,
  ChevronDown,
  ChevronUp,
  Info,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  FileText,
  History,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  GripVertical,
  Plus,
  Minus,
} from "lucide-react";
import {
  useForm,
  Controller,
  FormProvider,
  useWatch,
  type FieldValues,
  type UseFormReturn,
  type FieldErrors,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import type { BreadcrumbItem } from "./PageHeader";
import { PageHeader } from "./PageHeader";
import FileUpload from "../common/FileUpload";
import ImageUpload from "../common/ImageUpload";
import { logger } from "@/utils/logger";

// ============ 类型定义 ============

/**
 * 表单字段接口
 */
export interface FormField {
  /** 字段名称（用于表单数据键名） */
  name: string;
  /** 字段标签 */
  label: string;
  /** 字段类型 */
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
    | "autocomplete"
    | "file"
    | "image"
    | "group";
  /** 占位符文本 */
  placeholder?: string;
  /** 是否必填 */
  required?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 默认值 */
  defaultValue?: any;
  /** 选项列表（用于select和autocomplete类型） */
  options?: Array<{ label: string; value: any }>;
  /** 字段宽度（跨越的列数） */
  span?: number;
  /** 文本域行数 */
  rows?: number;
  /** 帮助文本 */
  helperText?: string;
  /** 验证规则（Zod schema） */
  validation?: z.ZodTypeAny;
  /** 文件上传配置（用于file类型） */
  uploadConfig?: {
    /** 最大文件数量 */
    maxCount?: number;
    /** 允许的文件类型 */
    accept?: string[];
    /** 单个文件最大大小（MB） */
    maxSize?: number;
  };
  /** 图像上传配置（用于image类型） */
  imageConfig?: {
    /** 最大图片数量 */
    maxCount?: number;
    /** 允许的图片类型 */
    accept?: string[];
    /** 单个文件最大大小（MB） */
    maxSize?: number;
  };
  /** 字段分组（用于字段分组功能） */
  group?: string;
  /** 字段顺序（用于字段排序） */
  order?: number;
  /** 字段提示信息 */
  tooltip?: string;
  /** 是否可编辑（用于权限控制） */
  editable?: boolean;
  /** 字段依赖（用于字段联动） */
  dependsOn?: string[];
}

/**
 * 表单区块接口
 */
export interface FormSection {
  /** 区块唯一标识 */
  id: string;
  /** 区块标题 */
  title: string;
  /** 区块描述 */
  description?: string;
  /** 字段列表 */
  fields: FormField[];
  /** 是否可折叠 */
  collapsible?: boolean;
  /** 默认是否展开 */
  defaultExpanded?: boolean;
  /** 区块顺序 */
  order?: number;
  /** 区块图标 */
  icon?: React.ReactNode;
  /** 区块标签颜色 */
  color?: "primary" | "secondary" | "error" | "warning" | "success" | "info";
}

/**
 * 字段联动配置
 */
export interface FieldDependency {
  /** 触发字段名称 */
  sourceField: string;
  /** 目标字段名称 */
  targetField: string;
  /** 联动类型 */
  type:
    | "visibility"
    | "options"
    | "value"
    | "required"
    | "disabled"
    | "editable";
  /** 触发条件 */
  condition: {
    /** 条件类型 */
    type:
      | "equals"
      | "notEquals"
      | "contains"
      | "notEmpty"
      | "empty"
      | "greaterThan"
      | "lessThan";
    /** 条件值 */
    value?: any;
  };
  /** 联动效果 */
  effect: {
    /** 可见性（用于visibility类型） */
    visible?: boolean;
    /** 更新选项（用于options类型） */
    options?:
      | Array<{ label: string; value: any }>
      | ((value: any) => Array<{ label: string; value: any }>);
    /** 设置值（用于value类型） */
    value?: any | ((value: any) => any);
    /** 是否必填（用于required类型） */
    required?: boolean;
    /** 是否禁用（用于disabled类型） */
    disabled?: boolean;
    /** 是否可编辑（用于editable类型） */
    editable?: boolean;
  };
}

/**
 * 验证提示配置
 */
export interface ValidationToast {
  /** 提示消息 */
  message: string;
  /** 提示类型 */
  type: "success" | "warning" | "error" | "info";
  /** 关联的字段名称 */
  field?: string;
}

/**
 * 表单草稿配置
 */
export interface DraftConfig {
  /** 是否启用草稿保存 */
  enabled?: boolean;
  /** 草稿存储key */
  storageKey?: string;
  /** 自动保存间隔（毫秒） */
  autoSaveInterval?: number;
  /** 最大草稿数量 */
  maxDrafts?: number;
  /** 草稿过期时间（毫秒） */
  expirationTime?: number;
}

/**
 * 表单版本配置
 */
export interface VersionConfig {
  /** 是否启用版本对比 */
  enabled?: boolean;
  /** 当前版本 */
  currentVersion?: string;
  /** 历史版本列表 */
  history?: Array<{
    version: string;
    data: Record<string, any>;
    timestamp: number;
    user?: string;
  }>;
}

/**
 * 表单页模板属性
 */
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

  // ============ 新增功能 ============

  /** 字段联动配置 */
  dependencies?: FieldDependency[];
  /** 字段联动变化回调 */
  onDependencyChange?: (field: string, value: any, form: UseFormReturn) => void;
  /** 验证提示配置 */
  validationToasts?: ValidationToast[];
  /** 是否显示实时验证提示 */
  showValidationHints?: boolean;
  /** 自定义验证消息映射 */
  customValidationMessages?: Record<string, string>;
  /** 表单草稿配置 */
  draftConfig?: DraftConfig;
  /** 表单版本配置 */
  versionConfig?: VersionConfig;
  /** 是否显示字段分组标签 */
  showGroupTabs?: boolean;
  /** 是否显示表单进度条 */
  showProgress?: boolean;
  /** 表单模式 */
  mode?: "create" | "edit" | "view";
  /** 权限配置 */
  permissions?: {
    canEdit?: boolean;
    canDelete?: boolean;
    canViewHistory?: boolean;
  };
}

// ============ 工具函数 ============

/**
 * 从localStorage读取草稿
 */
const loadDrafts = (
  key: string,
): Array<{ data: Record<string, any>; timestamp: number }> => {
  try {
    const stored = localStorage.getItem(`form:draft:${key}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }
  return [];
};

/**
 * 保存草稿到localStorage
 */
const saveDraft = (
  key: string,
  data: Record<string, any>,
  maxDrafts: number = 5,
): void => {
  try {
    const drafts = loadDrafts(key);
    drafts.unshift({ data, timestamp: Date.now() });
    if (drafts.length > maxDrafts) {
      drafts.pop();
    }
    localStorage.setItem(`form:draft:${key}`, JSON.stringify(drafts));
  } catch {
    // ignore
  }
};

/**
 * 清除草稿
 */
const clearDrafts = (key: string): void => {
  try {
    localStorage.removeItem(`form:draft:${key}`);
  } catch {
    // ignore
  }
};

// ============ 表单页模板组件 ============

/**
 * 表单页模板组件
 * 提供完整的表单页面布局，包括字段联动、文件上传、实时验证、草稿保存、版本对比等功能
 *
 * @example
 * ```tsx
 * <FormPageTemplate
 *   title="创建用户"
 *   sections={[
 *     {
 *       id: 'basic',
 *       title: '基本信息',
 *       fields: [
 *         { name: 'name', label: '姓名', type: 'text', required: true },
 *         { name: 'avatar', label: '头像', type: 'image' },
 *       ],
 *     },
 *   ]}
 *   dependencies={[
 *     {
 *       sourceField: 'type',
 *       targetField: 'category',
 *       type: 'options',
 *       condition: { type: 'equals', value: 'business' },
 *       effect: { options: businessCategories },
 *     },
 *   ]}
 *   draftConfig={{ enabled: true, storageKey: 'user-form' }}
 *   showProgress
 *   onSubmit={handleSubmit}
 * />
 * ```
 */
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
  // 新增属性
  dependencies = [],
  onDependencyChange,
  validationToasts = [],
  showValidationHints = true,
  customValidationMessages = {},
  draftConfig,
  versionConfig,
  showGroupTabs = false,
  showProgress = false,
  mode = "edit",
  permissions = { canEdit: true, canDelete: false, canViewHistory: false },
  ...props
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(
      sections.filter((s) => s.defaultExpanded !== false).map((s) => s.id),
    ),
  );

  // 字段可见性状态
  const [fieldVisibility, setFieldVisibility] = useState<
    Record<string, boolean>
  >(() => {
    const visibility: Record<string, boolean> = {};
    sections.forEach((section) => {
      section.fields.forEach((field) => {
        visibility[field.name] = true;
      });
    });
    return visibility;
  });

  // 动态选项状态
  const [dynamicOptions, setDynamicOptions] = useState<
    Record<string, Array<{ label: string; value: any }>>
  >(() => {
    const options: Record<string, Array<{ label: string; value: any }>> = {};
    sections.forEach((section) => {
      section.fields.forEach((field) => {
        if (field.options) {
          options[field.name] = field.options;
        }
      });
    });
    return options;
  });

  // 动态必填状态
  const [dynamicRequired, setDynamicRequired] = useState<
    Record<string, boolean>
  >(() => {
    const required: Record<string, boolean> = {};
    sections.forEach((section) => {
      section.fields.forEach((field) => {
        if (field.required) {
          required[field.name] = field.required;
        }
      });
    });
    return required;
  });

  // 动态禁用状态
  const [dynamicDisabled, setDynamicDisabled] = useState<
    Record<string, boolean>
  >(() => {
    const disabled: Record<string, boolean> = {};
    sections.forEach((section) => {
      section.fields.forEach((field) => {
        if (field.disabled) {
          disabled[field.name] = field.disabled;
        }
      });
    });
    return disabled;
  });

  // 动态可编辑状态
  const [dynamicEditable, setDynamicEditable] = useState<
    Record<string, boolean>
  >(() => {
    const editable: Record<string, boolean> = {};
    sections.forEach((section) => {
      section.fields.forEach((field) => {
        editable[field.name] = field.editable !== false;
      });
    });
    return editable;
  });

  // 验证提示状态
  const [validationHint, setValidationHint] = useState<ValidationToast | null>(
    null,
  );
  const [showHint, setShowHint] = useState(false);

  // 草稿状态
  const [drafts, setDrafts] = useState<
    Array<{ data: Record<string, any>; timestamp: number }>
  >([]);
  const [showDraftDialog, setShowDraftDialog] = useState(false);

  // 当前分组标签
  const [currentGroup, setCurrentGroup] = useState<string>("all");

  // 表单初始化
  const methods = useForm({
    resolver: schema ? (zodResolver(schema as any) as any) : undefined,
    defaultValues: defaultValues || {},
    mode: "onBlur",
  });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors, isDirty, dirtyFields },
  } = methods;

  // 监听表单值变化，处理字段联动
  const formValues = watch();

  // 计算表单进度
  const formProgress = useMemo(() => {
    if (!showProgress) return 0;

    const allFields = sections.flatMap((s) => s.fields);
    const requiredFields = allFields.filter(
      (f) => f.required || dynamicRequired[f.name],
    );
    if (requiredFields.length === 0) return 100;

    const filledRequiredFields = requiredFields.filter((f) => {
      const value = formValues[f.name];
      return value !== undefined && value !== null && value !== "";
    });

    return Math.round(
      (filledRequiredFields.length / requiredFields.length) * 100,
    );
  }, [sections, formValues, dynamicRequired, showProgress]);

  // 获取所有分组
  const groups = useMemo(() => {
    const groupSet = new Set<string>();
    sections.forEach((section) => {
      section.fields.forEach((field) => {
        if (field.group) {
          groupSet.add(field.group);
        }
      });
    });
    return Array.from(groupSet);
  }, [sections]);

  // 加载草稿
  useEffect(() => {
    if (draftConfig?.enabled && draftConfig.storageKey) {
      const savedDrafts = loadDrafts(draftConfig.storageKey);
      setDrafts(savedDrafts);

      // 如果有草稿且表单为空，自动加载最新草稿
      if (savedDrafts.length > 0 && !defaultValues) {
        const latestDraft = savedDrafts[0];
        reset(latestDraft.data);
      }
    }
  }, [draftConfig, defaultValues, reset]);

  // 自动保存草稿
  useEffect(() => {
    if (
      !draftConfig?.enabled ||
      !draftConfig.storageKey ||
      !draftConfig.autoSaveInterval
    ) {
      return;
    }

    const storageKey = draftConfig.storageKey as string;
    const maxDrafts = draftConfig.maxDrafts || 5;

    const interval = setInterval(() => {
      if (isDirty) {
        const currentValues = getValues();
        saveDraft(storageKey, currentValues, maxDrafts);
      }
    }, draftConfig.autoSaveInterval);

    return () => clearInterval(interval);
  }, [draftConfig, isDirty, getValues]);

  // 处理字段联动
  useEffect(() => {
    if (dependencies.length === 0) return;

    dependencies.forEach((dep) => {
      const sourceValue = formValues[dep.sourceField];
      let conditionMet = false;

      switch (dep.condition.type) {
        case "equals":
          conditionMet = sourceValue === dep.condition.value;
          break;
        case "notEquals":
          conditionMet = sourceValue !== dep.condition.value;
          break;
        case "contains":
          conditionMet = Array.isArray(sourceValue)
            ? sourceValue.includes(dep.condition.value)
            : String(sourceValue).includes(String(dep.condition.value));
          break;
        case "notEmpty":
          conditionMet =
            sourceValue !== undefined &&
            sourceValue !== null &&
            sourceValue !== "";
          break;
        case "empty":
          conditionMet =
            sourceValue === undefined ||
            sourceValue === null ||
            sourceValue === "";
          break;
        case "greaterThan":
          conditionMet = Number(sourceValue) > Number(dep.condition.value);
          break;
        case "lessThan":
          conditionMet = Number(sourceValue) < Number(dep.condition.value);
          break;
      }

      if (conditionMet) {
        switch (dep.type) {
          case "visibility":
            setFieldVisibility((prev) => ({
              ...prev,
              [dep.targetField]: dep.effect.visible ?? true,
            }));
            break;
          case "options":
            if (dep.effect.options) {
              const newOptions =
                typeof dep.effect.options === "function"
                  ? dep.effect.options(sourceValue)
                  : dep.effect.options;
              setDynamicOptions((prev) => ({
                ...prev,
                [dep.targetField]: newOptions!,
              }));
            }
            break;
          case "value":
            if (dep.effect.value) {
              const newValue =
                typeof dep.effect.value === "function"
                  ? dep.effect.value(sourceValue)
                  : dep.effect.value;
              setValue(dep.targetField, newValue);
            }
            break;
          case "required":
            setDynamicRequired((prev) => ({
              ...prev,
              [dep.targetField]: dep.effect.required ?? false,
            }));
            break;
          case "disabled":
            setDynamicDisabled((prev) => ({
              ...prev,
              [dep.targetField]: dep.effect.disabled ?? false,
            }));
            break;
          case "editable":
            setDynamicEditable((prev) => ({
              ...prev,
              [dep.targetField]: dep.effect.editable ?? true,
            }));
            break;
        }
      } else if (dep.type === "visibility" && dep.effect.visible === false) {
        setFieldVisibility((prev) => ({
          ...prev,
          [dep.targetField]: true,
        }));
      }
    });

    // 触发外部联动变化回调
    Object.keys(formValues).forEach((field) => {
      onDependencyChange?.(field, formValues[field], methods);
    });
  }, [formValues, dependencies, setValue, onDependencyChange, methods]);

  // 显示验证提示
  const displayValidationHint = useCallback((toast: ValidationToast) => {
    setValidationHint(toast);
    setShowHint(true);
    if (toast.type === "success" || toast.type === "info") {
      setTimeout(() => setShowHint(false), 3000);
    }
  }, []);

  // 处理提交
  const handleFormSubmit = useCallback(
    async (data: any) => {
      try {
        // 过滤掉不可见字段的数据
        const visibleData: Record<string, any> = {};
        Object.keys(data).forEach((key) => {
          if (fieldVisibility[key] !== false) {
            visibleData[key] = data[key];
          }
        });

        // 显示成功提示
        if (validationToasts.length > 0) {
          const successToast = validationToasts.find(
            (t) => t.type === "success",
          );
          if (successToast) {
            displayValidationHint(successToast);
          }
        }

        await onSubmit(visibleData);

        // 清除草稿
        if (draftConfig?.enabled && draftConfig.storageKey) {
          clearDrafts(draftConfig.storageKey);
          setDrafts([]);
        }
      } catch (err) {
        const errorToast = validationToasts.find((t) => t.type === "error");
        if (errorToast) {
          displayValidationHint(errorToast);
        }
        logger.error("Form submit error:", err);
      }
    },
    [
      onSubmit,
      fieldVisibility,
      validationToasts,
      displayValidationHint,
      draftConfig,
    ],
  );

  // 处理重置
  const handleReset = useCallback(() => {
    reset();
    onReset?.();

    // 清除草稿
    if (draftConfig?.enabled && draftConfig.storageKey) {
      clearDrafts(draftConfig.storageKey);
      setDrafts([]);
    }
  }, [reset, onReset, draftConfig]);

  // 加载草稿
  const handleLoadDraft = useCallback(
    (draft: { data: Record<string, any>; timestamp: number }) => {
      reset(draft.data);
      setShowDraftDialog(false);
      displayValidationHint({
        message: `已加载草稿（保存于 ${new Date(draft.timestamp).toLocaleString()}）`,
        type: "info",
      });
    },
    [reset, displayValidationHint],
  );

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

  // 获取字段验证错误消息
  const getErrorMessage = (fieldName: string, field: FormField): string => {
    const fieldError = errors[fieldName];
    if (!fieldError) return "";

    const error = fieldError as any;
    let message = error?.message || "验证失败";

    // 使用自定义验证消息
    if (customValidationMessages[fieldName]) {
      message = customValidationMessages[fieldName];
    }

    return message;
  };

  // 渲染字段
  const renderField = (field: FormField) => {
    // 检查字段可见性
    if (fieldVisibility[field.name] === false) {
      return null;
    }

    // 检查分组过滤
    if (
      showGroupTabs &&
      currentGroup !== "all" &&
      field.group !== currentGroup
    ) {
      return null;
    }

    const fieldError = errors[field.name];
    const errorMessage = getErrorMessage(field.name, field);
    const isRequired = dynamicRequired[field.name] || field.required;
    const options = dynamicOptions[field.name] || field.options;
    const isDisabled =
      dynamicDisabled[field.name] ||
      field.disabled ||
      submitting ||
      mode === "view";
    const isEditable =
      dynamicEditable[field.name] && permissions.canEdit && mode !== "view";

    const commonProps = {
      label: field.label,
      placeholder: field.placeholder,
      disabled: isDisabled || !isEditable,
      error: !!fieldError,
      helperText: errorMessage || field.helperText,
      size: "small" as const,
      fullWidth: true,
    };

    return (
      <Box key={field.name} sx={{ position: "relative" }}>
        {field.tooltip && (
          <Tooltip title={field.tooltip} placement="top">
            <IconButton
              size="small"
              sx={{ position: "absolute", top: 0, right: 0 }}
            >
              <Info style={{ width: 16, height: 16 }} />
            </IconButton>
          </Tooltip>
        )}

        {dirtyFields[field.name] && (
          <Chip
            label="已修改"
            size="small"
            color="primary"
            sx={{
              position: "absolute",
              top: -8,
              right: field.tooltip ? 32 : 0,
            }}
          />
        )}

        <Controller
          name={field.name}
          control={control}
          defaultValue={field.defaultValue || ""}
          rules={{
            required: isRequired ? `${field.label}不能为空` : false,
          }}
          render={({ field: controllerField }) => {
            switch (field.type) {
              case "textarea":
                return (
                  <TextField
                    {...commonProps}
                    {...controllerField}
                    multiline
                    rows={field.rows || 4}
                    required={isRequired}
                  />
                );

              case "select":
                return (
                  <TextField
                    {...commonProps}
                    {...controllerField}
                    select
                    required={isRequired}
                  >
                    <option value="">请选择</option>
                    {options?.map((option) => (
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
                    required={isRequired}
                    onChange={(e) =>
                      controllerField.onChange(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                  />
                );

              case "date":
                return (
                  <TextField
                    {...commonProps}
                    {...controllerField}
                    type="date"
                    required={isRequired}
                    slotProps={{
                      inputLabel: { shrink: true },
                    }}
                  />
                );

              case "email":
                return (
                  <TextField
                    {...commonProps}
                    {...controllerField}
                    type="email"
                    autoComplete="email"
                    required={isRequired}
                  />
                );

              case "password":
                return (
                  <TextField
                    {...commonProps}
                    {...controllerField}
                    type="password"
                    autoComplete="new-password"
                    required={isRequired}
                  />
                );

              case "switch":
                return (
                  <FormControl error={!!fieldError}>
                    <FormLabel>
                      {field.label}
                      {isRequired && (
                        <Typography component="span" color="error">
                          *
                        </Typography>
                      )}
                    </FormLabel>
                    <Box sx={{ mt: 1 }}>
                      <Controller
                        name={field.name}
                        control={control}
                        defaultValue={field.defaultValue || false}
                        render={({ field: switchField }) => (
                          <Switch
                            checked={switchField.value || false}
                            onChange={(e) =>
                              switchField.onChange(e.target.checked)
                            }
                            disabled={isDisabled}
                          />
                        )}
                      />
                    </Box>
                    {(errorMessage || field.helperText) && (
                      <FormHelperText>
                        {errorMessage || field.helperText}
                      </FormHelperText>
                    )}
                  </FormControl>
                );

              case "checkbox":
                return (
                  <FormControl error={!!fieldError}>
                    <FormLabel>
                      {field.label}
                      {isRequired && (
                        <Typography component="span" color="error">
                          *
                        </Typography>
                      )}
                    </FormLabel>
                    <Box sx={{ mt: 1 }}>
                      <Controller
                        name={field.name}
                        control={control}
                        defaultValue={field.defaultValue || false}
                        render={({ field: checkboxField }) => (
                          <Checkbox
                            checked={checkboxField.value || false}
                            onChange={(e) =>
                              checkboxField.onChange(e.target.checked)
                            }
                            disabled={isDisabled}
                          />
                        )}
                      />
                    </Box>
                    {(errorMessage || field.helperText) && (
                      <FormHelperText>
                        {errorMessage || field.helperText}
                      </FormHelperText>
                    )}
                  </FormControl>
                );

              case "file":
                return (
                  <Box>
                    <FormLabel sx={{ mb: 1, display: "block" }}>
                      {field.label}
                      {isRequired && (
                        <Typography component="span" color="error">
                          *
                        </Typography>
                      )}
                    </FormLabel>
                    <Controller
                      name={field.name}
                      control={control}
                      defaultValue={field.defaultValue || []}
                      render={({ field: fileField }) => (
                        <FileUpload
                          value={fileField.value || []}
                          onChange={fileField.onChange}
                          maxCount={field.uploadConfig?.maxCount}
                          accept={field.uploadConfig?.accept}
                          maxSize={field.uploadConfig?.maxSize}
                          disabled={isDisabled}
                        />
                      )}
                    />
                    {(errorMessage || field.helperText) && (
                      <FormHelperText error={!!fieldError}>
                        {errorMessage || field.helperText}
                      </FormHelperText>
                    )}
                  </Box>
                );

              case "image":
                return (
                  <Box>
                    <FormLabel sx={{ mb: 1, display: "block" }}>
                      {field.label}
                      {isRequired && (
                        <Typography component="span" color="error">
                          *
                        </Typography>
                      )}
                    </FormLabel>
                    <Controller
                      name={field.name}
                      control={control}
                      defaultValue={field.defaultValue || []}
                      render={({ field: imageField }) => (
                        <ImageUpload
                          value={imageField.value || []}
                          onChange={imageField.onChange}
                          maxCount={field.imageConfig?.maxCount}
                          disabled={isDisabled}
                        />
                      )}
                    />
                    {(errorMessage || field.helperText) && (
                      <FormHelperText error={!!fieldError}>
                        {errorMessage || field.helperText}
                      </FormHelperText>
                    )}
                  </Box>
                );

              case "autocomplete":
                return (
                  <TextField
                    {...commonProps}
                    {...controllerField}
                    select
                    required={isRequired}
                  >
                    <option value="">请选择</option>
                    {options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </TextField>
                );

              default:
                return (
                  <TextField
                    {...commonProps}
                    {...controllerField}
                    required={isRequired}
                  />
                );
            }
          }}
        />
      </Box>
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
            bgcolor: section.color ? `${section.color}.lighter` : "inherit",
          }}
          onClick={() => section.collapsible && toggleSection(section.id)}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {section.icon && (
              <Box
                sx={{
                  color: section.color ? `${section.color}.main` : "inherit",
                }}
              >
                {section.icon}
              </Box>
            )}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {section.title}
                {section.fields.some(
                  (f) => dynamicRequired[f.name] || f.required,
                ) && (
                  <Typography component="span" color="error" sx={{ ml: 0.5 }}>
                    *
                  </Typography>
                )}
              </Typography>
              {section.description && (
                <Typography variant="caption" color="text.secondary">
                  {section.description}
                </Typography>
              )}
            </Box>
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
                    md={Math.floor(12 / columns) * (field.span || 1)}
                    size={{ xs: 12, sm: 6 }}
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
                    md={Math.floor(12 / columns) * (field.span || 1)}
                    size={{ xs: 12, sm: 6 }}
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

  // 渲染分组标签
  const renderGroupTabs = () => {
    if (!showGroupTabs || groups.length === 0) return null;

    return (
      <Tabs
        value={currentGroup}
        onChange={(e, newValue) => setCurrentGroup(newValue)}
        sx={{ mb: 2 }}
      >
        <Tab label="全部" value="all" />
        {groups.map((group) => (
          <Tab key={group} label={group} value={group} />
        ))}
      </Tabs>
    );
  };

  // 渲染进度条
  const renderProgress = () => {
    if (!showProgress) return null;

    return (
      <Box sx={{ mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 1,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            表单填写进度
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontWeight: "bold",
              color: formProgress === 100 ? "success.main" : "primary.main",
            }}
          >
            {formProgress}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={formProgress}
          color={formProgress === 100 ? "success" : "primary"}
          sx={{ borderRadius: 1, height: 8 }}
        />
      </Box>
    );
  };

  // 渲染草稿按钮
  const renderDraftButton = () => {
    if (!draftConfig?.enabled || drafts.length === 0) return null;

    return (
      <Tooltip title={`有 ${drafts.length} 个草稿可恢复`}>
        <Button
          variant="outlined"
          size="small"
          onClick={() => setShowDraftDialog(true)}
          startIcon={<FileText style={{ width: 16, height: 16 }} />}
        >
          草稿 ({drafts.length})
        </Button>
      </Tooltip>
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
        {showValidationHints && Object.keys(errors).length > 0 && (
          <Tooltip title="表单存在验证错误">
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                color: "error.main",
              }}
            >
              <AlertCircle style={{ width: 16, height: 16 }} />
              <Typography variant="caption" sx={{ ml: 0.5 }}>
                {Object.keys(errors).length}个字段存在错误
              </Typography>
            </Box>
          </Tooltip>
        )}
        {renderDraftButton()}
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {mode === "view" && permissions.canEdit && (
          <Button
            variant="outlined"
            onClick={() => {}}
            startIcon={<Unlock style={{ width: 16, height: 16 }} />}
          >
            编辑
          </Button>
        )}
        {mode !== "view" && onCancel && (
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={submitting}
            startIcon={<X style={{ width: 16, height: 16 }} />}
          >
            {cancelText}
          </Button>
        )}
        {mode !== "view" && onReset && (
          <Button
            variant="text"
            onClick={handleReset}
            disabled={submitting || !isDirty}
            startIcon={<RotateCcw style={{ width: 16, height: 16 }} />}
          >
            {resetText}
          </Button>
        )}
        {mode !== "view" && (
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
        )}
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

        {/* 进度条 */}
        {renderProgress()}

        {/* 分组标签 */}
        {renderGroupTabs()}

        {/* 错误提示 */}
        {error && (
          <Alert
            severity="error"
            sx={{ mb: 3 }}
            icon={<AlertCircle style={{ width: 20, height: 20 }} />}
            action={
              <IconButton size="small" onClick={() => {}}>
                <X style={{ width: 16, height: 16 }} />
              </IconButton>
            }
          >
            {error}
          </Alert>
        )}

        {/* 成功提示 */}
        {success && (
          <Alert
            severity="success"
            sx={{ mb: 3 }}
            icon={<CheckCircle style={{ width: 20, height: 20 }} />}
            action={
              <IconButton size="small" onClick={() => {}}>
                <X style={{ width: 16, height: 16 }} />
              </IconButton>
            }
          >
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

        {/* 验证提示 Snackbar */}
        <Snackbar
          open={showHint}
          autoHideDuration={3000}
          onClose={() => setShowHint(false)}
          anchorOrigin={{
            vertical: "top" as const,
            horizontal: "center" as const,
          }}
        >
          <MuiAlert
            severity={validationHint?.type || "info"}
            onClose={() => setShowHint(false)}
            icon={
              validationHint?.type === "success" ? (
                <CheckCircle style={{ width: 20, height: 20 }} />
              ) : validationHint?.type === "warning" ? (
                <AlertTriangle style={{ width: 20, height: 20 }} />
              ) : validationHint?.type === "error" ? (
                <AlertCircle style={{ width: 20, height: 20 }} />
              ) : (
                <Info style={{ width: 20, height: 20 }} />
              )
            }
          >
            {validationHint?.message}
          </MuiAlert>
        </Snackbar>

        {/* 草稿选择对话框 */}
        {showDraftDialog && (
          <Paper sx={{ p: 3, maxWidth: 400, mx: "auto", mt: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              选择草稿
            </Typography>
            {drafts.map((draft, index) => (
              <Box
                key={index}
                sx={{
                  p: 2,
                  mb: 1,
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: "divider",
                  cursor: "pointer",
                  "&:hover": {
                    bgcolor: "action.hover",
                  },
                }}
                onClick={() => handleLoadDraft(draft)}
              >
                <Typography variant="body2">草稿 #{index + 1}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(draft.timestamp).toLocaleString()}
                </Typography>
              </Box>
            ))}
            <Button
              fullWidth
              variant="outlined"
              onClick={() => setShowDraftDialog(false)}
            >
              关闭
            </Button>
          </Paper>
        )}
      </Box>
    </FormProvider>
  );
};

// 导入 Switch 和 Checkbox（从 MUI 导入）
import { Switch, Checkbox } from "@mui/material";

export default FormPageTemplate;
