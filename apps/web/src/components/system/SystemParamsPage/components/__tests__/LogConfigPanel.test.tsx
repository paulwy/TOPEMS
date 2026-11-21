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
});
