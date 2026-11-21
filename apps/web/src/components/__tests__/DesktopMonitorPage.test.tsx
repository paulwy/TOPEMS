import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import DesktopMonitorPage from '../desktop/DesktopMonitorPage';
import { tauriApi } from '../../services/TauriApi';

// DesktopMonitorPage：非 useQuery（fetchAll Promise.allSettled）+ isDesktop 分支 + StatsPageTemplate
// + 4 statCards + 后端健康表 + 系统配置 JSON——按真实行为断言
vi.mock('@/i18n', () => ({
  ensureNamespacesLoaded: () => Promise.resolve(),
  default: { t: (key: string) => key },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'zh-CN' },
  }),
}));

const mockStatsPage = vi.hoisted(() => vi.fn());

vi.mock('@/components/templates', () => {
  const MockStatsPage = (props: Record<string, unknown>) => {
    mockStatsPage(props);
    return <div data-testid='stats-page-template'>{props.children}</div>;
  };
  return { StatsPageTemplate: MockStatsPage };
});

vi.mock('../../services/TauriApi', () => ({
  tauriApi: {
    getMetrics: vi.fn().mockResolvedValue({
      total_requests: 100,
      success_count: 100,
      failure_count: 0,
      retry_count: 3,
      avg_response_time_ms: 42,
    }),
    checkHealth: vi.fn().mockResolvedValue({ status: 'ok', version: '1.0.0', uptime: '3d' }),
    getSystemConfig: vi.fn().mockResolvedValue({ env: 'production', debug: false }),
  },
}));

const isAvailableMock = vi.hoisted(() => vi.fn());

vi.mock('../../services/TauriAuth', () => ({
  tauriAuth: { isAvailable: () => isAvailableMock() },
}));

describe('DesktopMonitorPage（isDesktop 分支 + fetchAll 3 api + StatsPageTemplate + 健康表/配置）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStatsPage.mockClear();
  });

  it('非桌面环境：渲染浏览器提示（fetchAll 仍触发）', async () => {
    isAvailableMock.mockReturnValue(false);
    render(<DesktopMonitorPage />);

    await waitFor(() => expect(tauriApi.getMetrics).toHaveBeenCalled());
    expect(screen.getByText('desktop.monitor.browser_notice')).toBeInTheDocument();
  });

  it('桌面环境：fetchAll 调 3 api + StatsPageTemplate props', async () => {
    isAvailableMock.mockReturnValue(true);
    render(<DesktopMonitorPage />);

    await waitFor(() => expect(tauriApi.getMetrics).toHaveBeenCalled());
    expect(tauriApi.checkHealth).toHaveBeenCalled();
    expect(tauriApi.getSystemConfig).toHaveBeenCalled();

    await screen.findByTestId('stats-page-template');
    const props = mockStatsPage.mock.calls.at(-1)[0];
    expect(props.title).toBe('desktop.monitor.title');
    expect(props.statCards).toHaveLength(4);
    expect(props.loading).toBe(false);
    expect(props.showSearch).toBe(false);
  });

  it('statCards 内容（total_requests/success_rate 百分比/avg_response）', async () => {
    isAvailableMock.mockReturnValue(true);
    render(<DesktopMonitorPage />);

    await screen.findByTestId('stats-page-template');
    const props = mockStatsPage.mock.calls.at(-1)[0];
    // success card value 为 JSX（含 successRate 100.0%）
    const successCard = props.statCards.find((c: { id: string }) => c.id === 'success_count');
    expect(successCard).toBeDefined();
    expect(successCard.value).not.toBeNull();
    const retryCard = props.statCards.find((c: { id: string }) => c.id === 'retry_count');
    expect(retryCard).toBeDefined();
  });

  it('后端健康表渲染（health 数据行）', async () => {
    isAvailableMock.mockReturnValue(true);
    render(<DesktopMonitorPage />);

    await screen.findByTestId('stats-page-template');
    // health 数据（status/version/uptime）渲染为表格行
    expect(await screen.findByText('desktop.monitor.backend_health')).toBeInTheDocument();
    expect(screen.getByText('ok')).toBeInTheDocument();
    expect(screen.getByText('1.0.0')).toBeInTheDocument();
    expect(screen.getByText('3d')).toBeInTheDocument();
  });

  it('系统配置 JSON 渲染（config 数据）', async () => {
    isAvailableMock.mockReturnValue(true);
    render(<DesktopMonitorPage />);

    await screen.findByTestId('stats-page-template');
    expect(await screen.findByText('desktop.monitor.system_config')).toBeInTheDocument();
    expect(screen.getByText(/"env": "production"/)).toBeInTheDocument();
  });
});
