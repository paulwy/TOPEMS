import React from 'react';
import { render, screen } from '@testing-library/react';
import { RelativeTime } from '../components/RelativeTime';

jest.mock('@topems/shared-utils', () => ({
  formatRelativeTime: jest.fn((date) => {
    const now = new Date();
    const target = new Date(date);
    const diff = now.getTime() - target.getTime();
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return `${Math.floor(diff / 86400000)}天前`;
  }),
}));

describe('RelativeTime Component', () => {
  it('renders with string date', () => {
    const date = new Date().toISOString();
    render(<RelativeTime date={date} />);
    expect(screen.getByText('刚刚')).toBeInTheDocument();
  });

  it('renders with Date object', () => {
    const date = new Date();
    render(<RelativeTime date={date} />);
    expect(screen.getByText('刚刚')).toBeInTheDocument();
  });

  it('renders with custom update interval', () => {
    const date = new Date();
    render(<RelativeTime date={date} updateInterval={30000} />);
    expect(screen.getByText('刚刚')).toBeInTheDocument();
  });

  it('renders with showAbsolute', () => {
    const date = new Date();
    render(<RelativeTime date={date} showAbsolute />);
    expect(screen.getByText('刚刚')).toBeInTheDocument();
  });

  it('renders with custom sx props', () => {
    const date = new Date();
    const { container } = render(<RelativeTime date={date} sx={{ color: 'red' }} />);
    const typography = container.querySelector('span');
    expect(typography).toHaveStyle({ color: 'red' });
  });

  it('renders past time correctly', () => {
    const date = new Date(Date.now() - 3600000).toISOString();
    render(<RelativeTime date={date} />);
    expect(screen.getByText('1小时前')).toBeInTheDocument();
  });

  it('renders days ago correctly', () => {
    const date = new Date(Date.now() - 86400000 * 2).toISOString();
    render(<RelativeTime date={date} />);
    expect(screen.getByText('2天前')).toBeInTheDocument();
  });
});