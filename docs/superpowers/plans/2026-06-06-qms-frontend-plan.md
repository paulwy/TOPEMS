# QMS 前端完善实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完善 QMS 前端四大模块的 CRUD 功能、搜索筛选分页、详情面板和统计看板

**Architecture:** 基于 React + TypeScript + Tailwind CSS，使用组件化架构，共享通用组件，模态框表单编辑，右侧抽屉展示详情

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Headless UI, Recharts

---

## 文件结构

```
services/topems-qms/frontend/src/
├── components/
│   ├── common/
│   │   ├── Modal.tsx
│   │   ├── FormModal.tsx
│   │   ├── SearchBar.tsx
│   │   ├── Pagination.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── ConfirmDialog.tsx
│   │   └── DetailDrawer.tsx
│   └── qms/
│       ├── StandardForm.tsx
│       ├── InspectionForm.tsx
│       ├── IssueForm.tsx
│       └── ActionForm.tsx
├── pages/
│   ├── QualityStandardList.tsx
│   ├── QualityInspectionList.tsx
│   ├── QualityIssueList.tsx
│   ├── CorrectiveActionList.tsx
│   └── QmsDashboard.tsx
├── types/
│   └── qms.ts
└── api/
    ├── client.ts
    └── qualityStandard.ts
```

---

## Task 1: 创建通用组件 - Modal 和 FormModal

**Files:**
- Create: `services/topems-qms/frontend/src/components/common/Modal.tsx`
- Create: `services/topems-qms/frontend/src/components/common/FormModal.tsx`

- [ ] **Step 1: 创建 Modal.tsx 基础模态框组件**

```tsx
import React, { useEffect, useCallback } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
}) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black bg-opacity-25 transition-opacity"
          onClick={onClose}
        />
        <div className={`relative bg-white rounded-lg shadow-xl w-full ${sizeClasses[size]}`}>
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <span className="sr-only">关闭</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="px-6 py-4">{children}</div>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: 创建 FormModal.tsx 表单模态框组件**

```tsx
import React from 'react';
import { Modal } from './Modal';

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onSubmit: () => void;
  loading?: boolean;
  submitText?: string;
  cancelText?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

export const FormModal: React.FC<FormModalProps> = ({
  isOpen,
  onClose,
  title,
  onSubmit,
  loading = false,
  submitText = '提交',
  cancelText = '取消',
  size = 'md',
  children,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size={size}>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
        <div className="space-y-4">{children}</div>
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {cancelText}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? '提交中...' : submitText}
          </button>
        </div>
      </form>
    </Modal>
  );
};
```

- [ ] **Step 3: Commit**

```bash
cd /Users/air/TOPEMS/services/topems-qms/frontend
git add src/components/common/Modal.tsx src/components/common/FormModal.tsx
git commit -m "feat(qms): add Modal and FormModal components"
```

---

## Task 2: 创建通用组件 - SearchBar 和 Pagination

**Files:**
- Create: `services/topems-qms/frontend/src/components/common/SearchBar.tsx`
- Create: `services/topems-qms/frontend/src/components/common/Pagination.tsx`

- [ ] **Step 1: 创建 SearchBar.tsx 搜索栏组件**

```tsx
import React, { useState, useCallback } from 'react';

interface Filter {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

interface SearchBarProps {
  onSearch: (keyword: string) => void;
  onFilterChange?: (filters: Record<string, string>) => void;
  filters?: Filter[];
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  onFilterChange,
  filters = [],
  placeholder = '搜索...',
}) => {
  const [keyword, setKeyword] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>({});

  const handleKeywordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setKeyword(value);
    onSearch(value);
  }, [onSearch]);

  const handleFilterChange = useCallback((key: string, value: string) => {
    const newFilters = { ...selectedFilters, [key]: value };
    setSelectedFilters(newFilters);
    onFilterChange?.(newFilters);
  }, [selectedFilters, onFilterChange]);

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-4">
      <div className="flex-1">
        <input
          type="text"
          value={keyword}
          onChange={handleKeywordChange}
          placeholder={placeholder}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      {filters.map((filter) => (
        <div key={filter.key} className="w-full sm:w-48">
          <select
            value={selectedFilters[filter.key] || ''}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">{filter.label}</option>
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
};
```

- [ ] **Step 2: 创建 Pagination.tsx 分页组件**

```tsx
import React from 'react';

interface PaginationProps {
  currentPage: number;
  pageSize: number;
  total: number;
  onChange: (page: number, pageSize?: number) => void;
  pageSizeOptions?: number[];
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  pageSize,
  total,
  onChange,
  pageSizeOptions = [10, 20, 50, 100],
}) => {
  const totalPages = Math.ceil(total / pageSize);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onChange(page, pageSize);
    }
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(1, Number(e.target.value));
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
      <div className="text-sm text-gray-700">
        共 <span className="font-medium">{total}</span> 条记录，每页
        <select
          value={pageSize}
          onChange={handlePageSizeChange}
          className="mx-2 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        条
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1}
          className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          首页
        </button>
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          上一页
        </button>
        <span className="px-4 py-1 text-sm">
          第 {currentPage} / {totalPages} 页
        </span>
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          下一页
        </button>
        <button
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          末页
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Commit**

