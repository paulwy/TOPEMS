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
