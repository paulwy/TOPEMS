/**
 * GlobalSearchBar 入口挂载冒烟
 *
 * 背景：该组件曾长期只被已下线的旧 AppHeader 引用，顶栏搜索入口实际是空实现，
 * 页面点击无任何反馈。此用例守住「两个变体都能真挂载出可交互入口」。
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import '@testing-library/jest-dom';
import { GlobalSearchBar } from '../index';

vi.mock('@/api/search', () => ({
  searchApi: {
    globalSearch: vi.fn(async () => ({ success: true, data: { items: [], total: 0 } })),
  },
}));

const wrap = (ui: React.ReactNode) =>
  render(
    <MemoryRouter>
      <ThemeProvider theme={createTheme()}>{ui}</ThemeProvider>
    </MemoryRouter>
  );

describe('GlobalSearchBar', () => {
  it('full 变体渲染出可输入的搜索框', () => {
    wrap(<GlobalSearchBar />);
    const input = screen.getByRole('combobox');
    expect(input).toBeInTheDocument();
    // 输入即可回写（placeholder 文案由 i18n 运行时注入，测试环境未初始化命名空间）
    fireEvent.change(input, { target: { value: 'E2E' } });
    expect((input as HTMLInputElement).value).toBe('E2E');
  });

  it('icon 变体渲染出「搜索」图标按钮，点击后弹出输入框', () => {
    wrap(<GlobalSearchBar variant='icon' />);
    const btn = screen.getByLabelText('搜索');
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});
