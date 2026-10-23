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
import { componentMetas } from '../i18n/zh';

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
  component: React.ComponentType<Record<string, unknown>>;
  meta: ComponentMeta;
}

const components: Record<string, RegisteredComponent> = {};

export function registerComponent(id: string, component: React.ComponentType<Record<string, unknown>>, meta: Omit<ComponentMeta, 'id' | 'name'>): void {
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
  const componentMap = {
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
  } as unknown as Record<string, React.ComponentType<Record<string, unknown>>>;
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