```bash
git add src/components/common/SearchBar.tsx src/components/common/Pagination.tsx
git commit -m "feat(qms): add SearchBar and Pagination components"
```

---

## Task 3: 创建通用组件 - StatusBadge、ConfirmDialog、DetailDrawer

**Files:**
- Create: `services/topems-qms/frontend/src/components/common/StatusBadge.tsx`
- Create: `services/topems-qms/frontend/src/components/common/ConfirmDialog.tsx`
- Create: `services/topems-qms/frontend/src/components/common/DetailDrawer.tsx`

- [ ] **Step 1: 创建 StatusBadge.tsx 状态徽章组件**

```tsx
import React from 'react';

interface StatusConfig {
  label: string;
  color: string;
}

interface StatusBadgeProps {
  status: string;
  statusMap: Record<string, StatusConfig>;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, statusMap }) => {
  const config = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
      {config.label}
    </span>
  );
};
```

- [ ] **Step 2: 创建 ConfirmDialog.tsx 确认对话框组件**

```tsx
import React from 'react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  type?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  loading = false,
  type = 'danger',
}) => {
  const buttonClass = {
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    warning: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
    info: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="py-4">
        <p className="text-sm text-gray-600">{message}</p>
      </div>
      <div className="flex justify-end space-x-3">
        <button
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${buttonClass[type]}`}
        >
          {loading ? '处理中...' : confirmText}
        </button>
      </div>
    </Modal>
  );
};
```

- [ ] **Step 3: 创建 DetailDrawer.tsx 详情抽屉组件**

```tsx
import React, { useEffect } from 'react';

interface DetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: Record<string, any>;
  fields: { key: string; label: string; render?: (value: any) => React.ReactNode }[];
}

