import type { ReactNode } from 'react';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner, LoadingOverlay, SkeletonLoader } from '../components/LoadingSpinner';
import { EmptyState, ListEmptyState, SearchEmptyState, PermissionEmptyState, ErrorEmptyState } from '../components/EmptyState';
import { ActionButton } from '../components/ActionButton';
import { FormField } from '../components/FormField';
import { FormSelect } from '../components/FormSelect';
import { FormCheckbox, FormCheckboxGroup } from '../components/FormCheckbox';
import { FormSwitch } from '../components/FormSwitch';
import { DatePicker } from '../components/DatePicker';
import { FilterBar } from '../components/FilterBar';
import { ProgressBar } from '../components/ProgressBar';
import { Stepper } from '../components/Stepper';
import Pagination from '../components/Pagination';
import { RelativeTime } from '../components/RelativeTime';
import { BackButton } from '../components/BackButton';
import ConfirmDialog, { AlertDialog, InfoDialog, SuccessDialog, WarningDialog, ErrorDialog, ConfirmationDialog } from '../components/ConfirmDialog';
import { DataTable, MobileCardView } from '../components/DataTable';
import { PageContainer } from '../components/PageContainer';
import { CommandPalette } from '../components/CommandPalette';
import { LazyImage } from '../components/LazyImage';
import { OrgTree } from '../components/OrgTree';
import { UserSelect } from '../components/UserSelect';
import { NumberField } from '../components/NumberField';
import { CurrencyField } from '../components/CurrencyField';
import { PercentField } from '../components/PercentField';

export type ComponentType = 'atom' | 'molecule' | 'organism';

export interface ComponentMeta {
  id: string;
  name: string;
  displayName: string;
  type: ComponentType;
  category: string;
  description: string;
  tags: string[];
  deprecated?: boolean;
  deprecatedMessage?: string;
}

export interface RegisteredComponent {
  component: React.ComponentType<any>;
  meta: ComponentMeta;
}

const components: Record<string, RegisteredComponent> = {};

