import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import DictionarySidebar from '../DictionarySidebar';
import DictionaryContent from '../DictionaryContent';
import DictionaryTypeModal from '../DictionaryTypeModal';
import type { DictType } from '@/api/system';

const mockCrudPage = vi.hoisted(() => vi.fn());

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('lucide-react', () => ({
  Book: () => <span data-testid='book-icon' />,
  ChevronRight: () => <span data-testid='chevron-right-icon' />,
  Download: () => <span data-testid='download-icon' />,
  Edit: () => <span data-testid='edit-icon' />,
  FolderOpen: () => <span data-testid='folder-open-icon' />,
  Search: () => <span data-testid='search-icon' />,
  Tag: () => <span data-testid='tag-icon' />,
  Trash2: () => <span data-testid='trash-icon' />,
  Upload: () => <span data-testid='upload-icon' />,
}));

vi.mock('@/components/templates/CrudPage', () => ({
  default: (props: Record<string, unknown>) => {
    mockCrudPage(props);
    return <div data-testid='crud-page'>{props.headerContent as React.ReactNode}</div>;
  },
}));

vi.mock('@/schemas/admin', () => ({
  dictItemSchema: { name: 'dictItemSchema' },
}));

const buildType = (overrides: Partial<DictType>): DictType => ({
  id: 'type-1',
  code: 'order_status',
  name: '订单状态',
  category: 'business',
  description: '订单流转状态',
  status: 'active',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('DictionarySidebar', () => {
  it('renders loading state while dictionary types are loading', () => {
    render(
      <DictionarySidebar
        searchQuery=''
        onSearchChange={vi.fn()}
        typesLoading
        groupedTypes={{}}
        onSelectType={vi.fn()}
      />
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});

describe('DictionaryContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no dictionary type is selected', () => {
    render(
      <DictionaryContent
        selectedType={null}
        dictItemAdapter={{} as never}
        onToggleStatus={vi.fn()}
        onEditType={vi.fn()}
        onDeleteType={vi.fn()}
        onExport={vi.fn()}
        onImport={vi.fn()}
      />
    );

    expect(screen.getByTestId('book-icon')).toBeInTheDocument();
    expect(screen.getByText('admin.dictionary_management_page.text_4b3a81')).toBeInTheDocument();
    expect(screen.getByText('admin.dictionary_management_page.text_f0736f')).toBeInTheDocument();
  });

  it('renders selected type details and delegates header and row actions', () => {
    const selectedType = buildType({ id: 'type-selected', category: 'custom' });
    const dictItemAdapter = { list: vi.fn() };
    const onToggleStatus = vi.fn();
    const onEditType = vi.fn();
    const onDeleteType = vi.fn();
    const onExport = vi.fn();
    const onImport = vi.fn();

    render(
      <DictionaryContent
        selectedType={selectedType}
        dictItemAdapter={dictItemAdapter as never}
        onToggleStatus={onToggleStatus}
        onEditType={onEditType}
        onDeleteType={onDeleteType}
        onExport={onExport}
        onImport={onImport}
      />
    );

    const props = mockCrudPage.mock.calls[0][0];
    props.customRowActions[0].onClick({ id: 'item-1', status: 'active' });

    fireEvent.click(
      screen.getByRole('button', { name: 'admin.dictionary_management_page.text_63bb91' })
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'admin.dictionary_management_page.text_c0a407' })
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'admin.dictionary_management_page.text_55405e' })
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'admin.dictionary_management_page.text_8d9a07' })
    );

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    expect(screen.getByText(/order_status/)).toBeInTheDocument();
    expect(screen.getByText(/admin.dictionary_management.custom_dictionary/)).toBeInTheDocument();
    expect(props.schema).toEqual({ name: 'dictItemSchema' });
    expect(props.apiAdapter).toBe(dictItemAdapter);
    expect(props.extraQueryParams).toEqual({ dict_type_id: 'type-selected' });
    expect(onToggleStatus).toHaveBeenCalledWith({ id: 'item-1', status: 'active' });
    expect(onEditType).toHaveBeenCalledWith(selectedType);
    expect(onDeleteType).toHaveBeenCalledWith(selectedType);
    expect(onExport).toHaveBeenCalledTimes(1);
    expect(onImport).toHaveBeenCalledTimes(1);
  });
});

describe('DictionaryTypeModal', () => {
  it('creates a dictionary type and updates draft fields', () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const setNewType = vi.fn();
    const newType: Partial<DictType> = {
      code: 'priority',
      name: '优先级',
      category: 'business',
      description: '',
      status: 'inactive',
    };

    render(
      <DictionaryTypeModal
        open
        editingType={null}
        newType={newType}
        onClose={onClose}
        setEditingType={vi.fn()}
        setNewType={setNewType}
        onSubmit={onSubmit}
      />
    );

    fireEvent.change(screen.getByLabelText(/编码/), {
      target: { value: 'customer_level' },
    });
    fireEvent.change(screen.getByLabelText(/名称/), {
      target: { value: '客户等级' },
    });
    fireEvent.change(screen.getByLabelText('描述'), {
      target: { value: '客户分级字典' },
    });
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(
      screen.getByRole('button', { name: '取消' })
    );
    fireEvent.click(screen.getByRole('button', { name: '创建' }));

    expect(screen.getByText('新建字典类型')).toBeInTheDocument();
    expect(setNewType).toHaveBeenCalledWith({ ...newType, code: 'customer_level' });
    expect(setNewType).toHaveBeenCalledWith({ ...newType, name: '客户等级' });
    expect(setNewType).toHaveBeenCalledWith({ ...newType, description: '客户分级字典' });
    expect(setNewType).toHaveBeenCalledWith({ ...newType, status: 'active' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('edits an existing dictionary type while keeping code disabled', () => {
    const editingType = buildType({ id: 'type-edit', code: 'locked_code', name: '原名称' });
    const setEditingType = vi.fn();
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());

    render(
      <DictionaryTypeModal
        open
        editingType={editingType}
        newType={{}}
        onClose={vi.fn()}
        setEditingType={setEditingType}
        setNewType={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByDisplayValue('locked_code')).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/名称/), {
      target: { value: '新名称' },
    });
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByRole('button', { name: '+ 保存 +' }));

    expect(
      screen.getByText('+ 编辑字典类型 +')
    ).toBeInTheDocument();
    expect(setEditingType).toHaveBeenCalledWith({ ...editingType, name: '新名称' });
    expect(setEditingType).toHaveBeenCalledWith({ ...editingType, status: 'inactive' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
