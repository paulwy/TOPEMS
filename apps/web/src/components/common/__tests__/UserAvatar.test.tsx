import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';
import UserAvatar from '../UserAvatar';

describe('UserAvatar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders avatar with initials from English name', () => {
    renderWithProviders(<UserAvatar name='John Doe' />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders avatar with initials from Chinese name', () => {
    renderWithProviders(<UserAvatar name='张三' />);
    expect(screen.getByText('张')).toBeInTheDocument();
  });

  it('renders avatar with initials from email when name is not provided', () => {
    renderWithProviders(<UserAvatar email='john.doe@example.com' />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders avatar image when src is provided', () => {
    const testSrc = 'https://example.com/avatar.jpg';
    renderWithProviders(
      <UserAvatar
        name='John'
        src={testSrc}
      />
    );
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', testSrc);
  });

  it('renders avatar with alt text', () => {
    renderWithProviders(
      <UserAvatar
        name='John Doe'
        alt='John Doe Avatar'
        src='https://example.com/a.jpg'
      />
    );
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('alt', 'John Doe Avatar');
  });

  it('renders avatar with different sizes without errors', () => {
    const { container: c1 } = renderWithProviders(
      <UserAvatar
        name='Test'
        size={24}
      />
    );
    expect(c1.querySelector('.MuiAvatar-root')).toBeInTheDocument();

    const { container: c2 } = renderWithProviders(
      <UserAvatar
        name='Test'
        size={48}
      />
    );
    const avatar = c2.querySelector('.MuiAvatar-root') as HTMLElement;
    expect(avatar).toBeInTheDocument();
    const styles = window.getComputedStyle(avatar);
    if (styles.width) {
      expect(styles.width).toBe('48px');
    }
  });

  it('renders without tooltip when showTooltip is false', () => {
    renderWithProviders(
      <UserAvatar
        name='John Doe'
        showTooltip={false}
      />
    );
    expect(screen.getByText('JD')).toBeInTheDocument();
    expect(document.querySelector('[role="tooltip"]')).not.toBeInTheDocument();
  });

  it('renders default user icon when no name or email provided', () => {
    const { container } = renderWithProviders(<UserAvatar showTooltip={false} />);
    const avatar = container.querySelector('.MuiAvatar-root');
    expect(avatar).toBeInTheDocument();
    // Should render the User icon (svg) inside the avatar
    expect(avatar?.querySelector('svg')).toBeInTheDocument();
  });
});