const componentMetas: ComponentMeta[] = [
  { id: 'StatusBadge', name: 'StatusBadge', displayName: '状态徽章', type: 'atom', category: '数据展示', description: '显示各种状态的徽章组件', tags: ['badge', 'status', 'indicator'] },
  { id: 'LoadingSpinner', name: 'LoadingSpinner', displayName: '加载指示器', type: 'atom', category: '反馈', description: '页面加载状态指示器', tags: ['loading', 'spinner', 'progress'] },
  { id: 'LoadingOverlay', name: 'LoadingOverlay', displayName: '加载遮罩', type: 'atom', category: '反馈', description: '全屏加载遮罩', tags: ['loading', 'overlay'] },
  { id: 'SkeletonLoader', name: 'SkeletonLoader', displayName: '骨架屏', type: 'atom', category: '反馈', description: '内容占位骨架屏', tags: ['skeleton', 'loading', 'placeholder'] },
  { id: 'ActionButton', name: 'ActionButton', displayName: '操作按钮', type: 'atom', category: '表单', description: '通用操作按钮', tags: ['button', 'action'] },
  { id: 'BackButton', name: 'BackButton', displayName: '返回按钮', type: 'atom', category: '导航', description: '返回上一页按钮', tags: ['button', 'back', 'navigation'] },
  { id: 'ProgressBar', name: 'ProgressBar', displayName: '进度条', type: 'atom', category: '反馈', description: '进度展示条', tags: ['progress', 'bar'] },
  { id: 'RelativeTime', name: 'RelativeTime', displayName: '相对时间', type: 'atom', category: '数据展示', description: '显示相对时间', tags: ['time', 'date'] },
  { id: 'LazyImage', name: 'LazyImage', displayName: '懒加载图片', type: 'atom', category: '媒体', description: '图片懒加载组件', tags: ['image', 'lazy', 'media'] },
  { id: 'FormField', name: 'FormField', displayName: '表单字段', type: 'atom', category: '表单', description: '通用表单字段容器', tags: ['form', 'field'] },
  { id: 'FormSelect', name: 'FormSelect', displayName: '选择框', type: 'atom', category: '表单', description: '下拉选择框', tags: ['form', 'select', 'dropdown'] },
  { id: 'FormCheckbox', name: 'FormCheckbox', displayName: '复选框', type: 'atom', category: '表单', description: '复选框组件', tags: ['form', 'checkbox'] },
  { id: 'FormCheckboxGroup', name: 'FormCheckboxGroup', displayName: '复选框组', type: 'atom', category: '表单', description: '复选框组组件', tags: ['form', 'checkbox', 'group'] },
  { id: 'FormSwitch', name: 'FormSwitch', displayName: '开关', type: 'atom', category: '表单', description: '开关组件', tags: ['form', 'switch', 'toggle'] },
  { id: 'DatePicker', name: 'DatePicker', displayName: '日期选择器', type: 'atom', category: '表单', description: '日期时间选择器', tags: ['form', 'date', 'picker'] },
  { id: 'NumberField', name: 'NumberField', displayName: '数字字段', type: 'atom', category: '表单', description: '数字输入字段', tags: ['form', 'number'] },
  { id: 'CurrencyField', name: 'CurrencyField', displayName: '货币字段', type: 'atom', category: '表单', description: '货币输入字段', tags: ['form', 'currency'] },
  { id: 'PercentField', name: 'PercentField', displayName: '百分比字段', type: 'atom', category: '表单', description: '百分比输入字段', tags: ['form', 'percent'] },
  { id: 'EmptyState', name: 'EmptyState', displayName: '空状态', type: 'molecule', category: '数据展示', description: '空状态展示组件', tags: ['empty', 'state'] },
  { id: 'ListEmptyState', name: 'ListEmptyState', displayName: '列表空状态', type: 'molecule', category: '数据展示', description: '列表空状态', tags: ['empty', 'list'] },
  { id: 'SearchEmptyState', name: 'SearchEmptyState', displayName: '搜索空状态', type: 'molecule', category: '数据展示', description: '搜索结果为空', tags: ['empty', 'search'] },
  { id: 'PermissionEmptyState', name: 'PermissionEmptyState', displayName: '权限空状态', type: 'molecule', category: '数据展示', description: '无权限访问', tags: ['empty', 'permission'] },
  { id: 'ErrorEmptyState', name: 'ErrorEmptyState', displayName: '错误空状态', type: 'molecule', category: '数据展示', description: '错误状态展示', tags: ['empty', 'error'] },
  { id: 'FilterBar', name: 'FilterBar', displayName: '筛选栏', type: 'molecule', category: '数据展示', description: '数据筛选栏', tags: ['filter', 'search'] },
  { id: 'Stepper', name: 'Stepper', displayName: '步骤条', type: 'molecule', category: '导航', description: '多步骤导航组件', tags: ['stepper', 'steps', 'wizard'] },
  { id: 'Pagination', name: 'Pagination', displayName: '分页器', type: 'molecule', category: '数据展示', description: '数据分页组件', tags: ['pagination', 'page'] },
  { id: 'ConfirmDialog', name: 'ConfirmDialog', displayName: '确认对话框', type: 'molecule', category: '反馈', description: '通用确认对话框', tags: ['dialog', 'modal', 'confirm'] },
  { id: 'AlertDialog', name: 'AlertDialog', displayName: '警告对话框', type: 'molecule', category: '反馈', description: '警告对话框', tags: ['dialog', 'alert'] },
  { id: 'InfoDialog', name: 'InfoDialog', displayName: '信息对话框', type: 'molecule', category: '反馈', description: '信息对话框', tags: ['dialog', 'info'] },
  { id: 'SuccessDialog', name: 'SuccessDialog', displayName: '成功对话框', type: 'molecule', category: '反馈', description: '成功对话框', tags: ['dialog', 'success'] },
  { id: 'WarningDialog', name: 'WarningDialog', displayName: '警告对话框', type: 'molecule', category: '反馈', description: '警告对话框', tags: ['dialog', 'warning'] },
  { id: 'ErrorDialog', name: 'ErrorDialog', displayName: '错误对话框', type: 'molecule', category: '反馈', description: '错误对话框', tags: ['dialog', 'error'] },
  { id: 'ConfirmationDialog', name: 'ConfirmationDialog', displayName: '确认对话框', type: 'molecule', category: '反馈', description: '操作确认对话框', tags: ['dialog', 'confirm'] },
  { id: 'OrgTree', name: 'OrgTree', displayName: '组织树', type: 'molecule', category: '数据展示', description: '组织架构树', tags: ['tree', 'organization'] },
  { id: 'UserSelect', name: 'UserSelect', displayName: '用户选择', type: 'molecule', category: '表单', description: '用户选择器', tags: ['user', 'select'] },
  { id: 'CommandPalette', name: 'CommandPalette', displayName: '命令面板', type: 'molecule', category: '导航', description: '全局命令搜索面板', tags: ['command', 'palette', 'search'] },
  { id: 'DataTable', name: 'DataTable', displayName: '数据表格', type: 'organism', category: '数据展示', description: '高级数据表格', tags: ['table', 'data', 'grid'] },
  { id: 'MobileCardView', name: 'MobileCardView', displayName: '移动端卡片视图', type: 'organism', category: '数据展示', description: '移动端数据卡片视图', tags: ['mobile', 'card', 'view'] },
  { id: 'PageContainer', name: 'PageContainer', displayName: '页面容器', type: 'organism', category: '布局', description: '页面布局容器', tags: ['page', 'container', 'layout'] },
];

