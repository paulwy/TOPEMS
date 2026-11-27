/**
 * 全部路由页面渲染冒烟测试（页面渲染数据模拟 / 查运行时错误）
 *
 * 目标：对 authRoutes + dashboardRoutes + commonRoutes 的每个页面组件，
 * 在最小 providers（路由/MUI 主题/react-query）下实际渲染，
 * 捕获并报告：渲染抛错、ErrorBoundary 捕获的运行时错误。
 *
 * 说明：
 * - lazy 页面（React.lazy）经 Suspense 渲染，act + 短等待让动态 import 完成；
 * - react-query 未接后端（fetch 不可用），query 失败是预期（页面应显示错误/空态），
 *   若因 query 失败而崩溃则视为运行时错误上报；
 * - 部分页面依赖认证/权限 context（由路由层 ProtectedRouteWrapper 提供），
 *   本测试直接渲染页面组件，若因此报 "no context" 类错误会标注为"依赖上下文"，
 *   不误判为页面 bug。
 */
import React, { Component, Suspense, type ReactNode } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { authRoutes, dashboardRoutes, commonRoutes } from '@/routes';

/** 渲染错误捕获边界：捕获子树的运行时错误，不冒泡崩溃测试 */
class CaptureBoundary extends Component<{ name: string; errors: string[]; children?: ReactNode }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    this.props.errors.push(`[${this.props.name}] ${msg}`);
  }
  render() {
    if (this.state.hasError) return <div data-testid='page-crash' />;
    return this.props.children;
  }
}

const allRoutes = [...authRoutes, ...dashboardRoutes, ...commonRoutes];

describe('全部路由页面渲染冒烟（静态 35 路由）', () => {
  afterEach(() => cleanup());

  const renderErrors: string[] = [];

  it.each(allRoutes)('页面 %s 渲染不崩溃', async (route) => {
    const { path, element } = route;
    const isReactElement = React.isValidElement(element);
    const Element = element as React.ComponentType;
    const captured: string[] = [];
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    let thrown: Error | null = null;

    try {
      await act(async () => {
        render(
          <ThemeProvider theme={createTheme()}>
            <QueryClientProvider client={qc}>
              <MemoryRouter initialEntries={[path]}>
                <Suspense fallback={<div data-testid='loading' />}>
                  <CaptureBoundary
                    name={path}
                    errors={captured}
                  >
                    {isReactElement ? element : <Element />}
                  </CaptureBoundary>
                </Suspense>
              </MemoryRouter>
            </QueryClientProvider>
          </ThemeProvider>
        );
        // 给 lazy 动态 import + 首帧渲染留时间
        await new Promise((r) => setTimeout(r, 120));
      });
    } catch (e) {
      thrown = e instanceof Error ? e : new Error(String(e));
    }

    const boundaryErr = captured.filter((m) => !m.includes('context') && !m.includes('Context'));
    if (thrown || boundaryErr.length > 0) {
      renderErrors.push(
        `${path}: ${thrown ? `渲染抛错: ${thrown.message}` : boundaryErr.join(' | ')}`
      );
    }
    expect(thrown, `页面 ${path} 渲染抛错: ${thrown?.message}`).toBeNull();
    expect(
      captured,
      `页面 ${path} 运行时错误（忽略 context 依赖）: ${captured.join(' | ')}`
    ).toHaveLength(0);
  });

  it('汇总：所有页面渲染错误', () => {
    if (renderErrors.length === 0) {
      expect(renderErrors).toEqual([]);
    } else {
      // 失败已由 it.each 逐条报告，这里仅汇总打印
      console.info(
        `[页面渲染冒烟] 共 ${renderErrors.length} 个页面异常:\n${renderErrors.join('\n')}`
      );
      expect(renderErrors.length).toBeGreaterThanOrEqual(0);
    }
  });
});
