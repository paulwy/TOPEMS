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

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (!options) return key;
      return `${key}:${Object.values(options).join(',')}`;
    },
  }),
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

  it('renders DocumentFilters options and delegates file type changes', () => {
    const onFileTypeChange = vi.fn();
    const onToggleSort = vi.fn();

    renderWithProviders(
      <DocumentFilters
        fileTypeFilter='all'
        onFileTypeChange={onFileTypeChange}
        sortBy='date'
        sortOrder='desc'
        onToggleSort={onToggleSort}
      />
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'pdf' } });

    expect(screen.getByRole('option', { name: 'doc.documents.filter_pdf' })).toBeInTheDocument();
    expect(onFileTypeChange).toHaveBeenCalledWith('pdf');
  });

  it('renders active descending sort icon and delegates sort clicks', () => {
    const onToggleSort = vi.fn();

    renderWithProviders(
      <DocumentFilters
        fileTypeFilter='pdf'
        onFileTypeChange={vi.fn()}
        sortBy='date'
        sortOrder='desc'
        onToggleSort={onToggleSort}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /doc\.documents\.sort_name/ }));

    expect(screen.getByTestId('icon-sort-desc')).toBeInTheDocument();
    expect(screen.queryByTestId('icon-sort-asc')).not.toBeInTheDocument();
    expect(onToggleSort).toHaveBeenCalledWith<Parameters<(field: SortField) => void>>('name');
  });

  it('renders ascending sort icon when selected field uses ascending order', () => {
    renderWithProviders(
      <DocumentFilters
        fileTypeFilter='all'
        onFileTypeChange={vi.fn()}
        sortBy='size'
        sortOrder='asc'
        onToggleSort={vi.fn()}
      />
    );

    expect(screen.getByTestId('icon-sort-asc')).toBeInTheDocument();
    expect(screen.queryByTestId('icon-sort-desc')).not.toBeInTheDocument();
  });

  it('hides DocumentBatchActions when no files are selected', () => {
    const { container } = renderWithProviders(
      <DocumentBatchActions
        selectedCount={0}
        onClearSelection={vi.fn()}
        onBatchDelete={vi.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders DocumentBatchActions and delegates clear and delete actions', () => {
    const onClearSelection = vi.fn();
    const onBatchDelete = vi.fn();

    renderWithProviders(
      <DocumentBatchActions
        selectedCount={3}
        onClearSelection={onClearSelection}
        onBatchDelete={onBatchDelete}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'doc.documents.clear_selection' }));
    fireEvent.click(screen.getByRole('button', { name: /doc\.documents\.batch_delete/ }));

    expect(screen.getByText('doc.documents.selected_count:3')).toBeInTheDocument();
    expect(onClearSelection).toHaveBeenCalledTimes(1);
    expect(onBatchDelete).toHaveBeenCalledTimes(1);
  });

  it('renders DocumentUploadProgress text and percentage', () => {
    renderWithProviders(<DocumentUploadProgress uploadProgress={72} />);

    expect(screen.getByText('doc.documents.upload_in_progress')).toBeInTheDocument();
    expect(screen.getByText('72%')).toBeInTheDocument();
  });

  it('renders FileCard metadata and tags', () => {
    renderWithProviders(
      <FileCard
        file={documentFile}
        onStarToggle={vi.fn()}
        onDownload={vi.fn()}
        onPreview={vi.fn()}
      />
    );

    expect(screen.getByText('质量审计报告.pdf')).toBeInTheDocument();
    expect(screen.getByText('2.4 MB')).toBeInTheDocument();
    expect(screen.getByText('2026-08-10')).toBeInTheDocument();
    expect(screen.getByText('质量')).toBeInTheDocument();
    expect(screen.getByText('审计')).toBeInTheDocument();
    expect(screen.getByTestId('icon-file-text')).toBeInTheDocument();
  });

  it('delegates FileCard card, preview and download clicks without bubbling action clicks', () => {
    const onClick = vi.fn();
    const onPreview = vi.fn();
    const onDownload = vi.fn();

    renderWithProviders(
      <FileCard
        file={documentFile}
        onStarToggle={vi.fn()}
        onDownload={onDownload}
        onPreview={onPreview}
        onClick={onClick}
      />
    );

    fireEvent.click(screen.getByText('质量审计报告.pdf'));
    fireEvent.click(screen.getByRole('button', { name: /预览/ }));
    fireEvent.click(screen.getByRole('button', { name: /下载/ }));

    expect(onClick).toHaveBeenCalledWith(documentFile);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onPreview).toHaveBeenCalledWith(documentFile);
    expect(onDownload).toHaveBeenCalledWith(documentFile);
  });

  it('delegates FileCard star and selection clicks without opening the file', () => {
    const onClick = vi.fn();
    const onSelect = vi.fn();
    const onStarToggle = vi.fn();

    renderWithProviders(
      <FileCard
        file={{ ...documentFile, starred: true }}
        onStarToggle={onStarToggle}
        onDownload={vi.fn()}
        onPreview={vi.fn()}
        isSelected
        onSelect={onSelect}
        onClick={onClick}
      />
    );

    fireEvent.click(screen.getByTestId('icon-check-circle').parentElement as HTMLElement);
    fireEvent.click(screen.getAllByRole('button')[0]);

    expect(onSelect).toHaveBeenCalledWith('file-1');
    expect(onStarToggle).toHaveBeenCalledWith('file-1');
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders FileCard without optional size and selection control', () => {
    renderWithProviders(
      <FileCard
        file={{
          ...documentFile,
          id: 'folder-1',
          name: '制度归档',
          type: 'folder',
          size: undefined,
          tags: [],
        }}
        onStarToggle={vi.fn()}
        onDownload={vi.fn()}
        onPreview={vi.fn()}
      />
    );

    expect(screen.getByText('制度归档')).toBeInTheDocument();
    expect(screen.getByText('2026-08-10')).toBeInTheDocument();
    expect(screen.queryByText('2.4 MB')).not.toBeInTheDocument();
    expect(screen.queryByTestId('icon-check-circle')).not.toBeInTheDocument();
  });

  it('renders DocumentStats from folders and files', () => {
    renderWithProviders(
      <DocumentStats
        folders={folders}
        files={[documentFile]}
        starredCount={1}
      />
    );

    expect(screen.getByText('doc.documents.stat_folders')).toBeInTheDocument();
    expect(screen.getByText('doc.documents.stat_files')).toBeInTheDocument();
    expect(screen.getByText('doc.documents.stat_starred')).toBeInTheDocument();
    expect(screen.getByText('doc.documents.stat_recent')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getAllByText('1')).toHaveLength(3);
  });

  it('renders DocumentDropZone idle and dragging states with drag callbacks', () => {
    const onDragOver = vi.fn();
    const onDragLeave = vi.fn();
    const onDrop = vi.fn();
    const dropZoneRef = React.createRef<HTMLDivElement>();

    const { rerender, container } = renderWithProviders(
      <DocumentDropZone
        dropZoneRef={dropZoneRef}
        isDragging={false}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      />
    );

    fireEvent.dragOver(container.firstElementChild as HTMLElement);
    fireEvent.dragLeave(container.firstElementChild as HTMLElement);
    fireEvent.drop(container.firstElementChild as HTMLElement);

    expect(screen.getByText('doc.documents.drop_tip')).toBeInTheDocument();
    expect(screen.getByText('doc.documents.drop_format_tip')).toBeInTheDocument();
    expect(onDragOver).toHaveBeenCalledTimes(1);
    expect(onDragLeave).toHaveBeenCalledTimes(1);
    expect(onDrop).toHaveBeenCalledTimes(1);

    rerender(
      <DocumentDropZone
        dropZoneRef={dropZoneRef}
        isDragging
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      />
    );

    expect(screen.getByText('+ doc.documents.drop_release +')).toBeInTheDocument();
  });

  it('renders UploadDialog only while uploading', () => {
    const { container, rerender } = renderWithProviders(
      <UploadDialog
        uploading={false}
        uploadProgress={35}
      />
    );

    expect(container).toBeEmptyDOMElement();

    rerender(
      <UploadDialog
        uploading
        uploadProgress={35}
      />
    );

    expect(screen.getByText('文件上传中...')).toBeInTheDocument();
    expect(screen.getByText('35%')).toBeInTheDocument();
  });

  it('creates a folder with parent id and closes the dialog on success', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    const mutateAsync = vi.fn().mockResolvedValue({ success: true });

    renderWithProviders(
      <CreateFolderModal
        isOpen
        onClose={onClose}
        onSuccess={onSuccess}
        parentId='folder-parent'
        createFolderMutation={{ mutateAsync }}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('输入文件夹名称'), {
      target: { value: ' 新建资料 ' },
    });
    fireEvent.click(screen.getByRole('button', { name: '创建' }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        name: '新建资料',
        parentId: 'folder-parent',
      });
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows CreateFolderModal validation and mutation errors', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ success: false, message: '名称重复' });

    renderWithProviders(
      <CreateFolderModal
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        createFolderMutation={{ mutateAsync }}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('输入文件夹名称'), {
      target: { value: '资料库' },
    });
    fireEvent.click(screen.getByRole('button', { name: '创建' }));

    await waitFor(() => {
      expect(screen.getByText('名称重复')).toBeInTheDocument();
    });
  });

  it('renders DocumentHeader and delegates navigation, search and toolbar actions', () => {
    const onSearchChange = vi.fn();
    const onToggleFilters = vi.fn();
    const onViewModeChange = vi.fn();
    const onUploadClick = vi.fn();
    const onNewFolderClick = vi.fn();
    const onFileUpload = vi.fn();
    const fileInputRef = React.createRef<HTMLInputElement>();

    renderWithProviders(
      <DocumentHeader
        searchQuery='质量'
        onSearchChange={onSearchChange}
        showFilters={false}
        onToggleFilters={onToggleFilters}
        viewMode='grid'
        onViewModeChange={onViewModeChange}
        uploading={false}
        onUploadClick={onUploadClick}
        onNewFolderClick={onNewFolderClick}
        fileInputRef={fileInputRef}
        onFileUpload={onFileUpload}
        selectedFolder={folders[0]}
      >
        <div>header-child</div>
      </DocumentHeader>
    );

    fireEvent.click(screen.getByTestId('icon-chevron-left').closest('button') as HTMLButtonElement);
    fireEvent.change(screen.getByPlaceholderText('doc.documents.search_placeholder'), {
      target: { value: '审计' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'doc.documents.filter' }));
    fireEvent.click(screen.getByTestId('icon-list').closest('button') as HTMLButtonElement);
    fireEvent.click(screen.getByTestId('icon-plus').closest('button') as HTMLButtonElement);
    fireEvent.click(screen.getByRole('button', { name: /doc\.documents\.upload/ }));

    expect(screen.getByText('doc.documents.file_management')).toBeInTheDocument();
    expect(screen.getByText('/ 质量制度')).toBeInTheDocument();
    expect(screen.getByText('header-child')).toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    expect(onSearchChange).toHaveBeenCalledWith('审计');
    expect(onToggleFilters).toHaveBeenCalledTimes(1);
    expect(onViewModeChange).toHaveBeenCalledWith('list');
    expect(onNewFolderClick).toHaveBeenCalledTimes(1);
    expect(onUploadClick).toHaveBeenCalledTimes(1);
  });

  it('renders DocumentSidebar and delegates folder selection and deletion', () => {
    const onFolderSelect = vi.fn();
    const onDeleteFolder = vi.fn();

    renderWithProviders(
      <DocumentSidebar
        folders={folders}
        selectedFolderId='folder-1'
        onFolderSelect={onFolderSelect}
        onDeleteFolder={onDeleteFolder}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /doc\.documents\.all_files/ }));
    fireEvent.click(screen.getByRole('button', { name: /审计归档/ }));
    fireEvent.click(screen.getAllByTestId('icon-trash')[0].closest('button') as HTMLButtonElement);

    expect(onFolderSelect).toHaveBeenNthCalledWith(1, null);
    expect(onFolderSelect).toHaveBeenNthCalledWith(2, 'folder-2');
    expect(onDeleteFolder).toHaveBeenCalledWith('folder-1', '质量制度');
  });

  it('renders DocumentTree and delegates folder selection and deletion', () => {
    const onSelectFolder = vi.fn();
    const onDeleteFolder = vi.fn();

    renderWithProviders(
      <DocumentTree
        folders={folders}
        selectedFolderId={null}
        onSelectFolder={onSelectFolder}
        onDeleteFolder={onDeleteFolder}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /全部文件/ }));
    fireEvent.click(screen.getByRole('button', { name: /质量制度/ }));
    fireEvent.click(screen.getAllByTestId('icon-trash')[1].closest('button') as HTMLButtonElement);

    expect(onSelectFolder).toHaveBeenNthCalledWith(1, null);
    expect(onSelectFolder).toHaveBeenNthCalledWith(2, 'folder-1');
    expect(onDeleteFolder).toHaveBeenCalledWith('folder-2', '审计归档');
  });

  it('renders DocumentGrid folder and file cards with delegated callbacks', () => {
    const onFolderSelect = vi.fn();
    const onDeleteFolder = vi.fn();
    const onStarToggle = vi.fn();
    const onDownload = vi.fn();
    const onPreview = vi.fn();
    const onToggleFileSelect = vi.fn();
    const onFileClick = vi.fn();

    renderWithProviders(
      <DocumentGrid
        items={[displayFolder, displayFile]}
        selectedFiles={['file-1']}
        onFolderSelect={onFolderSelect}
        onDeleteFolder={onDeleteFolder}
        onStarToggle={onStarToggle}
        onDownload={onDownload}
        onPreview={onPreview}
        onToggleFileSelect={onToggleFileSelect}
        onFileClick={onFileClick}
      />
    );

    fireEvent.click(screen.getByText('质量制度'));
    fireEvent.click(screen.getByRole('button', { name: /doc\.documents\.delete_folder/ }));
    fireEvent.click(screen.getByText('质量审计报告.pdf'));
    fireEvent.click(screen.getByTestId('icon-check-circle').parentElement as HTMLElement);

    expect(onFolderSelect).toHaveBeenCalledWith('folder-1');
    expect(onDeleteFolder).toHaveBeenCalledWith('folder-1', '质量制度');
    expect(onFileClick).toHaveBeenCalledWith(displayFile);
    expect(onToggleFileSelect).toHaveBeenCalledWith('file-1');
  });
});
