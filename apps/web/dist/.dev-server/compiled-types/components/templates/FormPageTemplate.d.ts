import React from "react";
import type { BoxProps } from "@mui/material";
import { type UseFormReturn } from "react-hook-form";
import type { z } from "zod";
import type { BreadcrumbItem } from "./PageHeader";
/**
 * 表单字段接口
 */
export interface FormField {
    /** 字段名称（用于表单数据键名） */
    name: string;
    /** 字段标签 */
    label: string;
    /** 字段类型 */
    type: "text" | "number" | "email" | "password" | "textarea" | "select" | "date" | "checkbox" | "switch" | "autocomplete" | "file" | "image";
    /** 占位符文本 */
    placeholder?: string;
    /** 是否必填 */
    required?: boolean;
    /** 是否禁用 */
    disabled?: boolean;
    /** 默认值 */
    defaultValue?: any;
    /** 选项列表（用于select和autocomplete类型） */
    options?: Array<{
        label: string;
        value: any;
    }>;
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
    type: "visibility" | "options" | "value" | "required";
    /** 触发条件 */
    condition: {
        /** 条件类型 */
        type: "equals" | "notEquals" | "contains" | "notEmpty" | "empty";
        /** 条件值 */
        value?: any;
    };
    /** 联动效果 */
    effect: {
        /** 可见性（用于visibility类型） */
        visible?: boolean;
        /** 更新选项（用于options类型） */
        options?: Array<{
            label: string;
            value: any;
        }>;
        /** 设置值（用于value类型） */
        value?: any;
        /** 是否必填（用于required类型） */
        required?: boolean;
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
 * 表单页模板属性
 */
export interface FormPageTemplateProps extends Omit<BoxProps, "onSubmit"> {
    title: string;
    subtitle?: string;
    breadcrumbs?: BreadcrumbItem[];
    sections: FormSection[];
    schema?: z.ZodType;
    defaultValues?: Record<string, any>;
    loading?: boolean;
    submitting?: boolean;
    error?: string;
    success?: string;
    onSubmit: (data: any) => Promise<void> | void;
    onCancel?: () => void;
    onReset?: () => void;
    submitText?: string;
    cancelText?: string;
    resetText?: string;
    columns?: number;
    stickyFooter?: boolean;
    headerContent?: React.ReactNode;
    footerContent?: React.ReactNode;
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
}
/**
 * 表单页模板组件
 * 提供完整的表单页面布局，包括字段联动、文件上传、实时验证等功能
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
 *   onSubmit={handleSubmit}
 * />
 * ```
 */
export declare const FormPageTemplate: React.FC<FormPageTemplateProps>;
export default FormPageTemplate;
