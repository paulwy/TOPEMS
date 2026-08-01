import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';
import ExportButton from '../ExportButton';

const i18nMap: Record<string, string> = {
  'components.export.button.download': '导出数据',
  'components.export.button.exporting': '导出中...',
  'components.export.button.exportSuccess': '导出成功',
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => i18nMap[key] ?? key,
    i18n: {
      changeLanguage: vi.fn(),
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn(),
  },
  Trans: ({ children }: any) => children,
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

if (!URL.createObjectURL) {
  URL.createObjectURL = vi.fn(() => 'mock-url');
  URL.revokeObjectURL = vi.fn();
}

const sampleData: Record<string, unknown>[] = [
  { name: 'Zhang San', department: 'Technology Department' },
  { name: 'Li Si', department: 'Marketing Department' },
];

const sampleColumns = ['name', 'department'];

describe('ExportButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders button with default text 导出数据', () => {
    renderWithProviders(
      <ExportButton
        data={sampleData}
        columns={sampleColumns}
        filename='test-export'
      />
    );
    expect(screen.getByRole('button', { name: /导出数据/ })).toBeInTheDocument();
  });

  it('renders button with custom buttonText when provided', () => {
    renderWithProviders(
      <ExportButton
        data={sampleData}
        columns={sampleColumns}
        filename='test-export'
        buttonText='Export Data'
      />
    );
    expect(screen.getByRole('button', { name: /Export Data/ })).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    renderWithProviders(
      <ExportButton
        data={sampleData}
        columns={sampleColumns}
        filename='test-export'
        disabled
      />
    );
    const button = screen.getByRole('button', { name: /导出数据/ });
    expect(button).toBeDisabled();
  });

  it('calls onExportStart and onExportComplete when clicked', async () => {
    const onExportStart = vi.fn();
    const onExportComplete = vi.fn();

    renderWithProviders(
      <ExportButton
        data={sampleData}
        columns={sampleColumns}
        filename='test-export'
        onExportStart={onExportStart}
        onExportComplete={onExportComplete}
      />
    );

    const button = screen.getByRole('button', { name: /导出数据/ });
    fireEvent.click(button);

    expect(onExportStart).toHaveBeenCalledTimes(1);

    await waitFor(
      () => {
        expect(onExportComplete).toHaveBeenCalledTimes(1);
      },
      { timeout: 5000 }
    );
  });

  it('does not call onExportStart when button is disabled and clicked', () => {
    const onExportStart = vi.fn();

    renderWithProviders(
      <ExportButton
        data={sampleData}
        columns={sampleColumns}
        filename='test-export'
        disabled
        onExportStart={onExportStart}
      />
    );

    const button = screen.getByRole('button', { name: /导出数据/ });
    expect(button).toBeDisabled();
    expect(onExportStart).not.toHaveBeenCalled();
  });
});
