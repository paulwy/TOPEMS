import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAiDashboard } from '../useAiDashboard';

const shared = vi.hoisted(() => ({
  navigate: vi.fn(),
  addNotification: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => shared.navigate,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (x: string) => x }),
}));

vi.mock('@/store', () => ({
  useNotificationStore: vi.fn((selector?: any) =>
    selector
      ? selector({ addNotification: shared.addNotification })
      : { addNotification: shared.addNotification }
  ),
}));

vi.mock('@mui/material', () => ({
  useTheme: () => ({
    palette: {
      primary: { main: '#primary' },
      info: { main: '#info' },
      success: { main: '#success' },
      warning: { main: '#warning' },
      secondary: { main: '#secondary' },
    },
    breakpoints: { down: () => 'sm' },
  }),
  useMediaQuery: () => false,
}));

vi.mock('@/modules/ai/config', () => ({
  AI_PATHS: {
    dashboard: '/ai/dashboard',
    chat: '/ai/chat',
    code: '/ai/code',
    document: '/ai/document',
    knowledge: '/ai/knowledge',
  },
}));

vi.mock('lucide-react', () => ({
  MessageSquare: () => null,
  FileText: () => null,
  Code: () => null,
  Zap: () => null,
  Clock: () => null,
  Sparkles: () => null,
  BookOpen: () => null,
  Lightbulb: () => null,
}));

describe('useAiDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    shared.navigate.mockClear();
    shared.addNotification.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render and return initial state', () => {
    const { result } = renderHook(() => useAiDashboard());
    expect(result.current).toBeDefined();
    expect(result.current.loading).toBe(false);
    expect(result.current.isMobile).toBe(false);
  });

  it('should return 6 stat cards', () => {
    const { result } = renderHook(() => useAiDashboard());
    expect(Array.isArray(result.current.stats)).toBe(true);
    expect(result.current.stats).toHaveLength(6);
    expect(result.current.stats.map((s) => s.id)).toEqual([
      'chat-count',
      'doc-analysis',
      'code-gen',
      'token-usage',
      'avg-response',
      'satisfaction',
    ]);
  });

  it('stat cards should contain title, value, icon, color', () => {
    const { result } = renderHook(() => useAiDashboard());
    for (const stat of result.current.stats) {
      expect(typeof stat.title).toBe('string');
      expect(typeof stat.value).toBe('string');
      expect(React.isValidElement(stat.icon)).toBe(true);
      expect(['primary', 'info', 'success', 'warning', 'secondary']).toContain(stat.color);
    }
  });

  it('should return 4 quick actions', () => {
    const { result } = renderHook(() => useAiDashboard());
    expect(Array.isArray(result.current.quickActions)).toBe(true);
    expect(result.current.quickActions).toHaveLength(4);
    expect(result.current.quickActions.map((a) => a.id)).toEqual([
      'start-chat',
      'doc-analysis',
      'code-assistant',
      'knowledge-base',
    ]);
  });

  it('quick action click should call navigate', () => {
    const { result } = renderHook(() => useAiDashboard());
    const chatAction = result.current.quickActions.find((a) => a.id === 'start-chat');
    expect(chatAction).toBeDefined();
    act(() => {
      chatAction!.onClick();
    });
    expect(shared.navigate).toHaveBeenCalledWith('/ai/chat');
  });

  it('should return 5 recent items', () => {
    const { result } = renderHook(() => useAiDashboard());
    expect(Array.isArray(result.current.recentItems)).toBe(true);
    expect(result.current.recentItems).toHaveLength(5);
  });

  it('should return 3 feature cards', () => {
    const { result } = renderHook(() => useAiDashboard());
    expect(Array.isArray(result.current.features)).toBe(true);
    expect(result.current.features).toHaveLength(3);
    expect(result.current.features.map((f) => f.id)).toEqual([
      'qa-feature',
      'summary-feature',
      'code-feature',
    ]);
  });

  it('feature cards should contain stats and action', () => {
    const { result } = renderHook(() => useAiDashboard());
    for (const feature of result.current.features) {
      expect(Array.isArray(feature.stats)).toBe(true);
      expect(feature.stats.length).toBeGreaterThan(0);
      expect(feature.action).toBeDefined();
      expect(typeof feature.action!.onClick).toBe('function');
    }
  });

  it('should return usageData array', () => {
    const { result } = renderHook(() => useAiDashboard());
    expect(Array.isArray(result.current.usageData)).toBe(true);
    expect(result.current.usageData).toHaveLength(7);
  });

  it('handleRefresh should toggle loading and send notification', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAiDashboard());
    expect(result.current.loading).toBe(false);
    act(() => {
      result.current.handleRefresh();
    });
    expect(result.current.loading).toBe(true);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.loading).toBe(false);
    expect(shared.addNotification).toHaveBeenCalled();
  });
});
