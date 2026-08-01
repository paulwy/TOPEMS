import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import { PageHeader } from '../PageHeader';
import { renderWithProviders } from '@/__tests__/test-utils';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@topems/shared-components', () => ({
  BackButton: ({ onClick, href, ...rest }: any) => (
    <button
      data-testid='back-button'
      onClick={onClick}
      data-href={href}
      {...rest}
    />
  ),
}));

describe('PageHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when no title, breadcrumbs, or actions are provided', () => {
    const { container } = renderWithProviders(<PageHeader />);
    expect(container.firstChild).toBeNull();
  });

  it('renders title when provided', () => {
    renderWithProviders(<PageHeader title='用户管理' />);
    expect(screen.getByText('用户管理')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    renderWithProviders(
      <PageHeader
        title='用户管理'
        subtitle='管理系统中所有用户'
      />
    );
    expect(screen.getByText('管理系统中所有用户')).toBeInTheDocument();
  });

  it('renders breadcrumbs when provided', () => {
    renderWithProviders(<PageHeader breadcrumbs={[{ label: '首页' }, { label: '系统设置' }]} />);
    expect(screen.getByText('首页')).toBeInTheDocument();
    expect(screen.getByText('系统设置')).toBeInTheDocument();
  });

  it('renders primary action button when provided', () => {
    const handleClick = vi.fn();
    renderWithProviders(
      <PageHeader
        title='用户管理'
        primaryActionButton={{ label: '新增用户', onClick: handleClick }}
      />
    );
    const button = screen.getByRole('button', { name: /新增用户/ });
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders refresh button when onRefresh is provided', () => {
    const handleRefresh = vi.fn();
    renderWithProviders(
      <PageHeader
        title='用户管理'
        onRefresh={handleRefresh}
      />
    );
    const refreshButton = screen.getByRole('button');
    fireEvent.click(refreshButton);
    expect(handleRefresh).toHaveBeenCalledTimes(1);
  });

  it('renders export button when exportable is true', () => {
    const handleOpenExport = vi.fn();
    renderWithProviders(
      <PageHeader
        title='用户管理'
        exportable
        onOpenExportMenu={handleOpenExport}
      />
    );
    const exportButton = screen.getByRole('button');
    fireEvent.click(exportButton);
    expect(handleOpenExport).toHaveBeenCalledTimes(1);
  });

  it('renders custom action buttons', () => {
    const handleAction1 = vi.fn();
    const handleAction2 = vi.fn();
    renderWithProviders(
      <PageHeader
        title='用户管理'
        actions={[
          { label: '导入', onClick: handleAction1 },
          { label: '导出', onClick: handleAction2 },
        ]}
      />
    );
    expect(screen.getByRole('button', { name: '导入' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '导出' })).toBeInTheDocument();
  });

  it('renders back button when backButton is provided', () => {
    renderWithProviders(
      <PageHeader
        title='用户管理'
        backButton={{ href: '/users' }}
      />
    );
    expect(screen.getByTestId('back-button')).toBeInTheDocument();
  });

  it('renders batch actions when hasBatchActions and selectedCount > 0', () => {
    const handleBatchAction = vi.fn();
    renderWithProviders(
      <PageHeader
        title='用户管理'
        hasBatchActions
        selectedCount={3}
        batchActions={[{ label: '批量删除', onClick: handleBatchAction }]}
        onBatchAction={handleBatchAction}
        onRefresh={vi.fn()}
      />
    );
    // The count text is split: {t('...')}{selectedCount} 项
    // With mock + t() returns the key + so text is "key...3 项"
    expect(screen.getByRole('button', { name: '批量删除' })).toBeInTheDocument();
  });

  it('calls onClearSelection when clear selection button is clicked', () => {
    const handleClearSelection = vi.fn();
    renderWithProviders(
      <PageHeader
        title='用户管理'
        hasBatchActions
        selectedCount={2}
        batchActions={[{ label: '批量删除', onClick: vi.fn() }]}
        onBatchAction={vi.fn()}
        onClearSelection={handleClearSelection}
        onRefresh={vi.fn()}
      />
    );
    // The clear selection button renders " + " + t('...') + " + " which with mock returns the key
    const buttons = screen.getAllByRole('button');
    const clearButton = buttons.find((b) => b.textContent?.includes('key_76159d'));
    expect(clearButton).toBeDefined();
    if (clearButton) {
      fireEvent.click(clearButton);
      expect(handleClearSelection).toHaveBeenCalledTimes(1);
    }
  });
});
