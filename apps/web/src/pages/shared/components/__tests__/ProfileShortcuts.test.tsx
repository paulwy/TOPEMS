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

// 使用真实 designTokens（theme.ts 模块加载时需要完整 tokens）

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
});
