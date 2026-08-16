import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils';
import LogConfigPanel from '../LogConfigPanel';

vi.mock('@/components/common', () => ({
  Grid: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('lucide-react', () => {
  const icon =
    (_name: string) =>
    ({ size: _size }: { size?: number }) => <svg />;

  return {
    FileText: icon('file-text'),
    Save: icon('save'),
    AlertCircle: icon('alert-circle'),
  };
});

const defaultLogConfig = {
  level: 'info' as const,
  format: 'json' as const,
  output: 'console' as const,
  file_path: '/var/log/topems/app.log',
  max_file_size_mb: 100,
  max_files: 10,
  log_to_db: false,
  console_enabled: true,
  remote_logging_enabled: false,
  remote_logging_url: '',
};

describe('LogConfigPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders three cards with expected Chinese titles', () => {
    renderWithProviders(
      <LogConfigPanel
        logConfig={defaultLogConfig}
        setLogConfig={vi.fn()}
        onSave={vi.fn()}
        isSaving={false}
      />
    );

    expect(screen.getByText('日志级别和格式')).toBeInTheDocument();
    expect(screen.getByText('文件输出配置')).toBeInTheDocument();
    expect(screen.getByText('高级配置')).toBeInTheDocument();
    expect(screen.getByText('保存配置')).toBeInTheDocument();
  });

  it('renders log level, format and output selects', () => {
    renderWithProviders(
      <LogConfigPanel
        logConfig={defaultLogConfig}
        setLogConfig={vi.fn()}
        onSave={vi.fn()}
        isSaving={false}
      />
    );

    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes.length).toBe(3);

    fireEvent.mouseDown(comboboxes[0]);
    expect(screen.getByRole('option', { name: 'Trace' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Debug' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Info' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Warn' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Error' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Fatal' })).toBeInTheDocument();
  });

  it('calls setLogConfig when log level select changes', () => {
    const setLogConfig = vi.fn();

    renderWithProviders(
      <LogConfigPanel
        logConfig={defaultLogConfig}
        setLogConfig={setLogConfig}
        onSave={vi.fn()}
        isSaving={false}
      />
    );

    const comboboxes = screen.getAllByRole('combobox');
    fireEvent.mouseDown(comboboxes[0]);
    fireEvent.click(screen.getByRole('option', { name: 'Debug' }));

    expect(setLogConfig).toHaveBeenCalledTimes(1);
  });

  it('calls setLogConfig when switches are toggled', () => {
    const setLogConfig = vi.fn();

    renderWithProviders(
      <LogConfigPanel
        logConfig={defaultLogConfig}
        setLogConfig={setLogConfig}
        onSave={vi.fn()}
        isSaving={false}
      />
    );

    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBe(4);

    fireEvent.click(switches[0]);
    expect(setLogConfig).toHaveBeenCalledTimes(1);
  });

  it('disables file path inputs when output is console only', () => {
    renderWithProviders(
      <LogConfigPanel
        logConfig={{ ...defaultLogConfig, output: 'console' }}
        setLogConfig={vi.fn()}
        onSave={vi.fn()}
        isSaving={false}
      />
    );

    const fileInputs = Array.from(
      document.querySelectorAll('input[type="text"], input[type="number"]')
    ).filter(
      (el) =>
        el.parentElement?.textContent?.includes('日志文件路径') ||
        el.parentElement?.textContent?.includes('单文件最大大小') ||
        el.parentElement?.textContent?.includes('保留文件数量')
    );

    expect(fileInputs.length).toBe(3);
    fileInputs.forEach((el) => expect(el).toBeDisabled());

    expect(screen.getByText(/已禁用/)).toBeInTheDocument();
  });

  it('calls onSave when save button is clicked and disables when isSaving', () => {
    const onSave = vi.fn();

    const { rerender } = renderWithProviders(
      <LogConfigPanel
        logConfig={defaultLogConfig}
        setLogConfig={vi.fn()}
        onSave={onSave}
        isSaving={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /保存配置/ }));
    expect(onSave).toHaveBeenCalledTimes(1);

    rerender(
      <LogConfigPanel
        logConfig={defaultLogConfig}
        setLogConfig={vi.fn()}
        onSave={onSave}
        isSaving
      />
    );

    expect(screen.getByRole('button', { name: /保存中/ })).toBeDisabled();
  });

  it('disables remote_logging_url when remote_logging_enabled is false', () => {
    renderWithProviders(
      <LogConfigPanel
        logConfig={{ ...defaultLogConfig, remote_logging_enabled: false }}
        setLogConfig={vi.fn()}
        onSave={vi.fn()}
        isSaving={false}
      />
    );

    const remoteUrlInput = Array.from(document.querySelectorAll('input[type="text"]')).find((el) =>
      el.parentElement?.textContent?.includes('远程日志URL')
    );

    expect(remoteUrlInput).toBeDefined();
    expect(remoteUrlInput).toBeDisabled();
  });
});
