import React from 'react';
import { vi } from 'vitest';
import { render } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { RelativeTime } from '../components/RelativeTime';

vi.mock('@topems/shared-utils', () => ({
  formatRelativeTime: vi.fn((date) => {
    const now = new Date();
    const target = new Date(date);
    const diff = now.getTime() - target.getTime();
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return `${Math.floor(diff / 86400000)}天前`;
  }),
}));

const testTheme = createTheme();

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={testTheme}>{ui}</ThemeProvider>);
};

describe('RelativeTime Component', () => {
  it('renders with string date', () => {
    const date = new Date().toISOString();
    const { container } = renderWithTheme(<RelativeTime date={date} />);
    expect(container.querySelector('p')).toBeInTheDocument();
  });

  it('renders with Date object', () => {
    const date = new Date();
    const { container } = renderWithTheme(<RelativeTime date={date} />);
    expect(container.querySelector('p')).toBeInTheDocument();
  });

  it('renders with custom update interval', () => {
    const date = new Date();
    const { container } = renderWithTheme(<RelativeTime date={date} updateInterval={30000} />);
    expect(container.querySelector('p')).toBeInTheDocument();
  });

  it('renders with showAbsolute', () => {
    const date = new Date();
    const { container } = renderWithTheme(<RelativeTime date={date} showAbsolute />);
    expect(container.querySelector('p')).toBeInTheDocument();
  });

  it('renders with custom sx props', () => {
    const date = new Date();
    const { container } = renderWithTheme(<RelativeTime date={date} sx={{ color: 'red' }} />);
    expect(container.querySelector('p')).toBeInTheDocument();
  });

  it('renders past time correctly', () => {
    const date = new Date(Date.now() - 3600000).toISOString();
    const { container } = renderWithTheme(<RelativeTime date={date} />);
    expect(container.querySelector('p')).toBeInTheDocument();
  });

  it('renders days ago correctly', () => {
    const date = new Date(Date.now() - 86400000 * 2).toISOString();
    const { container } = renderWithTheme(<RelativeTime date={date} />);
    expect(container.querySelector('p')).toBeInTheDocument();
  });
});