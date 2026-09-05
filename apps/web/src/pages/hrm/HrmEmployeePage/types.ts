import type { Employee, Department, Company } from '@/api/hrm';

export interface TreeNode {
  id: string;
  name: string;
  type: 'department' | 'employee';
  children?: TreeNode[];
  [key: string]: unknown;
}

export interface EmployeeListParams {
  page?: number;
  pagesize?: number;
  search?: string;
  department_id?: string;
  status?: string;
  [key: string]: string | number | undefined;
}

export type ViewMode = 'list' | 'tree';

export interface EmployeeFormDialogProps {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  employee: Employee | null;
  formData: Partial<Employee>;
  onChange: (field: string, value: unknown) => void;
  onSubmit: (e: React.FormEvent) => void;
  companies: Company[];
  departments: Department[];
  onOpenAICodeGenerator: (mode: 'create' | 'edit') => void;
  onOpenAIDataCompleter: () => void;
  onOpenAIFormValidator: () => void;
}

export interface TreeViewComponentProps {
  data: TreeNode[];
  selectedId?: string;
  onSelect: (node: TreeNode) => void;
}

export interface EmployeeDetailDialogProps {
  open: boolean;
  onClose: () => void;
  employee: Employee | null;
  departments: Department[];
  onEdit: (employee: Employee) => void;
  getStatusBadge: (status: string) => React.ReactNode;
}
