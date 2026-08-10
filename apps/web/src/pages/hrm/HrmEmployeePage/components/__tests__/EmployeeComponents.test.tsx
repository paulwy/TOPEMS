import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import EmployeeDetailDialog from '../EmployeeDetailDialog';
import EmployeeFormDialog from '../EmployeeFormDialog';
import TreeViewComponent from '../TreeViewComponent';
import type { TreeNode } from '../../types';
import type { Company, Department, Employee } from '@/api/hrm';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/components/common', () => ({
  ImageUpload: ({ value, onChange }: { value: string[]; onChange: (files: string[]) => void }) => (
    <button
      type='button'
      data-testid='image-upload'
      onClick={() => onChange(['avatar-updated.png'])}
    >
      {value[0] || 'upload-avatar'}
    </button>
  ),
}));

vi.mock('@/components/ai', () => ({
  AIHelperButton: ({
    label,
    onClick,
  }: {
    label: string;
    onClick: React.MouseEventHandler<HTMLButtonElement>;
  }) => (
    <button
      type='button'
      onClick={onClick}
    >
      {label}
    </button>
  ),
}));

vi.mock('lucide-react', () => ({
  Building2: () => <span data-testid='building-icon' />,
  Users: () => <span data-testid='users-icon' />,
  ChevronDown: () => <span data-testid='chevron-down' />,
  ChevronRight: () => <span data-testid='chevron-right' />,
}));

const employee: Employee = {
  id: 'emp-1',
  name: '张三',
  employee_no: 'E001',
  email: 'zhangsan@example.com',
  phone: '13800000000',
  department_id: 'dept-1',
  department_name: '研发部',
  position: '前端工程师',
  hire_date: '2024-01-10',
  status: 'active',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const companies: Company[] = [
  {
    id: 'company-1',
    name: '拓普能源',
    code: 'TOPEMS',
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const departments: Department[] = [
  {
    id: 'dept-1',
    name: '研发部',
    code: 'RD',
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

describe('EmployeeDetailDialog', () => {
  it('renders employee profile fields and closes from action button', () => {
    const onClose = vi.fn();
    render(
      <EmployeeDetailDialog
        open
        onClose={onClose}
        employee={employee}
      />
    );

    expect(screen.getByText('员工详情')).toBeInTheDocument();
    expect(screen.getByText('张三')).toBeInTheDocument();
    expect(screen.getByText('E001')).toBeInTheDocument();
    expect(screen.getByText('zhangsan@example.com')).toBeInTheDocument();
    expect(screen.getByText('研发部')).toBeInTheDocument();
    expect(screen.getByText('在职')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '关闭' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render employee fields when employee is empty', () => {
    render(
      <EmployeeDetailDialog
        open
        onClose={vi.fn()}
        employee={null}
      />
    );

    expect(screen.getByText('员工详情')).toBeInTheDocument();
    expect(screen.queryByText('员工姓名')).not.toBeInTheDocument();
  });
});

describe('EmployeeFormDialog', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    mode: 'create' as const,
    employee,
    formData: {
      org_id: 'company-1',
      avatar_url: 'avatar.png',
      name: '张三',
      employee_no: 'E001',
      email: 'zhangsan@example.com',
      phone: '13800000000',
      department_id: 'dept-1',
      position: '前端工程师',
      hire_date: '2024-01-10',
      status: 'active',
    },
    onChange: vi.fn(),
    onSubmit: vi.fn((event: React.FormEvent) => event.preventDefault()),
    companies,
    departments,
    onOpenAICodeGenerator: vi.fn(),
    onOpenAIDataCompleter: vi.fn(),
    onOpenAIFormValidator: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders create form values and updates avatar through upload control', () => {
    render(<EmployeeFormDialog {...defaultProps} />);

    expect(
      screen.getByText('hrm.hrm_employee_page_components__employee_form_dialog.add')
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('张三')).toBeInTheDocument();
    expect(screen.getByDisplayValue('E001')).toBeInTheDocument();
    expect(screen.getByDisplayValue('zhangsan@example.com')).toBeInTheDocument();
    expect(screen.getByTestId('image-upload')).toHaveTextContent('avatar.png');

    fireEvent.click(screen.getByTestId('image-upload'));

    expect(defaultProps.onChange).toHaveBeenCalledWith('avatar_url', 'avatar-updated.png');
  });

  it('invokes AI actions, submit and close handlers', () => {
    render(<EmployeeFormDialog {...defaultProps} />);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'hrm.hrm_employee_page_components__employee_form_dialog.text_0dd441',
      })
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: 'hrm.hrm_employee_page_components__employee_form_dialog.text_e93748',
      })
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: 'hrm.hrm_employee_page_components__employee_form_dialog.text_6bc019',
      })
    );
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    fireEvent.click(
      screen.getByRole('button', {
        name: 'hrm.hrm_employee_page_components__employee_form_dialog.create',
      })
    );

    expect(defaultProps.onOpenAICodeGenerator).toHaveBeenCalledWith('create');
    expect(defaultProps.onOpenAIDataCompleter).toHaveBeenCalledTimes(1);
    expect(defaultProps.onOpenAIFormValidator).toHaveBeenCalledTimes(1);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    expect(defaultProps.onSubmit).toHaveBeenCalledTimes(1);
  });

  it('renders edit mode title and save action', () => {
    render(
      <EmployeeFormDialog
        {...defaultProps}
        mode='edit'
      />
    );

    expect(
      screen.getByText('hrm.hrm_employee_page_components__employee_form_dialog.edit')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'hrm.hrm_employee_page_components__employee_form_dialog.save',
      })
    ).toBeInTheDocument();
  });
});

describe('TreeViewComponent', () => {
  const treeData: TreeNode[] = [
    {
      id: 'dept-1',
      name: '研发部',
      type: 'department',
      children: [
        {
          id: 'emp-1',
          name: '张三',
          type: 'employee',
        },
      ],
    },
  ];

  it('renders root department and expands children on selection', () => {
    const onSelect = vi.fn();
    render(
      <TreeViewComponent
        data={treeData}
        onSelect={onSelect}
      />
    );

    expect(screen.getByText('研发部')).toBeInTheDocument();
    expect(screen.queryByText('张三')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('研发部'));

    expect(onSelect).toHaveBeenCalledWith(treeData[0]);
    expect(screen.getByText('张三')).toBeInTheDocument();
  });

  it('selects employee child after parent expansion', () => {
    const onSelect = vi.fn();
    render(
      <TreeViewComponent
        data={treeData}
        selectedId='emp-1'
        onSelect={onSelect}
      />
    );

    fireEvent.click(screen.getByText('研发部'));
    fireEvent.click(screen.getByText('张三'));

    expect(onSelect).toHaveBeenLastCalledWith(treeData[0].children?.[0]);
  });
});
