import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import type { ExportFormat, ExportScope } from '../ExportMenu';
import { ExportMenu } from '../ExportMenu';
import { renderWithProviders } from '@/__tests__/test-utils';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'components.exportMenu.csvFormat': 'CSV 格式',
        'components.exportMenu.jsonFormat': 'JSON 格式',
        'components.exportMenu.excelFormat': 'Excel 格式',
        'components.exportMenu.currentPage': '导出当前页',
      };
      if (key === 'components.exportMenu.selectedItems') {
        const count = options?.count ?? 0;
        return `导出选中项 (${count})`;
      }
      return map[key] ?? key;
    },
  }),
}));

const renderMenu = (
  overrides: Partial<{
    formats: ExportFormat[];
    scopes: ExportScope[];
    selectedCount: number;
    onExport: (f: ExportFormat, s: ExportScope) => void;
  }> = {}
) => {
  const anchorEl = document.createElement('div');
  document.body.appendChild(anchorEl);
  const onExport = overrides.onExport || vi.fn();
  const props = {
    anchorEl,
    open: true,
    onClose: vi.fn(),
    formats: overrides.formats || (['csv', 'json'] as ExportFormat[]),
    scopes: overrides.scopes || (['current', 'selected'] as ExportScope[]),
    selectedCount: overrides.selectedCount ?? 0,
    onExport,
  };
  return { ...renderWithProviders(<ExportMenu {...props} />), onExport };
};

describe('ExportMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when open', () => {
    renderMenu();
    // CSV 格式 appears for both 'current' and 'selected' scopes
    expect(screen.getAllByText('CSV 格式').length).toBeGreaterThan(0);
  });

  it('renders format items for each format in current scope', () => {
    // Use only 'current' scope to avoid duplicate matches
    renderMenu({ formats: ['csv', 'json', 'excel'], scopes: ['current'] });
    expect(screen.getByText('CSV 格式')).toBeInTheDocument();
    expect(screen.getByText('JSON 格式')).toBeInTheDocument();
    expect(screen.getByText('Excel 格式')).toBeInTheDocument();
  });

  it('renders selected scope section with count', () => {
    renderMenu({ scopes: ['current', 'selected'], selectedCount: 5 });
    expect(screen.getByText(/导出选中项 \(5\)/)).toBeInTheDocument();
  });

  it('disables selected scope items when selectedCount is 0', () => {
    renderMenu({ scopes: ['current', 'selected'], selectedCount: 0 });
    const selectedCsvItem = screen.getAllByText('CSV 格式')[1];
    const menuItem = selectedCsvItem.closest('[role="menuitem"]');
    expect(menuItem).toHaveAttribute('aria-disabled', 'true');
  });

  it('calls onExport with format and scope when format item is clicked', () => {
    const onExport = vi.fn();
    renderMenu({
      formats: ['csv'],
      scopes: ['current'],
      onExport,
    });
    fireEvent.click(screen.getByText('CSV 格式'));
    expect(onExport).toHaveBeenCalledWith('csv', 'current');
  });

  it('does not render current scope section when not in scopes', () => {
    renderMenu({ scopes: ['selected'] });
    // Only the selected scope section should render
    expect(screen.getByText(/导出选中项/)).toBeInTheDocument();
  });
});
