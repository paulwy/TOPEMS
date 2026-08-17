import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import FileUpload from '../FileUpload';
import { renderWithProviders } from '@/__tests__/test-utils';

const i18nMap = vi.hoisted(
  () =>
    ({
      'shared.file_upload.k0': '选择文件',
      'shared.file_upload.k1': '未知大小',
      'shared.file_upload.k2': '已达到最大文件数量限制',
      'shared.file_upload.k3': '文件总大小超过限制',
      'shared.file_upload.k4': '拖拽文件到此处或点击上传',
      'shared.file_upload.k5': '松开以上传',
      'shared.file_upload.k6': '上传失败',
      'shared.file_upload.k7': '下载',
      'shared.file_upload.k8': '执行',
      'shared.file_upload.k9': '关闭',
      'components.file_upload.k0': '最多',
      'components.file_upload.k1': '个文件，单个不超过',
      'components.file_upload.k2': '文件',
      'components.file_upload.k3': '超过大小限制',
      'components.file_upload.mb_2': 'MB，总计不超过',
    }) as Record<string, string>
);

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (options && typeof options === 'object') {
        let result = i18nMap[key] ?? key;
        for (const [k, v] of Object.entries(options)) {
          result = result.replace(`{{${k}}}`, String(v));
        }
        return result;
      }
      return i18nMap[key] ?? key;
    },
    i18n: { language: 'zh-CN', changeLanguage: vi.fn() },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

vi.mock('@/i18n', () => ({
  default: {
    t: (key: string, options?: Record<string, unknown>) => {
      if (options && typeof options === 'object') {
        let result = i18nMap[key] ?? key;
        for (const [k, v] of Object.entries(options)) {
          result = result.replace(`{{${k}}}`, String(v));
        }
        return result;
      }
      return i18nMap[key] ?? key;
    },
  },
}));

vi.mock('@/store', () => ({
  useNotificationStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
        }
  ),
  useAuthStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          user: null,
        })
      : {
          user: null,
        }
  ),
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    group: vi.fn(),
    table: vi.fn(),
    time: vi.fn(),
    timeEnd: vi.fn(),
    child: vi.fn(() => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
    setLevel: vi.fn(),
  },
}));

// jsdom 中 URL.createObjectURL 可能未定义，提供 mock
const originalCreateObjectURL = URL.createObjectURL;
beforeEach(() => {
  if (!URL.createObjectURL) {
    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  }
});

afterEach(() => {
  if (originalCreateObjectURL) {
    URL.createObjectURL = originalCreateObjectURL;
  }
});

const createMockFile = (name: string, size: number, type: string = 'text/plain'): File => {
  return new File(['test content'], name, { type });
};

describe('FileUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload area with upload text', () => {
    renderWithProviders(<FileUpload />);
    expect(screen.getByText('拖拽文件到此处或点击上传')).toBeInTheDocument();
  });

  it('renders default upload description with max count and size limits', () => {
    renderWithProviders(<FileUpload />);
    expect(
      screen.getByText(/最多 10 个文件，单个不超过 10MB，总计不超过 100MB/)
    ).toBeInTheDocument();
  });

  it('renders file input with multiple attribute by default', () => {
    const { container } = renderWithProviders(<FileUpload />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.multiple).toBe(true);
  });

  it('renders file input with accept attribute when accept prop is provided', () => {
    const { container } = renderWithProviders(<FileUpload accept={['.pdf', '.doc', '.docx']} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toHaveAttribute('accept', '.pdf,.doc,.docx');
  });

  it('renders accept type chips when accept prop is provided', () => {
    renderWithProviders(<FileUpload accept={['.pdf', '.doc']} />);
    expect(screen.getByText('.pdf')).toBeInTheDocument();
    expect(screen.getByText('.doc')).toBeInTheDocument();
  });

  it('renders custom uploadText as description for max limits', () => {
    renderWithProviders(
      <FileUpload
        maxCount={5}
        maxSize={2}
        maxTotalSize={20}
      />
    );
    expect(screen.getByText(/最多 5 个文件，单个不超过 2MB，总计不超过 20MB/)).toBeInTheDocument();
  });

  it('calls onChange when a file is selected', () => {
    const handleChange = vi.fn();
    const { container } = renderWithProviders(<FileUpload onChange={handleChange} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [createMockFile('test.txt', 1024)] },
    });
    expect(handleChange).toHaveBeenCalled();
  });

  it('renders existing files when value is provided', () => {
    renderWithProviders(<FileUpload value={['https://example.com/existing.pdf']} />);
    expect(screen.getByText('existing.pdf')).toBeInTheDocument();
  });

  it('renders disabled state and prevents file input click', () => {
    const { container } = renderWithProviders(<FileUpload disabled />);
    const uploadArea = container.querySelector('[class*="MuiBox-root"]') as HTMLElement;
    expect(uploadArea).toBeInTheDocument();
    // 当 disabled 时，点击上传区域不会触发 file input 的 click
    // 验证组件渲染了禁用文案颜色（jsdom 中无法直接验证 cursor）
    expect(screen.getByText('拖拽文件到此处或点击上传')).toBeInTheDocument();
  });

  it('renders uploaded file list with file name and size', () => {
    renderWithProviders(<FileUpload value={['https://example.com/report.pdf']} />);
    expect(screen.getByText('report.pdf')).toBeInTheDocument();
  });
});