export function registerComponent(id: string, component: React.ComponentType<any>, meta: Omit<ComponentMeta, 'id' | 'name'>): void {
  if (components[id]) {
    console.warn(`Component ${id} is already registered, it will be overwritten`);
  }
  components[id] = {
    component,
    meta: { ...meta, id, name: id },
  };
}

export function getComponent(id: string): RegisteredComponent | undefined {
  return components[id];
}

export function getComponentList(type?: ComponentType, category?: string): ComponentMeta[] {
  return componentMetas.filter((meta) => {
    if (type && meta.type !== type) return false;
    if (category && meta.category !== category) return false;
    return true;
  });
}

export function getComponentCategories(): string[] {
  return [...new Set(componentMetas.map((meta) => meta.category))];
}

export function hasComponent(id: string): boolean {
  return !!components[id];
}

export function getAllComponents(): Record<string, RegisteredComponent> {
  return { ...components };
}

componentMetas.forEach((meta) => {
  const componentMap: Record<string, React.ComponentType<any>> = {
    StatusBadge,
    LoadingSpinner,
    LoadingOverlay,
    SkeletonLoader,
    ActionButton,
    BackButton,
    ProgressBar,
    RelativeTime,
    LazyImage,
    FormField,
    FormSelect,
    FormCheckbox,
    FormCheckboxGroup,
    FormSwitch,
    DatePicker,
    NumberField,
    CurrencyField,
    PercentField,
    EmptyState,
    ListEmptyState,
    SearchEmptyState,
    PermissionEmptyState,
    ErrorEmptyState,
    FilterBar,
    Stepper,
    Pagination,
    ConfirmDialog,
    AlertDialog,
    InfoDialog,
    SuccessDialog,
    WarningDialog,
    ErrorDialog,
    ConfirmationDialog,
    OrgTree,
    UserSelect,
    CommandPalette,
    DataTable,
    MobileCardView,
    PageContainer,
  };
  const component = componentMap[meta.id];
  if (component) {
    registerComponent(meta.id, component, {
      displayName: meta.displayName,
      type: meta.type,
      category: meta.category,
      description: meta.description,
      tags: meta.tags,
      deprecated: meta.deprecated,
      deprecatedMessage: meta.deprecatedMessage,
    });
  }
});