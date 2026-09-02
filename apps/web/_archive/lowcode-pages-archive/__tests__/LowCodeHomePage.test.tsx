import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import LowCodeHomePage from '../LowCodeHomePage';

vi.mock('react-i18next', () => {
  const i18nMap: Record<string, string> = {
    'lowcode.low_code_home_page.k0': '加载统计数据失败',
    'lowcode.low_code_home_page.k1': '低代码概览',
    'lowcode.low_code_home_page.k2': '低代码概览',
    'lowcode.low_code_home_page.k3': '应用总数',
    'lowcode.low_code_home_page.k4': '已发布应用',
    'lowcode.low_code_home_page.k5': '数据模型',
    'lowcode.low_code_home_page.k6': '数据源',
    'lowcode.low_code_home_page.k7': '表单',
    'lowcode.low_code_home_page.k8': '页面',
    'lowcode.low_code_home_page.k9': '工作流',
    'lowcode.low_code_home_page.7_10': '近 7 天活跃',
    'lowcode.low_code_home_page.e1': '低代码平台概览',
    'lowcode.low_code_home_page.l1': '{{v1}}（后端 lowcode 服务未就绪时显示占位统计）',
  };
  const t = (key: string, vars?: Record<string, unknown>): string => {
    let result = i18nMap[key] ?? key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        result = result.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
      });
    }
    return result;
  };
  return {
    useTranslation: (ns?: string | string[]) => ({
      t,
      i18n: {
        changeLanguage: vi.fn(),
        language: 'zh',
      },
    }),
    initReactI18next: {
      type: '3rdParty',
      init: vi.fn(),
    },
    Trans: ({ children }: any) => children,
  };
});

vi.mock('@/i18n', () => {
  const i18nMap: Record<string, string> = {
    'lowcode.low_code_home_page.k0': '加载统计数据失败',
    'lowcode.low_code_home_page.k1': '低代码概览',
    'lowcode.low_code_home_page.k2': '低代码概览',
    'lowcode.low_code_home_page.k3': '应用总数',
    'lowcode.low_code_home_page.k4': '已发布应用',
    'lowcode.low_code_home_page.k5': '数据模型',
    'lowcode.low_code_home_page.k6': '数据源',
    'lowcode.low_code_home_page.k7': '表单',
    'lowcode.low_code_home_page.k8': '页面',
    'lowcode.low_code_home_page.k9': '工作流',
    'lowcode.low_code_home_page.7_10': '近 7 天活跃',
    'lowcode.low_code_home_page.e1': '低代码平台概览',
    'lowcode.low_code_home_page.l1': '{{v1}}（后端 lowcode 服务未就绪时显示占位统计）',
  };
  const t = (key: string, vars?: Record<string, unknown>): string => {
    let result = i18nMap[key] ?? key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        result = result.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
      });
    }
    return result;
  };
  return {
    default: {
      t,
      language: 'zh',
      changeLanguage: vi.fn(),
    },
  };
});

const mockGetDashboardStats = vi.fn();

vi.mock('@/api/lowcode', () => ({
  lowcodeApi: {
    getDashboardStats: (...args: any[]) => mockGetDashboardStats(...args),
  },
  LowcodeDashboardStats: {},
}));

vi.mock('@/components/common', () => ({
  PageContainer: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid='page-container'>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

const sampleStats = {
  total_apps: 12,
  published_apps: 8,
  total_data_models: 24,
  total_data_sources: 5,
  total_forms: 36,
  total_pages: 42,
  total_workflows: 9,
  recent_active_apps: 6,
};

describe('LowCodeHomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', async () => {
    let resolvePromise: ((v: any) => void) | undefined;
    mockGetDashboardStats.mockReturnValue(
      new Promise((res) => {
        resolvePromise = res;
      })
    );

    renderWithProviders(<LowCodeHomePage />);

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    resolvePromise?.({ data: sampleStats });
  });

  it('renders all stat cards when stats load', async () => {
    mockGetDashboardStats.mockResolvedValue({ data: sampleStats });

    renderWithProviders(<LowCodeHomePage />);

    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument();
    });

    expect(screen.getByText('低代码概览')).toBeInTheDocument();
    expect(screen.getByText('应用总数')).toBeInTheDocument();
    expect(screen.getByText('已发布应用')).toBeInTheDocument();
    expect(screen.getByText('数据模型')).toBeInTheDocument();
    expect(screen.getByText('数据源')).toBeInTheDocument();
    expect(screen.getByText('表单')).toBeInTheDocument();
    expect(screen.getByText('页面')).toBeInTheDocument();
    expect(screen.getByText('工作流')).toBeInTheDocument();
    expect(screen.getByText('近 7 天活跃')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
  });

  it('shows zero values when backend returns no data', async () => {
    mockGetDashboardStats.mockResolvedValue({ data: null });

    renderWithProviders(<LowCodeHomePage />);

    await waitFor(() => {
      expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    });
  });

  it('shows warning alert when API errors', async () => {
    mockGetDashboardStats.mockRejectedValue(new Error('lowcode 服务未就绪'));

    renderWithProviders(<LowCodeHomePage />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByText(/lowcode 服务未就绪/)).toBeInTheDocument();
  });
});
