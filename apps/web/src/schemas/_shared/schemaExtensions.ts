/**
 * Schema extension types - adds nested tables, tree structures, and wizard forms to EntitySchema
 *
 * These extensions can handle more complex business scenarios beyond standard CRUD:
 * - nestedTables: child tables embedded in forms (e.g. order lines, item lists)
 * - tree: hierarchical data (e.g. organizational structure, category hierarchy)
 * - wizard: multi-step wizard forms (e.g. onboarding flow, approval flow)
 */

import type { SchemaField } from './types';
import type { ColumnDef } from '@/components/templates/list/types';

// ============ Nested Table Config ============

/** Nested table configuration - for child tables in forms (e.g. order detail rows) */
export interface NestedTableConfig {
  /** Field name (key storing child table data in parent form data) */
  field: string;
  /** Child table display title */
  title?: string;
  /** Child table column definitions */
  columns: ColumnDef[];
  /** Child table field definitions (for form rendering) */
  fields?: SchemaField[];
  /** Whether adding rows is supported, default true */
  allowAdd?: boolean;
  /** Whether editing rows is supported, default true */
  allowEdit?: boolean;
  /** Whether deleting rows is supported, default true */
  allowDelete?: boolean;
  /** Whether duplicating rows is supported, default false */
  allowDuplicate?: boolean;
  /** Add row button text */
  addButtonText?: string;
  /** Unique identifier field per row, default 'id' */
  rowKeyField?: string;
  /** Minimum number of rows in child table (auto-fills empty rows when fewer) */
  minRows?: number;
  /** Maximum number of rows in child table */
  maxRows?: number;
  /** Column count for child form, default 2 */
  formColCount?: number;
  /** Whether child table is collapsible */
  collapsible?: boolean;
  /** Whether expanded by default */
  defaultExpanded?: boolean;
  /** Validation function for child table data */
  validate?: (rows: Record<string, unknown>[]) => string | null;
}

// ============ Tree Config ============

/** Tree structure configuration - for hierarchical data (e.g. organization, categories) */
export interface TreeConfig {
  /** Unique node identifier field name, default 'id' */
  keyField?: string;
  /** Parent node field name, default 'parentId' */
  parentField?: string;
  /** Child node array field name, default 'children' */
  childrenField?: string;
  /** Node display label field name */
  labelField?: string;
  /** Whether drag-and-drop sorting is supported */
  draggable?: boolean;
  /** Whether expand/collapse is supported */
  expandable?: boolean;
  /** Expand all nodes by default */
  defaultExpandAll?: boolean;
  /** List of node IDs to expand by default */
  defaultExpandedKeys?: Array<string | number>;
  /** Whether multi-select is supported */
  selectable?: boolean;
  /** Whether checkbox selection is supported */
  checkable?: boolean;
  /** Whether cascade selection (parent select auto-selects children) */
  cascadeCheck?: boolean;
  /** Async child node loading function */
  loadChildren?: (node: Record<string, unknown>) => Promise<Record<string, unknown>[]>;
  /** Whether to show connection lines */
  showLine?: boolean;
  /** Node icon rendering */
  renderIcon?: (node: Record<string, unknown>) => React.ReactNode;
  /** Custom node title rendering */
  renderLabel?: (node: Record<string, unknown>) => React.ReactNode;
}

// ============ Wizard Form Config ============

/** Wizard step configuration */
export interface WizardStepConfig {
  /** Step unique identifier */
  key: string;
  /** Step title */
  title: string;
  /** Step description */
  description?: string;
  /** Array of field names included in this step */
  fields: string[];
  /** Step group title (for further grouping within a step) */
  groupTitle?: string;
  /** Whether this is the last step (shows submit button) */
  isFinalStep?: boolean;
  /** Pre-step validation (returns error message string, null means pass) */
  validate?: (values: Record<string, unknown>) => string | null;
  /** Step title icon */
  icon?: React.ReactNode;
  /** Conditional visibility: determines whether step is displayed based on current values */
  visibleWhen?: (values: Record<string, unknown>) => boolean;
  /** Custom step content rendering (overrides default FormBuilder rendering) */
  renderContent?: (props: WizardStepRenderProps) => React.ReactNode;
}

/** Wizard step custom render props */
export interface WizardStepRenderProps {
  values: Record<string, unknown>;
  onChange: (name: string, value: unknown) => void;
  mode: 'create' | 'edit' | 'view';
  disabled?: boolean;
  fieldSchema: SchemaField[];
  nestedTables: NestedTableConfig[];
}

/** Wizard form configuration - multi-step process form */
export interface WizardConfig {
  /** Array of step configurations */
  steps: WizardStepConfig[];
  /** Wizard title */
  title?: string;
  /** Step navigation position */
  navigationPosition?: 'top' | 'side';
  /** Whether to show step progress bar */
  showProgress?: boolean;
  /** Whether step skipping is allowed */
  allowSkip?: boolean;
  /** Whether going back to previous step is allowed */
  allowBack?: boolean;
  /** Finish step button text */
  finishButtonText?: string;
  /** Next step button text */
  nextButtonText?: string;
  /** Previous step button text */
  prevButtonText?: string;
  /** Whether to show summary after step completion */
  showSummaryOnComplete?: boolean;
  /** Step data transformation */
  transformStepData?: (
    data: Record<string, unknown>,
    fromStep: string,
    toStep: string
  ) => Record<string, unknown>;
}

// ============ EntitySchema Extension ============

/**
 * Entity Schema extension - adds nested table/tree/wizard capabilities on top of standard Schema
 *
 * Merge this configuration into EntitySchema when using:
 * ```ts
 * const schema: EntitySchema & SchemaExtensions = { ... };
 * ```
 */
export interface SchemaExtensions {
  /** Nested table configuration (child tables in forms) */
  nestedTables?: NestedTableConfig[];
  /** Tree structure configuration */
  tree?: TreeConfig;
  /** Wizard form configuration */
  wizard?: WizardConfig;
}

// ============ Utility Functions ============

/**
 * Derive ColumnDef array from SchemaField array
 *
 * Eliminates the duplication of defining both columns and fields in NestedTableConfig.
 * The field's label maps to column title, and listWidth maps to column width.
 *
 * @example
 * ```ts
 * const table: NestedTableConfig = {
 *   field: 'items',
 *   fields: [
 *     { name: 'code', label: 'Code', type: 'text', listWidth: 120 },
 *   ],
 *   columns: columnsFromFields(fields), // derive columns in one line
 * };
 * ```
 */
export function columnsFromFields(
  fields: SchemaField[],
  overrides: Record<string, Partial<ColumnDef>> = {}
): ColumnDef[] {
  return fields.map((f) => {
    const override = overrides[f.name];
    return {
      id: f.name,
      label: f.label,
      width: f.listWidth,
      minWidth: f.listMinWidth,
      sortable: f.sortable,
      align: f.align,
      ...override,
    };
  });
}