export const DetailDrawer: React.FC<DetailDrawerProps> = ({
  isOpen,
  onClose,
  title,
  data,
  fields,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <span className="sr-only">关闭</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <dl className="space-y-4">
            {fields.map((field) => (
              <div key={field.key}>
                <dt className="text-sm font-medium text-gray-500">{field.label}</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {field.render ? field.render(data[field.key]) : data[field.key] || '-'}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Commit**

```bash
git add src/components/common/StatusBadge.tsx src/components/common/ConfirmDialog.tsx src/components/common/DetailDrawer.tsx
git commit -m "feat(qms): add StatusBadge, ConfirmDialog, and DetailDrawer components"
```

---

## Task 4: 增强 QualityStandardList 页面

**Files:**
- Modify: `services/topems-qms/frontend/src/pages/QualityStandardList.tsx`
- Create: `services/topems-qms/frontend/src/components/qms/StandardForm.tsx`

- [ ] **Step 1: 创建 StandardForm.tsx 质量标准表单组件**

```tsx
import React, { useState, useEffect } from 'react';
import { FormModal } from '../common/FormModal';
import { QualityStandard } from '../../api/qualityStandard';

interface StandardFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<QualityStandard>) => Promise<void>;
  initialData?: QualityStandard;
  loading?: boolean;
}

export const StandardForm: React.FC<StandardFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  loading = false,
}) => {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: '',
    version: '',
    description: '',
    status: 'active',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        code: initialData.code || '',
        name: initialData.name || '',
        category: initialData.category || '',
        version: initialData.version || '',
        description: initialData.description || '',
        status: initialData.status || 'active',
      });
    } else {
      setFormData({ code: '', name: '', category: '', version: '', description: '', status: 'active' });
    }
    setErrors({});
  }, [initialData, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.code.trim()) newErrors.code = '编号不能为空';
    if (!formData.name.trim()) newErrors.name = '名称不能为空';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onSubmit(formData);
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={initialData ? '编辑质量标准' : '创建质量标准'}
      loading={loading}
      size="lg"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">编号 *</label>
          <input
            type="text"
            name="code"
            value={formData.code}
            onChange={handleChange}
            className={`mt-1 block w-full border ${errors.code ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
          />
          {errors.code && <p className="mt-1 text-sm text-red-500">{errors.code}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">名称 *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`mt-1 block w-full border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
          />
          {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">类别</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">请选择</option>
            <option value="产品标准">产品标准</option>
            <option value="过程标准">过程标准</option>
            <option value="检验标准">检验标准</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">版本</label>
          <input
            type="text"
            name="version"
            value={formData.version}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">描述</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">状态</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="draft">草稿</option>
            <option value="active">激活</option>
            <option value="expired">过期</option>
          </select>
        </div>
      </div>
    </FormModal>
  );
};
```

- [ ] **Step 2: 重写 QualityStandardList.tsx 增强版**

```tsx
import React, { useEffect, useState, useCallback } from 'react';
import { qualityStandardApi, QualityStandard } from '../api/qualityStandard';
import { SearchBar } from '../components/common/SearchBar';
import { Pagination } from '../components/common/Pagination';
import { StatusBadge } from '../components/common/StatusBadge';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { DetailDrawer } from '../components/common/DetailDrawer';
import { StandardForm } from '../components/qms/StandardForm';

const statusMap: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-800' },
  active: { label: '激活', color: 'bg-green-100 text-green-800' },
  expired: { label: '过期', color: 'bg-red-100 text-red-800' },
};

const detailFields = [
  { key: 'code', label: '编号' },
  { key: 'name', label: '名称' },
  { key: 'category', label: '类别' },
  { key: 'version', label: '版本' },
  { key: 'description', label: '描述' },
  { key: 'status', label: '状态', render: (v: string) => <StatusBadge status={v} statusMap={statusMap} /> },
  { key: 'created_at', label: '创建时间', render: (v: string) => v ? new Date(v).toLocaleString() : '-' },
  { key: 'updated_at', label: '更新时间', render: (v: string) => v ? new Date(v).toLocaleString() : '-' },
];

const QualityStandardList: React.FC = () => {
  const [standards, setStandards] = useState<QualityStandard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<QualityStandard | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchStandards = useCallback(async () => {
    try {
      setLoading(true);
      const response = await qualityStandardApi.list({ page: currentPage, pageSize, search: keyword, status: statusFilter });
      if (response.success && response.data) {
        setStandards(response.data.standards || []);
        setTotal(response.data.total || 0);
      }
    } catch (err) {
      setError('获取质量标准列表失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, keyword, statusFilter]);

  useEffect(() => { fetchStandards(); }, [fetchStandards]);

  const handleSearch = (kw: string) => { setKeyword(kw); setCurrentPage(1); };
  const handleFilterChange = (filters: Record<string, string>) => { setStatusFilter(filters.status || ''); setCurrentPage(1); };
  const handlePageChange = (page: number, size?: number) => { setCurrentPage(page); if (size) setPageSize(size); };

  const handleCreate = () => { setSelected(undefined); setIsFormOpen(true); };
  const handleEdit = (item: QualityStandard) => { setSelected(item); setIsFormOpen(true); };
  const handleDetail = (item: QualityStandard) => { setSelected(item); setIsDetailOpen(true); };
  const handleDeletePrompt = (item: QualityStandard) => { setSelected(item); setIsDeleteOpen(true); };

  const handleFormSubmit = async (data: Partial<QualityStandard>) => {
    setSubmitting(true);
    try {
      if (selected) {
        await qualityStandardApi.update(selected.id, data);
      } else {
        await qualityStandardApi.create(data as any);
      }
      setIsFormOpen(false);
      fetchStandards();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await qualityStandardApi.delete(selected.id);
      setIsDeleteOpen(false);
      fetchStandards();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && standards.length === 0) {
    return <div className="flex justify-center items-center h-64"><div className="text-gray-500">加载中...</div></div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-64"><div className="text-red-500">{error}</div></div>;
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">质量标准</h1>
          <p className="mt-2 text-sm text-gray-700">管理系统中的所有质量标准</p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button onClick={handleCreate} className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            添加标准
          </button>
        </div>
      </div>

      <div className="mt-6">
        <SearchBar
          onSearch={handleSearch}
          onFilterChange={handleFilterChange}
          filters={[{ key: 'status', label: '按状态筛选', options: [{ value: 'active', label: '激活' }, { value: 'draft', label: '草稿' }, { value: 'expired', label: '过期' }] }]}
          placeholder="搜索编号或名称..."
        />
      </div>

      <div className="mt-4 overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">编号</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">名称</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">类别</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">版本</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">状态</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {standards.map((item) => (
              <tr key={item.id}>
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6 font-medium text-gray-900">{item.code}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{item.name}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{item.category || '-'}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{item.version || '-'}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm"><StatusBadge status={item.status} statusMap={statusMap} /></td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 space-x-2">
                  <button onClick={() => handleDetail(item)} className="text-blue-600 hover:text-blue-800">详情</button>
                  <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800">编辑</button>
                  <button onClick={() => handleDeletePrompt(item)} className="text-red-600 hover:text-red-800">删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {standards.length === 0 && <div className="text-center py-12"><p className="text-gray-500">暂无数据</p></div>}
      </div>

      <Pagination currentPage={currentPage} pageSize={pageSize} total={total} onChange={handlePageChange} />

      <StandardForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSubmit={handleFormSubmit} initialData={selected || undefined} loading={submitting} />

      <DetailDrawer isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title="质量标准详情" data={selected || {}} fields={detailFields} />

      <ConfirmDialog isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} onConfirm={handleDelete} title="删除确认" message={`确定要删除标准 "${selected?.name}" 吗？此操作不可撤销。`} confirmText="删除" loading={submitting} />
    </div>
  );
};

export default QualityStandardList;
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/QualityStandardList.tsx src/components/qms/StandardForm.tsx
git commit -m "feat(qms): enhance QualityStandardList with CRUD, search, filter, pagination"
```

---

## Task 5: 增强 QualityInspectionList 页面

**Files:**
- Modify: `services/topems-qms/frontend/src/pages/QualityInspectionList.tsx`
- Create: `services/topems-qms/frontend/src/components/qms/InspectionForm.tsx`
- Modify: `services/topems-qms/frontend/src/api/qualityStandard.ts` (add inspection API)

- [ ] **Step 1: 在 api/qualityStandard.ts 中添加 inspection API**

```typescript
// 在 qualityStandard.ts 末尾添加

export interface QualityInspection {
  id: string;
  title: string;
  description?: string;
  inspection_type: string;
  standard_id?: string;
  inspector: string;
  status: string;
  result?: string;
  findings?: string;
  inspected_at?: string;
  created_at: string;
  updated_at: string;
}

export const inspectionApi = {
  list: async (params?: { page?: number; pageSize?: number; search?: string; status?: string; inspection_type?: string }) => {
    const response = await apiClient.get('/api/v1/inspections', { params });
    return response.data;
  },
  get: async (id: string) => {
    const response = await apiClient.get(`/api/v1/inspections/${id}`);
    return response.data;
  },
  create: async (data: Partial<QualityInspection>) => {
    const response = await apiClient.post('/api/v1/inspections', data);
    return response.data;
  },
  update: async (id: string, data: Partial<QualityInspection>) => {
    const response = await apiClient.put(`/api/v1/inspections/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/v1/inspections/${id}`);
    return response.data;
  },
};
```

- [ ] **Step 2: 创建 InspectionForm.tsx 质量检查表单组件**

```tsx
import React, { useState, useEffect } from 'react';
import { FormModal } from '../common/FormModal';
import { QualityInspection } from '../../api/qualityStandard';

interface InspectionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<QualityInspection>) => Promise<void>;
  initialData?: QualityInspection;
  loading?: boolean;
}

export const InspectionForm: React.FC<InspectionFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  loading = false,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    inspection_type: '巡检',
    inspector: '',
    status: 'pending',
    description: '',
    result: '',
    findings: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        inspection_type: initialData.inspection_type || '巡检',
        inspector: initialData.inspector || '',
        status: initialData.status || 'pending',
        description: initialData.description || '',
        result: initialData.result || '',
        findings: initialData.findings || '',
      });
    } else {
      setFormData({ title: '', inspection_type: '巡检', inspector: '', status: 'pending', description: '', result: '', findings: '' });
    }
    setErrors({});
  }, [initialData, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = '标题不能为空';
    if (!formData.inspector.trim()) newErrors.inspector = '检查员不能为空';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onSubmit(formData);
  };

  return (
    <FormModal isOpen={isOpen} onClose={onClose} onSubmit={handleSubmit} title={initialData ? '编辑质量检查' : '创建质量检查'} loading={loading} size="lg">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">标题 *</label>
          <input type="text" name="title" value={formData.title} onChange={handleChange}
            className={`mt-1 block w-full border ${errors.title ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500`} />
          {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">检查类型</label>
          <select name="inspection_type" value={formData.inspection_type} onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
            <option value="巡检">巡检</option>
            <option value="定期检查">定期检查</option>
            <option value="专项检查">专项检查</option>
            <option value="来料检查">来料检查</option>
            <option value="出货检查">出货检查</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">检查员 *</label>
          <input type="text" name="inspector" value={formData.inspector} onChange={handleChange}
            className={`mt-1 block w-full border ${errors.inspector ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500`} />
          {errors.inspector && <p className="mt-1 text-sm text-red-500">{errors.inspector}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">状态</label>
          <select name="status" value={formData.status} onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
            <option value="pending">待检查</option>
            <option value="in_progress">检查中</option>
            <option value="completed">已完成</option>
            <option value="cancelled">已取消</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">描述</label>
          <textarea name="description" value={formData.description} onChange={handleChange} rows={3}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">检查结果</label>
          <textarea name="result" value={formData.result} onChange={handleChange} rows={2}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">发现</label>
          <textarea name="findings" value={formData.findings} onChange={handleChange} rows={2}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
        </div>
      </div>
    </FormModal>
  );
};
```

- [ ] **Step 3: 重写 QualityInspectionList.tsx 增强版**

```tsx
import React, { useEffect, useState, useCallback } from 'react';
import { inspectionApi, QualityInspection } from '../api/qualityStandard';
import { SearchBar } from '../components/common/SearchBar';
import { Pagination } from '../components/common/Pagination';
import { StatusBadge } from '../components/common/StatusBadge';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { DetailDrawer } from '../components/common/DetailDrawer';
import { InspectionForm } from '../components/qms/InspectionForm';

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待检查', color: 'bg-yellow-100 text-yellow-800' },
  in_progress: { label: '检查中', color: 'bg-blue-100 text-blue-800' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-800' },
  cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-800' },
};

const QualityInspectionList: React.FC = () => {
  const [inspections, setInspections] = useState<QualityInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selected, setSelected] = useState<QualityInspection | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchInspections = useCallback(async () => {
    try {
      setLoading(true);
      const response = await inspectionApi.list({ page: currentPage, pageSize, search: keyword, status: statusFilter, inspection_type: typeFilter });
      if (response.success && response.data) {
        setInspections(response.data.inspections || []);
        setTotal(response.data.total || 0);
      }
    } catch (err) {
      setError('获取质量检查列表失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, keyword, statusFilter, typeFilter]);

  useEffect(() => { fetchInspections(); }, [fetchInspections]);

  const handleSearch = (kw: string) => { setKeyword(kw); setCurrentPage(1); };
  const handleFilterChange = (filters: Record<string, string>) => {
    setStatusFilter(filters.status || '');
    setTypeFilter(filters.inspection_type || '');
    setCurrentPage(1);
  };
  const handlePageChange = (page: number, size?: number) => { setCurrentPage(page); if (size) setPageSize(size); };
  const handleCreate = () => { setSelected(undefined); setIsFormOpen(true); };
  const handleEdit = (item: QualityInspection) => { setSelected(item); setIsFormOpen(true); };
  const handleDetail = (item: QualityInspection) => { setSelected(item); setIsDetailOpen(true); };
  const handleDeletePrompt = (item: QualityInspection) => { setSelected(item); setIsDeleteOpen(true); };

  const handleFormSubmit = async (data: Partial<QualityInspection>) => {
    setSubmitting(true);
    try {
      if (selected) await inspectionApi.update(selected.id, data);
      else await inspectionApi.create(data);
      setIsFormOpen(false);
      fetchInspections();
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await inspectionApi.delete(selected.id);
      setIsDeleteOpen(false);
      fetchInspections();
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  const detailFields = [
    { key: 'title', label: '标题' },
    { key: 'inspection_type', label: '检查类型' },
    { key: 'inspector', label: '检查员' },
    { key: 'status', label: '状态', render: (v: string) => <StatusBadge status={v} statusMap={statusMap} /> },
    { key: 'description', label: '描述' },
    { key: 'result', label: '检查结果' },
    { key: 'findings', label: '发现' },
    { key: 'created_at', label: '创建时间', render: (v: string) => v ? new Date(v).toLocaleString() : '-' },
  ];

  if (loading && inspections.length === 0) return <div className="flex justify-center items-center h-64"><div className="text-gray-500">加载中...</div></div>;
  if (error) return <div className="flex justify-center items-center h-64"><div className="text-red-500">{error}</div></div>;

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">质量检查</h1>
          <p className="mt-2 text-sm text-gray-700">管理所有质量检查记录</p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button onClick={handleCreate} className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">创建检查</button>
        </div>
      </div>

      <div className="mt-6">
        <SearchBar onSearch={handleSearch} onFilterChange={handleFilterChange}
          filters={[
            { key: 'status', label: '按状态', options: [{ value: 'pending', label: '待检查' }, { value: 'in_progress', label: '检查中' }, { value: 'completed', label: '已完成' }] },
            { key: 'inspection_type', label: '按类型', options: [{ value: '巡检', label: '巡检' }, { value: '定期检查', label: '定期检查' }, { value: '专项检查', label: '专项检查' }] }
          ]} placeholder="搜索标题..." />
      </div>

      <div className="mt-4 overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">标题</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">检查类型</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">检查员</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">状态</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {inspections.map((item) => (
              <tr key={item.id}>
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6 font-medium text-gray-900">{item.title}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{item.inspection_type}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{item.inspector}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm"><StatusBadge status={item.status} statusMap={statusMap} /></td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 space-x-2">
                  <button onClick={() => handleDetail(item)} className="text-blue-600 hover:text-blue-800">详情</button>
                  <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800">编辑</button>
                  <button onClick={() => handleDeletePrompt(item)} className="text-red-600 hover:text-red-800">删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {inspections.length === 0 && <div className="text-center py-12"><p className="text-gray-500">暂无数据</p></div>}
      </div>

      <Pagination currentPage={currentPage} pageSize={pageSize} total={total} onChange={handlePageChange} />
      <InspectionForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSubmit={handleFormSubmit} initialData={selected || undefined} loading={submitting} />
      <DetailDrawer isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title="质量检查详情" data={selected || {}} fields={detailFields} />
      <ConfirmDialog isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} onConfirm={handleDelete} title="删除确认" message={`确定要删除检查 "${selected?.title}" 吗？`} confirmText="删除" loading={submitting} />
    </div>
  );
};

export default QualityInspectionList;
```

- [ ] **Step 4: Commit**

```bash
git add src/api/qualityStandard.ts src/pages/QualityInspectionList.tsx src/components/qms/InspectionForm.tsx
git commit -m "feat(qms): enhance QualityInspectionList with CRUD, search, filter, pagination"
```

---

## Task 6: 增强 QualityIssueList 页面

**Files:**
- Modify: `services/topems-qms/frontend/src/pages/QualityIssueList.tsx`
- Create: `services/topems-qms/frontend/src/components/qms/IssueForm.tsx`
- Add issue API methods

- [ ] **Step 1: 在 api/qualityStandard.ts 中添加 issue API**

```typescript
// 在文件末尾添加

export interface QualityIssue {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  source?: string;
  related_inspection_id?: string;
  assigned_to?: string;
  priority?: string;
  due_date?: string;
  resolution?: string;
  created_at: string;
  updated_at: string;
}

export const issueApi = {
  list: async (params?: { page?: number; pageSize?: number; search?: string; status?: string; severity?: string }) => {
    const response = await apiClient.get('/api/v1/issues', { params });
    return response.data;
  },
  get: async (id: string) => {
    const response = await apiClient.get(`/api/v1/issues/${id}`);
    return response.data;
  },
  create: async (data: Partial<QualityIssue>) => {
    const response = await apiClient.post('/api/v1/issues', data);
    return response.data;
  },
  update: async (id: string, data: Partial<QualityIssue>) => {
    const response = await apiClient.put(`/api/v1/issues/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/v1/issues/${id}`);
    return response.data;
  },
};
```

- [ ] **Step 2: 创建 IssueForm.tsx 质量问题表单组件**

```tsx
import React, { useState, useEffect } from 'react';
import { FormModal } from '../common/FormModal';
import { QualityIssue } from '../../api/qualityStandard';

interface IssueFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<QualityIssue>) => Promise<void>;
  initialData?: QualityIssue;
  loading?: boolean;
}

export const IssueForm: React.FC<IssueFormProps> = ({ isOpen, onClose, onSubmit, initialData, loading = false }) => {
  const [formData, setFormData] = useState({ title: '', description: '', severity: 'major', status: 'open', source: '', assigned_to: '', priority: 'medium' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '', description: initialData.description || '',
        severity: initialData.severity || 'major', status: initialData.status || 'open',
        source: initialData.source || '', assigned_to: initialData.assigned_to || '',
        priority: initialData.priority || 'medium',
      });
    } else {
      setFormData({ title: '', description: '', severity: 'major', status: 'open', source: '', assigned_to: '', priority: 'medium' });
    }
    setErrors({});
  }, [initialData, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = '标题不能为空';
    if (!formData.description.trim()) newErrors.description = '描述不能为空';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => { if (!validate()) return; await onSubmit(formData); };

  return (
    <FormModal isOpen={isOpen} onClose={onClose} onSubmit={handleSubmit} title={initialData ? '编辑质量问题' : '报告问题'} loading={loading} size="lg">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">标题 *</label>
          <input type="text" name="title" value={formData.title} onChange={handleChange}
            className={`mt-1 block w-full border ${errors.title ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500`} />
          {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">描述 *</label>
          <textarea name="description" value={formData.description} onChange={handleChange} rows={3}
            className={`mt-1 block w-full border ${errors.description ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500`} />
          {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">严重程度</label>
          <select name="severity" value={formData.severity} onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
            <option value="critical">严重</option>
            <option value="major">一般</option>
            <option value="minor">轻微</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">状态</label>
          <select name="status" value={formData.status} onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
            <option value="open">开放</option>
            <option value="in_progress">处理中</option>
            <option value="resolved">已解决</option>
            <option value="closed">已关闭</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">来源</label>
          <input type="text" name="source" value={formData.source} onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">负责人</label>
          <input type="text" name="assigned_to" value={formData.assigned_to} onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">优先级</label>
          <select name="priority" value={formData.priority} onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
        </div>
      </div>
    </FormModal>
  );
};
```

- [ ] **Step 3: 重写 QualityIssueList.tsx 增强版（参考 Task 4 和 Task 5 的模式）**

- [ ] **Step 4: Commit**

---

## Task 7: 增强 CorrectiveActionList 页面

**Files:**
- Modify: `services/topems-qms/frontend/src/pages/CorrectiveActionList.tsx`
- Create: `services/topems-qms/frontend/src/components/qms/ActionForm.tsx`
- Add corrective action API methods

- [ ] **Step 1: 在 api/qualityStandard.ts 中添加 corrective action API**

```typescript
// 在文件末尾添加

export interface CorrectiveAction {
  id: string;
  issue_id: string;
  title: string;
  description?: string;
  action_type: string;
  assigned_to: string;
  status: string;
  implementation_date?: string;
  verification_result?: string;
  verified_by?: string;
  created_at: string;
  updated_at: string;
}

export const correctiveActionApi = {
  list: async (params?: { page?: number; pageSize?: number; search?: string; status?: string; action_type?: string }) => {
    const response = await apiClient.get('/api/v1/corrective-actions', { params });
    return response.data;
  },
  get: async (id: string) => {
    const response = await apiClient.get(`/api/v1/corrective-actions/${id}`);
    return response.data;
  },
  create: async (data: Partial<CorrectiveAction>) => {
    const response = await apiClient.post('/api/v1/corrective-actions', data);
    return response.data;
  },
  update: async (id: string, data: Partial<CorrectiveAction>) => {
    const response = await apiClient.put(`/api/v1/corrective-actions/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/v1/corrective-actions/${id}`);
    return response.data;
  },
};
```

- [ ] **Step 2: 创建 ActionForm.tsx 纠正措施表单组件**

```tsx
import React, { useState, useEffect } from 'react';
import { FormModal } from '../common/FormModal';
import { CorrectiveAction } from '../../api/qualityStandard';

interface ActionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<CorrectiveAction>) => Promise<void>;
  initialData?: CorrectiveAction;
  loading?: boolean;
}

export const ActionForm: React.FC<ActionFormProps> = ({ isOpen, onClose, onSubmit, initialData, loading = false }) => {
  const [formData, setFormData] = useState({ issue_id: '', title: '', description: '', action_type: 'corrective', assigned_to: '', status: 'pending' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        issue_id: initialData.issue_id || '', title: initialData.title || '',
        description: initialData.description || '', action_type: initialData.action_type || 'corrective',
        assigned_to: initialData.assigned_to || '', status: initialData.status || 'pending',
      });
    } else {
      setFormData({ issue_id: '', title: '', description: '', action_type: 'corrective', assigned_to: '', status: 'pending' });
    }
    setErrors({});
  }, [initialData, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = '标题不能为空';
    if (!formData.assigned_to.trim()) newErrors.assigned_to = '负责人不能为空';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => { if (!validate()) return; await onSubmit(formData); };

  return (
    <FormModal isOpen={isOpen} onClose={onClose} onSubmit={handleSubmit} title={initialData ? '编辑纠正措施' : '创建措施'} loading={loading} size="lg">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">标题 *</label>
          <input type="text" name="title" value={formData.title} onChange={handleChange}
            className={`mt-1 block w-full border ${errors.title ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500`} />
          {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">类型</label>
          <select name="action_type" value={formData.action_type} onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
            <option value="corrective">纠正</option>
            <option value="preventive">预防</option>
            <option value="improvement">改进</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">负责人 *</label>
          <input type="text" name="assigned_to" value={formData.assigned_to} onChange={handleChange}
            className={`mt-1 block w-full border ${errors.assigned_to ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500`} />
          {errors.assigned_to && <p className="mt-1 text-sm text-red-500">{errors.assigned_to}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">状态</label>
          <select name="status" value={formData.status} onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
            <option value="pending">待执行</option>
            <option value="in_progress">执行中</option>
            <option value="completed">已完成</option>
            <option value="verified">已验证</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">描述</label>
          <textarea name="description" value={formData.description} onChange={handleChange} rows={3}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
        </div>
      </div>
    </FormModal>
  );
};
```

- [ ] **Step 3: 重写 CorrectiveActionList.tsx 增强版（参考 Task 4 和 Task 5 的模式）**

- [ ] **Step 4: Commit**

---

## Task 8: 创建 QmsDashboard 统计看板页面

**Files:**
- Create: `services/topems-qms/frontend/src/pages/QmsDashboard.tsx`
- Modify: `services/topems-qms/frontend/src/App.tsx` (add dashboard tab)

- [ ] **Step 1: 创建 QmsDashboard.tsx 统计看板组件**

```tsx
import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import apiClient from '../api/client';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const QmsDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [inspectionRes, issueRes, actionRes] = await Promise.all([
        apiClient.get('/api/v1/inspections'),
        apiClient.get('/api/v1/issues'),
        apiClient.get('/api/v1/corrective-actions'),
      ]);

      const inspections = inspectionRes.data?.data?.inspections || [];
      const issues = issueRes.data?.data?.issues || [];
      const actions = actionRes.data?.data?.actions || [];

      // Process inspection stats
      const inspectionStats = {
        total: inspections.length,
        pending: inspections.filter((i: any) => i.status === 'pending').length,
        in_progress: inspections.filter((i: any) => i.status === 'in_progress').length,
        completed: inspections.filter((i: any) => i.status === 'completed').length,
      };

      // Process issue stats
      const issueStats = {
        total: issues.length,
        open: issues.filter((i: any) => i.status === 'open').length,
        in_progress: issues.filter((i: any) => i.status === 'in_progress').length,
        resolved: issues.filter((i: any) => i.status === 'resolved').length,
        critical: issues.filter((i: any) => i.severity === 'critical').length,
      };

      // Process action stats
      const actionStats = {
        total: actions.length,
        pending: actions.filter((a: any) => a.status === 'pending').length,
        in_progress: actions.filter((a: any) => a.status === 'in_progress').length,
        completed: actions.filter((a: any) => a.status === 'completed').length,
        verified: actions.filter((a: any) => a.status === 'verified').length,
      };

      setStats({ inspectionStats, issueStats, actionStats });
    } catch (err) {
      console.error('获取统计数据失败', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="text-gray-500">加载中...</div></div>;
  }

  const inspectionPieData = [
    { name: '待检查', value: stats?.inspectionStats?.pending || 0 },
    { name: '检查中', value: stats?.inspectionStats?.in_progress || 0 },
    { name: '已完成', value: stats?.inspectionStats?.completed || 0 },
  ];

  const issueBarData = [
    { name: '开放', value: stats?.issueStats?.open || 0 },
    { name: '处理中', value: stats?.issueStats?.in_progress || 0 },
    { name: '已解决', value: stats?.issueStats?.resolved || 0 },
  ];

  const actionBarData = [
    { name: '待执行', value: stats?.actionStats?.pending || 0 },
    { name: '执行中', value: stats?.actionStats?.in_progress || 0 },
    { name: '已完成', value: stats?.actionStats?.completed || 0 },
    { name: '已验证', value: stats?.actionStats?.verified || 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">QMS 统计看板</h1>
          <p className="mt-2 text-sm text-gray-700">质量管理系统数据概览</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">质量检查总数</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats?.inspectionStats?.total || 0}</dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">质量问题总数</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats?.issueStats?.total || 0}</dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">纠正措施总数</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats?.actionStats?.total || 0}</dd>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Inspection Pie Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">质量检查状态分布</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={inspectionPieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>
                {inspectionPieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Issue Bar Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">质量问题状态分布</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={issueBarData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#0088FE" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Action Bar Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">纠正措施状态分布</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={actionBarData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#00C49F" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default QmsDashboard;
```

- [ ] **Step 2: 修改 App.tsx 添加 Dashboard Tab**

```tsx
import React from 'react';
import QualityStandardList from './pages/QualityStandardList';
import QualityInspectionList from './pages/QualityInspectionList';
import QualityIssueList from './pages/QualityIssueList';
import CorrectiveActionList from './pages/CorrectiveActionList';
import QmsDashboard from './pages/QmsDashboard';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = React.useState('standards');

  const renderContent = () => {
    switch (activeTab) {
      case 'standards':
        return <QualityStandardList />;
      case 'inspections':
        return <QualityInspectionList />;
      case 'issues':
        return <QualityIssueList />;
      case 'actions':
        return <CorrectiveActionList />;
      case 'dashboard':
        return <QmsDashboard />;
      default:
        return <QualityStandardList />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">TOPEMS-QMS 质量管理</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <button onClick={() => setActiveTab('dashboard')} className={`${activeTab === 'dashboard' ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>看板</button>
                <button onClick={() => setActiveTab('standards')} className={`${activeTab === 'standards' ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>质量标准</button>
                <button onClick={() => setActiveTab('inspections')} className={`${activeTab === 'inspections' ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>质量检查</button>
                <button onClick={() => setActiveTab('issues')} className={`${activeTab === 'issues' ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>质量问题</button>
                <button onClick={() => setActiveTab('actions')} className={`${activeTab === 'actions' ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>纠正措施</button>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">{renderContent()}</main>
    </div>
  );
}

export default App;
```

- [ ] **Step 3: 安装 recharts 依赖**

```bash
cd /Users/air/TOPEMS/services/topems-qms/frontend
npm install recharts
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/QmsDashboard.tsx src/App.tsx
git commit -m "feat(qms): add QmsDashboard with charts and statistics"
```

---

## Task 9: 添加 common 组件的 index 导出

**Files:**
- Create: `services/topems-qms/frontend/src/components/common/index.ts`

- [ ] **Step 1: 创建 index.ts 统一导出**

```typescript
export { Modal } from './Modal';
export { FormModal } from './FormModal';
export { SearchBar } from './SearchBar';
export { Pagination } from './Pagination';
export { StatusBadge } from './StatusBadge';
export { ConfirmDialog } from './ConfirmDialog';
export { DetailDrawer } from './DetailDrawer';
```

- [ ] **Step 2: Commit**

```bash
git add src/components/common/index.ts
git commit -m "chore(qms): add common components index export"
```

---

## 实施计划总结

| Task | 描述 | 文件变化 |
|------|------|----------|
| 1 | Modal/FormModal 组件 | +2 new |
| 2 | SearchBar/Pagination 组件 | +2 new |
| 3 | StatusBadge/ConfirmDialog/DetailDrawer 组件 | +3 new |
| 4 | 质量标准模块增强 | +1 new, +1 mod |
| 5 | 质量检查模块增强 | +1 new, +2 mod |
| 6 | 质量问题模块增强 | +1 new, +2 mod |
| 7 | 纠正措施模块增强 | +1 new, +2 mod |
| 8 | 统计看板页面 | +1 new, +1 mod |
| 9 | 组件导出文件 | +1 new |

**总计**: +12 新文件, +8 修改文件

---

**Plan complete and saved to `docs/superpowers/plans/2026-06-06-qms-frontend-plan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
