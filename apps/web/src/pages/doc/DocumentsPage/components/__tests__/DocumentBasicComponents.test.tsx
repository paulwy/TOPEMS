import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils';

import DocumentBatchActions from '../DocumentBatchActions';
import DocumentFilters from '../DocumentFilters';
import DocumentUploadProgress from '../DocumentUploadProgress';
import FileCard from '../FileCard';
import StatCard from '../StatCard';
import type { FileItem, SortField } from '../../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (!options) return key;
      return `${key}:${Object.values(options).join(',')}`;
    },
  }),
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
    Clock: icon('clock'),
    Download: icon('download'),
    Eye: icon('eye'),
    FileText: icon('file-text'),
    MoreVertical: icon('more-vertical'),
    Share2: icon('share'),
    SortAsc: icon('sort-asc'),
    SortDesc: icon('sort-desc'),
    Star: icon('star'),
    Trash2: icon('trash'),
    Type: icon('type'),
  };
});

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
});
