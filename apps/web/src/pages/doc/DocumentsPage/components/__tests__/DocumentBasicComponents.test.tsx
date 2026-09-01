import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/__tests__/test-utils';

import DocumentBatchActions from '../DocumentBatchActions';
import DocumentDropZone from '../DocumentDropZone';
import DocumentFilters from '../DocumentFilters';
import DocumentGrid from '../DocumentGrid';
import DocumentHeader from '../DocumentHeader';
import DocumentSidebar from '../DocumentSidebar';
import DocumentStats from '../DocumentStats';
import { DocumentTree } from '../DocumentTree';
import DocumentUploadProgress from '../DocumentUploadProgress';
import FileCard from '../FileCard';
import CreateFolderModal from '../CreateFolderModal';
import UploadDialog from '../UploadDialog';
import StatCard from '../StatCard';
import type { Folder } from '@/api/doc';
import type { DisplayItem, FileItem, SortField } from '../../types';

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const { i18nMap, translate } = vi.hoisted(() => {
  const i18nMap: Record<string, string> = {
    'pages.file_card.k0': '预览',
    'pages.file_card.k1': '下载',
    'pages.file_card.k2': '分享',
    'pages.upload_dialog.k0': '文件上传中...',
    'pages.create_folder_modal.k0': '请输入文件夹名称',
    'pages.create_folder_modal.k1': '取消',
    'pages.create_folder_modal.k2': '创建失败',
    'pages.create_folder_modal.k3': '创建文件夹',
    'pages.create_folder_modal.k4': '输入文件夹名称',
    'pages.create_folder_modal.k5': '创建',
    'pages.document_tree.k0': '全部文件',
    'pages.document_tree.k1': '删除',
  };

  const translate = (key: string, options?: Record<string, unknown>): string => {
    if (i18nMap[key]) {
      let result = i18nMap[key];
      if (options) {
        for (const [k, v] of Object.entries(options)) {
          result = result.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
        }
      }
      return result;
    }
    if (!options) return key;
    return `${key}:${Object.values(options).join(',')}`;
  };

  return { i18nMap, translate };
});

vi.mock('react-i18next', () => ({
  useTranslation: (ns?: string) => ({
    t: (key: string, options?: Record<string, unknown>) => translate(key, options),
    i18n: { language: 'zh-CN', changeLanguage: vi.fn(), exists: (k: string) => !!i18nMap[k] },
    ready: true,
  }),
  withTranslation: () => (Component: any) => Component,
  initReactI18next: { type: '3rdParty', init: vi.fn() },
  Trans: ({ i18nKey, children }: { i18nKey?: string; children?: any }) =>
    i18nKey ? translate(i18nKey) : children,
}));

vi.mock('@/i18n', () => ({
  default: {
    t: (key: string, options?: Record<string, unknown>) => translate(key, options),
    language: 'zh-CN',
    changeLanguage: vi.fn(),
    exists: (key: string) => !!i18nMap[key],
  },
}));

vi.mock('@/components/theme/ModeToggle', () => ({
  ModeToggle: () => <button type='button'>mode-toggle</button>,
}));

vi.mock('@/routes/dashboard', () => ({
  DASHBOARD_PATHS: {
    dashboard: '/dashboard',
  },
}));

vi.mock('@/utils/logger', () => ({
  apiLogger: {
    error: vi.fn(),
  },
}));

vi.mock('lucide-react', async () => {
  const React = await import('react');
  const icon =
    (name: string) =>
    ({ sx: _sx, ...props }: Record<string, unknown>) =>
      React.createElement('svg', {
        'data-testid': `icon-${name}`,
        ...props,
      });

  return {
    CheckCircle: icon('check-circle'),
    ChevronLeft: icon('chevron-left'),
    Clock: icon('clock'),
    Download: icon('download'),
    Eye: icon('eye'),
    FileText: icon('file-text'),
    Filter: icon('filter'),
    Folder: icon('folder'),
    FolderOpen: icon('folder-open'),
    Grid3X3: icon('grid'),
    History: icon('history'),
    List: icon('list'),
    MoreVertical: icon('more-vertical'),
    Plus: icon('plus'),
    Search: icon('search'),
    Share2: icon('share'),
    SortAsc: icon('sort-asc'),
    SortDesc: icon('sort-desc'),
    Star: icon('star'),
    Trash2: icon('trash'),
    Type: icon('type'),
    Upload: icon('upload'),
  };
});

const folders: Folder[] = [
  {
    id: 'folder-1',
    name: '质量制度',
    parentId: null,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-09T00:00:00Z',
    created_by: 'user-1',
  },
  {
    id: 'folder-2',
    name: '审计归档',
    parentId: null,
    created_at: '2026-08-02T00:00:00Z',
    updated_at: '2026-08-10T00:00:00Z',
    created_by: 'user-1',
  },
];

const documentFile: FileItem = {
  id: 'file-1',
  name: '质量审计报告.pdf',
  type: 'file',
  size: '2.4 MB',
  sizeBytes: 2_400_000,
  updatedAt: '2026-08-10',
  starred: false,
  tags: ['质量', '审计'],
  content_type: 'application/pdf',
  folder_id: null,
};

const displayFolder: DisplayItem = {
  id: 'folder-1',
  name: '质量制度',
  type: 'folder',
  updatedAt: '2026-08-09',
  updatedAtRaw: 1_786_230_000,
  starred: false,
  tags: [],
};

const displayFile: DisplayItem = {
  ...documentFile,
  updatedAtRaw: 1_786_320_000,
};

describe('Document basic components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders StatCard title, value and injected icon', () => {
    const TestIcon = ({ size }: { size?: number }) => (
      <svg
        data-testid='stat-icon'
        data-size={size}
      />
    );

    renderWithProviders(
      <StatCard
        icon={TestIcon}
        title='文档总数'
        value='128'
        color='blue'
      />
    );

    expect(screen.getByText('文档总数')).toBeInTheDocument();
    expect(screen.getByText('128')).toBeInTheDocument();
    expect(screen.getByTestId('stat-icon')).toHaveAttribute('data-size', '24');
  });
});
