import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils';

import ProfileShortcuts from '../ProfileShortcuts';
import type { UseProfileReturn } from '../../ProfilePage/hooks/useProfile';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/theme/tokens', () => ({
  designTokens: {
    colors: {
      purple: { 500: '#7c3aed' },
      pink: { 500: '#ec4899' },
    },
  },
}));

vi.mock('@/modules/im/config', () => ({
  IM_PATHS: {
    root: '/im',
  },
}));

vi.mock('lucide-react', () => {
  const icon =
    (name: string) =>
    ({ size: _size, style: _style }: { size?: number; style?: React.CSSProperties }) => (
      <svg data-testid={`icon-${name}`} />
    );

  return {
    Activity: icon('activity'),
    Bell: icon('bell'),
    Bot: icon('bot'),
    FileText: icon('file-text'),
    GitBranch: icon('git-branch'),
    MessageSquare: icon('message-square'),
  };
});

describe('ProfileShortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders available shortcuts and selected shortcut chips', () => {
    const handleShortcutToggle = vi.fn();
    const profile = {
      shortcuts: [
        {
          id: '1',
          title: 'shared.profile.shortcut_dashboard',
          icon: 'Activity',
          path: '/dashboard',
        },
      ],
      handleShortcutToggle,
    } as unknown as UseProfileReturn;

    renderWithProviders(<ProfileShortcuts profile={profile} />);

    expect(screen.getByText('shared.profile.my_shortcuts')).toBeInTheDocument();
    expect(screen.getByText('shared.profile.select_shortcuts')).toBeInTheDocument();
    expect(screen.getByText('shared.profile.shortcut_dashboard')).toBeInTheDocument();
    expect(screen.getByText('shared.profile.shortcut_messages')).toBeInTheDocument();
    expect(screen.getByText('shared.profile.added')).toBeInTheDocument();
    expect(screen.getByText('shared.profile.current_shortcuts')).toBeInTheDocument();
    expect(screen.getByText('shared.profile.shortcut_dashboard ×')).toBeInTheDocument();
    expect(screen.getByTestId('icon-message-square')).toBeInTheDocument();
  });

  it('delegates shortcut option and current chip toggles', () => {
    const handleShortcutToggle = vi.fn();
    const profile = {
      shortcuts: [
        {
          id: '1',
          title: 'shared.profile.shortcut_dashboard',
          icon: 'Activity',
          path: '/dashboard',
        },
      ],
      handleShortcutToggle,
    } as unknown as UseProfileReturn;

    renderWithProviders(<ProfileShortcuts profile={profile} />);

    fireEvent.click(screen.getByText('shared.profile.shortcut_docs'));
    fireEvent.click(screen.getByText('shared.profile.shortcut_dashboard ×'));

    expect(handleShortcutToggle).toHaveBeenNthCalledWith(1, {
      id: '2',
      title: 'shared.profile.shortcut_docs',
      icon: 'FileText',
      path: '/documents',
    });
    expect(handleShortcutToggle).toHaveBeenNthCalledWith(2, profile.shortcuts[0]);
  });

  it('omits current shortcut section when no shortcuts are selected', () => {
    const profile = {
      shortcuts: [],
      handleShortcutToggle: vi.fn(),
    } as unknown as UseProfileReturn;

    renderWithProviders(<ProfileShortcuts profile={profile} />);

    expect(screen.queryByText('shared.profile.current_shortcuts')).not.toBeInTheDocument();
    expect(screen.queryByText('shared.profile.added')).not.toBeInTheDocument();
  });
});
