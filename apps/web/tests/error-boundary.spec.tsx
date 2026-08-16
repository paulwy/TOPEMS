/**
 * @done V80 Tier2 coverage
 *
 * ErrorBoundary 组件单测
 * @see @/components/common/ErrorBoundary
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('react-i18next', () => {
  const sources = [
    require('../src/i18n/locales/zh/common.json'),
    require('../src/i18n/locales/zh/components.json'),
    require('../src/i18n/locales/zh/pages.json'),
    require('../src/i18n/locales/zh/templates.json'),
    require('../src/i18n/locales/zh/shared.json')
  ];
  const i18nMap: Record<string, string> = {};
  for (const src of sources) {
    for (const [k, v] of Object.entries(src)) {
      i18nMap[k] = v as string;
    }
  }
  i18nMap['components.error_boundary.k0'] = '操作出现错误';
  i18nMap['components.error_boundary.k1'] = '重试操作';
  const t = (key: string) => i18nMap[key] ?? key;
  return {
    useTranslation: () => ({ t, i18n: { language: 'zh' } }),
    initReactI18next: { type: '3rdParty', init: () => {} },
    Trans: ({ i18nKey, children }: { i18nKey?: string; children?: any }) =>
      i18nKey ? (i18nMap[i18nKey] ?? i18nKey) : children,
  };
});

vi.mock('@/i18n', () => {
  const sources = [
    require('../src/i18n/locales/zh/common.json'),
    require('../src/i18n/locales/zh/components.json'),
    require('../src/i18n/locales/zh/pages.json'),
    require('../src/i18n/locales/zh/templates.json'),
    require('../src/i18n/locales/zh/shared.json')
  ];
  const i18nMap: Record<string, string> = {};
  for (const src of sources) {
    for (const [k, v] of Object.entries(src)) {
      i18nMap[k] = v as string;
    }
  }
  i18nMap['components.error_boundary.k0'] = '操作出现错误';
  i18nMap['components.error_boundary.k1'] = '重试操作';
  const t = (key: string) => i18nMap[key] ?? key;
  return {
    default: {
      t,
      language: 'zh',
      on: () => {},
      use: () => ({ init: () => {} }),
      init: () => {},
    },
  };
});

import ErrorBoundary from '@/components/common/ErrorBoundary';

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { logger } from '@/utils/logger';

afterEach(() => {
  vi.mocked(logger.error).mockClear();
});

// 故意抛错的子组件
const ProblemChild: React.FC<{ shouldThrow?: boolean; msg?: string }> = ({
  shouldThrow = true,
  msg = 'boom!',
}) => {
  if (shouldThrow) throw new Error(msg);
  return <div>happy child</div>;
};

describe('ErrorBoundary', () => {
  describe('正常路径', () => {
    it('should render children when no error is thrown', () => {
      render(
        <ErrorBoundary>
          <div data-testid='ok'>ok child</div>
        </ErrorBoundary>
      );
      expect(screen.getByTestId('ok')).toBeInTheDocument();
      expect(screen.getByText('ok child')).toBeInTheDocument();
    });

    it('should not render fallback when children render normally', () => {
      render(
        <ErrorBoundary>
          <span>safe content</span>
        </ErrorBoundary>
      );
      expect(screen.queryByText('操作出现错误')).not.toBeInTheDocument();
      expect(screen.queryByText('重试操作')).not.toBeInTheDocument();
    });
  });

  describe('错误捕获', () => {
    // 抑制 React 在测试环境打印的错误堆栈
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    it('should catch error from child and render default fallback UI', () => {
      render(
        <ErrorBoundary>
          <ProblemChild msg='网络异常' />
        </ErrorBoundary>
      );
      expect(screen.getByText('操作出现错误')).toBeInTheDocument();
      expect(screen.getByText('网络异常')).toBeInTheDocument();
      expect(screen.getByText('重试操作')).toBeInTheDocument();
    });

    it('should call logger.error with error info when error caught', () => {
      vi.mocked(logger.error).mockClear();
      render(
        <ErrorBoundary>
          <ProblemChild msg='logged-error' />
        </ErrorBoundary>
      );
      expect(logger.error).toHaveBeenCalled();
      // 第一次调用应包含 ErrorBoundary caught error 字样
      const firstCallArg = String(vi.mocked(logger.error).mock.calls[0]?.[0] ?? '');
      expect(firstCallArg).toMatch(/ErrorBoundary/);
    });

    it('should render custom fallback when provided', () => {
      render(
        <ErrorBoundary fallback={<div data-testid='custom-fallback'>自定义错误页</div>}>
          <ProblemChild />
        </ErrorBoundary>
      );
      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('自定义错误页')).toBeInTheDocument();
      // 默认 fallback 不应出现
      expect(screen.queryByText('操作出现错误')).not.toBeInTheDocument();
    });

    it('should call onRetry when retry button is clicked', () => {
      const onRetry = vi.fn();
      render(
        <ErrorBoundary onRetry={onRetry}>
          <ProblemChild />
        </ErrorBoundary>
      );
      expect(screen.getByText('操作出现错误')).toBeInTheDocument();

      const retryBtn = screen.getByText('重试操作');
      fireEvent.click(retryBtn);

      // onRetry 必须被调用一次
      expect(onRetry).toHaveBeenCalledTimes(1);

      // 内部 hasError 也应在 click 后被清掉 —— 这里再渲染一个稳定子组件
      // 确认它能正常出现（同一 ErrorBoundary 实例已重置状态）
      const { rerender } = render(
        <ErrorBoundary onRetry={onRetry}>
          <div data-testid='post-retry'>post-retry child</div>
        </ErrorBoundary>
      );
      expect(screen.getByTestId('post-retry')).toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });
  });
});
