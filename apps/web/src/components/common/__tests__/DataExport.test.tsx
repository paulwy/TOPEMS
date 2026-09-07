import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';
import DataExport, { ExportField } from '../DataExport';

const excelMocks = vi.hoisted(() => ({
  writeBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(8))),
  addRows: vi.fn(),
}));

vi.mock('exceljs', () => {
  class MockWorkbook {
    xlsx = { writeBuffer: excelMocks.writeBuffer };
    addWorksheet() {
      return { addRows: excelMocks.addRows, columns: [] };
    }
  }
  return { Workbook: MockWorkbook };
});

const sampleData: Record<string, unknown>[] = [
  { name: '张三', department: '技术部' },
  { name: '李四', department: '市场部' },
];

const sampleFields: ExportField[] = [
  { key: 'name', title: '姓名' },
  { key: 'department', title: '部门' },
];

describe('DataExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the export button with default text', () => {
    renderWithProviders(
      <DataExport
        data={sampleData}
        fields={sampleFields}
      />
    );
    expect(screen.getByRole('button', { name: /导出/ })).toBeInTheDocument();
  });

  it('renders custom button text when buttonText is provided', () => {
    renderWithProviders(
      <DataExport
        data={sampleData}
        fields={sampleFields}
        buttonText='导出数据'
      />
    );
    expect(screen.getByRole('button', { name: /导出数据/ })).toBeInTheDocument();
  });

  it('opens format menu when button is clicked', () => {
    renderWithProviders(
      <DataExport
        data={sampleData}
        fields={sampleFields}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /导出/ }));
    expect(screen.getByText('导出 Excel')).toBeInTheDocument();
    expect(screen.getByText('导出 CSV')).toBeInTheDocument();
    expect(screen.getByText('导出 PDF')).toBeInTheDocument();
  });

  it('triggers Excel export when "导出 Excel" menu item is clicked', async () => {
    renderWithProviders(
      <DataExport
        data={sampleData}
        fields={sampleFields}
      />
    );
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    fireEvent.click(screen.getByRole('button', { name: /导出/ }));
    fireEvent.click(screen.getByText('导出 Excel'));

    await waitFor(() => expect(excelMocks.writeBuffer).toHaveBeenCalledTimes(1), { timeout: 2000 });
    const links = appendSpy.mock.calls.map((c) => c[0] as HTMLAnchorElement);
    const anchor = links[links.length - 1];
    expect(anchor.download).toBe('export.xlsx');
    appendSpy.mockRestore();
  });

  it('disables the export button when disabled prop is true', () => {
    renderWithProviders(
      <DataExport
        data={sampleData}
        fields={sampleFields}
        disabled
      />
    );
    const btn = screen.getByRole('button', { name: /导出/ });
    expect(btn).toBeDisabled();
  });

  it('disables the export button when data is empty', () => {
    renderWithProviders(
      <DataExport
        data={[]}
        fields={sampleFields}
      />
    );
    const btn = screen.getByRole('button', { name: /导出/ });
    expect(btn).toBeDisabled();
  });

  it('opens export settings dialog when "导出设置" is clicked', () => {
    renderWithProviders(
      <DataExport
        data={sampleData}
        fields={sampleFields}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /导出/ }));
    const settingsItems = screen.getAllByText('导出设置');
    fireEvent.click(settingsItems[0]);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('文件名')).toBeInTheDocument();
  });

  it('calls beforeExport before exporting data', async () => {
    const beforeExport = vi.fn((rows) => rows);
    renderWithProviders(
      <DataExport
        data={sampleData}
        fields={sampleFields}
        beforeExport={beforeExport}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /导出/ }));
    fireEvent.click(screen.getByText('导出 Excel'));

    await waitFor(() => expect(beforeExport).toHaveBeenCalledTimes(1), { timeout: 2000 });
    expect(beforeExport.mock.calls[0][0]).toEqual(sampleData);
  });

  it('uses custom default file name when exporting', async () => {
    renderWithProviders(
      <DataExport
        data={sampleData}
        fields={sampleFields}
        defaultFileName='员工列表'
      />
    );
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    fireEvent.click(screen.getByRole('button', { name: /导出/ }));
    fireEvent.click(screen.getByText('导出 Excel'));

    await waitFor(() => expect(excelMocks.writeBuffer).toHaveBeenCalledTimes(1), { timeout: 2000 });
    const links = appendSpy.mock.calls.map((c) => c[0] as HTMLAnchorElement);
    const anchor = links[links.length - 1];
    expect(anchor.download).toBe('员工列表.xlsx');
    appendSpy.mockRestore();
  });
});
