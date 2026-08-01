import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';
import { QuickSearch } from '../QuickSearch';

vi.mock('@/store', () => ({
  useNotificationStore: vi.fn((selector?: any) =>
    selector
      ? selector({ addNotification: vi.fn(), notifications: [] })
      : { addNotification: vi.fn(), notifications: [] }
  ),
  useAuthStore: vi.fn((selector?: any) => (selector ? selector({ user: null }) : { user: null })),
}));

describe('QuickSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders input with default placeholder', () => {
    renderWithProviders(<QuickSearch />);
    expect(screen.getByPlaceholderText('搜索...')).toBeInTheDocument();
  });

  it('renders custom placeholder when provided', () => {
    renderWithProviders(<QuickSearch placeholder='请输入关键词' />);
    expect(screen.getByPlaceholderText('请输入关键词')).toBeInTheDocument();
  });

  it('calls onSearch when Enter is pressed with query', () => {
    const handleSearch = vi.fn();
    renderWithProviders(<QuickSearch onSearch={handleSearch} />);
    const input = screen.getByPlaceholderText('搜索...');
    fireEvent.change(input, { target: { value: '测试查询' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(handleSearch).toHaveBeenCalledWith('测试查询');
  });

  it('does not call onSearch when query is empty and Enter is pressed', () => {
    const handleSearch = vi.fn();
    renderWithProviders(<QuickSearch onSearch={handleSearch} />);
    const input = screen.getByPlaceholderText('搜索...');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(handleSearch).not.toHaveBeenCalled();
  });

  it('renders shortcut hint (⌘K) by default', () => {
    renderWithProviders(<QuickSearch />);
    expect(screen.getByText('K')).toBeInTheDocument();
  });

  it('hides shortcut hint when enableShortcut is false', () => {
    renderWithProviders(<QuickSearch enableShortcut={false} />);
    expect(screen.queryByText('K')).not.toBeInTheDocument();
  });

  it('updates input value on change', () => {
    renderWithProviders(<QuickSearch />);
    const input = screen.getByPlaceholderText('搜索...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '新文本' } });
    expect(input.value).toBe('新文本');
  });

  it('renders clear button when query is non-empty', () => {
    renderWithProviders(<QuickSearch />);
    const input = screen.getByPlaceholderText('搜索...');
    fireEvent.change(input, { target: { value: '查询' } });
    // Clear button (IconButton with X icon) should be present
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
