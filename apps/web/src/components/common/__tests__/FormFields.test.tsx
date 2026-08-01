import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { useForm, type Control, type FieldValues } from 'react-hook-form';

import { FormTextField, FormSelectField, FormSwitchField, FormRadioGroup } from '../FormFields';
import { renderWithProviders } from '@/__tests__/test-utils';

vi.mock('@/store', () => ({
  useNotificationStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
        }
  ),
  useAuthStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          user: null,
        })
      : {
          user: null,
        }
  ),
}));

interface TestFormValues extends FieldValues {
  username: string;
  department: string;
  active: boolean;
  role: string;
}

/**
 * 包装器：使用 react-hook-form 的 useForm 创建 control 并传给子组件
 */
function TestFormWrapper({
  defaultValues,
  children,
}: {
  defaultValues: Partial<TestFormValues>;
  children: (control: Control<TestFormValues>) => React.ReactNode;
}) {
  const { control } = useForm<TestFormValues>({ defaultValues });
  return <form>{children(control)}</form>;
}

describe('FormFields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('FormTextField renders label', () => {
    renderWithProviders(
      <TestFormWrapper defaultValues={{ username: '' }}>
        {(control) => (
          <FormTextField
            name='username'
            control={control}
            label='用户名'
          />
        )}
      </TestFormWrapper>
    );
    expect(screen.getByLabelText('用户名')).toBeInTheDocument();
  });

  it('FormTextField renders and reflects passed value', () => {
    renderWithProviders(
      <TestFormWrapper defaultValues={{ username: '张三' }}>
        {(control) => (
          <FormTextField
            name='username'
            control={control}
            label='用户名'
          />
        )}
      </TestFormWrapper>
    );
    const input = screen.getByLabelText('用户名') as HTMLInputElement;
    expect(input.value).toBe('张三');
  });

  it('FormTextField calls onChange when user types', () => {
    renderWithProviders(
      <TestFormWrapper defaultValues={{ username: '' }}>
        {(control) => (
          <FormTextField
            name='username'
            control={control}
            label='用户名'
          />
        )}
      </TestFormWrapper>
    );
    const input = screen.getByLabelText('用户名');
    fireEvent.change(input, { target: { value: '李四' } });
    expect((input as HTMLInputElement).value).toBe('李四');
  });

  it('FormTextField renders disabled state', () => {
    renderWithProviders(
      <TestFormWrapper defaultValues={{ username: '' }}>
        {(control) => (
          <FormTextField
            name='username'
            control={control}
            label='用户名'
            disabled
          />
        )}
      </TestFormWrapper>
    );
    expect(screen.getByLabelText('用户名')).toBeDisabled();
  });

  it('FormSelectField renders label and options', () => {
    const options = [
      { value: 'dev', label: '研发部' },
      { value: 'hr', label: '人力资源部' },
    ];
    renderWithProviders(
      <TestFormWrapper defaultValues={{ department: '' }}>
        {(control) => (
          <FormSelectField
            name='department'
            control={control}
            label='所属部门'
            options={options}
          />
        )}
      </TestFormWrapper>
    );
    // 标签文本同时出现在 InputLabel 和 notched outline legend 中
    expect(screen.getAllByText('所属部门').length).toBeGreaterThan(0);
    // MUI Select 触发器使用 role="combobox"（无 labelId 关联，不使用 name 过滤）
    fireEvent.mouseDown(screen.getByRole('combobox'));
    expect(screen.getByText('研发部')).toBeInTheDocument();
    expect(screen.getByText('人力资源部')).toBeInTheDocument();
  });

  it('FormSelectField calls onChange when option is selected', () => {
    const handleChange = vi.fn();
    const options = [
      { value: 'dev', label: '研发部' },
      { value: 'hr', label: '人力资源部' },
    ];
    // Wrap with a form that exposes value via watch
    function SelectForm() {
      const { control, watch } = useForm<TestFormValues>({
        defaultValues: { department: '' },
      });
      React.useEffect(() => {
        const sub = watch((value) => {
          handleChange(value.department);
        });
        return () => sub.unsubscribe();
      }, [watch]);
      return (
        <FormSelectField
          name='department'
          control={control}
          label='所属部门'
          options={options}
        />
      );
    }
    renderWithProviders(<SelectForm />);
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('人力资源部'));
    expect(handleChange).toHaveBeenCalled();
    expect(handleChange).toHaveBeenLastCalledWith('hr');
  });

  it('FormSwitchField renders label and reflects passed value', () => {
    renderWithProviders(
      <TestFormWrapper defaultValues={{ active: true }}>
        {(control) => (
          <FormSwitchField
            name='active'
            control={control}
            label='启用'
          />
        )}
      </TestFormWrapper>
    );
    expect(screen.getByText('启用')).toBeInTheDocument();
    // MUI Switch 使用 role="switch"
    const switchEl = screen.getByRole('switch');
    expect(switchEl).toBeChecked();
  });

  it('FormSwitchField toggles when clicked', () => {
    renderWithProviders(
      <TestFormWrapper defaultValues={{ active: false }}>
        {(control) => (
          <FormSwitchField
            name='active'
            control={control}
            label='启用'
          />
        )}
      </TestFormWrapper>
    );
    const switchEl = screen.getByRole('switch');
    expect(switchEl).not.toBeChecked();
    fireEvent.click(switchEl);
    expect(switchEl).toBeChecked();
  });

  it('FormRadioGroup renders label and options', () => {
    const options = [
      { value: 'admin', label: '管理员' },
      { value: 'user', label: '普通用户' },
    ];
    renderWithProviders(
      <TestFormWrapper defaultValues={{ role: '' }}>
        {(control) => (
          <FormRadioGroup
            name='role'
            control={control}
            label='角色'
            options={options}
          />
        )}
      </TestFormWrapper>
    );
    expect(screen.getByText('角色')).toBeInTheDocument();
    expect(screen.getByText('管理员')).toBeInTheDocument();
    expect(screen.getByText('普通用户')).toBeInTheDocument();
  });

  it('renders multiple fields in the same form', () => {
    renderWithProviders(
      <TestFormWrapper defaultValues={{ username: '', department: '', active: false }}>
        {(control) => (
          <>
            <FormTextField
              name='username'
              control={control}
              label='用户名'
            />
            <FormSelectField
              name='department'
              control={control}
              label='所属部门'
              options={[{ value: 'dev', label: '研发部' }]}
            />
            <FormSwitchField
              name='active'
              control={control}
              label='启用'
            />
          </>
        )}
      </TestFormWrapper>
    );
    expect(screen.getByLabelText('用户名')).toBeInTheDocument();
    // 标签文本同时出现在 InputLabel 和 notched outline legend 中
    expect(screen.getAllByText('所属部门').length).toBeGreaterThan(0);
    expect(screen.getByText('启用')).toBeInTheDocument();
  });
});
