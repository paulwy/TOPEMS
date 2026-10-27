import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { iconSm, iconLg } from '../sharedStyles';
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
import i18n from '@/i18n';
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
import type { BreadcrumbItem, PageHeaderProps } from './PageHeader';
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
  /** 标准字段模式；与 content 互斥，至少填一项 */
  fields?: SettingField[];
  /** 自定义内容模式；填写后将直接渲染，不参与模板内置校验与保存 */
  content?: React.ReactNode;
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
  /** 页面描述（传入后在 PageHeader 副标题下方显示，替代 20 个 setting 页的独立 prop） */
  description?: string;
  /** 页面头部图标（与 PageHeader.pageIcon 同语义） */
  icon?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];

  tabs?: SettingTab[];
  sections?: SettingSection[];

