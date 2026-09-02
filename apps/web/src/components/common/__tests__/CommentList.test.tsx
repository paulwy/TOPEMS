import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';

import CommentList from '../CommentList';
import type { Comment } from '../CommentList';

vi.mock('react-i18next', () => {
  const merge = (...objs: Record<string, string>[]) => Object.assign({}, ...objs);
  const i18nMap = merge(
    require('../../../i18n/locales/zh/common.json'),
    require('../../../i18n/locales/zh/components.json'),
    require('../../../i18n/locales/zh/pages.json'),
    require('../../../i18n/locales/zh/templates.json')
  );
  return {
    useTranslation: () => ({
      t: (key: string) => i18nMap[key] ?? key,
      i18n: { language: 'zh' },
    }),
    initReactI18next: { type: '3rdParty', init: () => {} },
    Trans: ({ i18nKey, children }: { i18nKey?: string; children?: any }) =>
      i18nKey ? (i18nMap[i18nKey] ?? i18nKey) : children,
  };
});

vi.mock('@/i18n', () => {
  const merge = (...objs: Record<string, string>[]) => Object.assign({}, ...objs);
  const i18nMap = merge(
    require('../../../i18n/locales/zh/common.json'),
    require('../../../i18n/locales/zh/components.json'),
    require('../../../i18n/locales/zh/pages.json'),
    require('../../../i18n/locales/zh/templates.json')
  );
  return {
    default: {
      t: (key: string) => i18nMap[key] ?? key,
      language: 'zh',
      on: () => {},
      use: () => ({ init: () => {} }),
      init: () => {},
    },
  };
});

const sampleComments: Comment[] = [
  {
    id: 'c1',
    content: '这是第一条评论的内容',
    author: { id: 'u1', name: '张三' },
    createdAt: '2024-01-01 10:00',
    likes: 3,
  },
  {
    id: 'c2',
    content: '第二条评论',
    author: { id: 'u2', name: '李四', avatar: 'https://example.com/a.png' },
    createdAt: '2024-01-02 11:30',
    likes: 0,
  },
];

describe('CommentList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a list of comments', () => {
    renderWithProviders(<CommentList comments={sampleComments} />);
    expect(screen.getByText('这是第一条评论的内容')).toBeInTheDocument();
    expect(screen.getByText('第二条评论')).toBeInTheDocument();
  });

  it('renders empty state when comments list is empty', () => {
    renderWithProviders(<CommentList comments={[]} />);
    expect(screen.getByText('暂无评论，快来发表第一条评论吧')).toBeInTheDocument();
  });

  it('renders author name for each comment', () => {
    renderWithProviders(<CommentList comments={sampleComments} />);
    expect(screen.getByText('张三')).toBeInTheDocument();
    expect(screen.getByText('李四')).toBeInTheDocument();
  });

  it('renders comment content', () => {
    renderWithProviders(<CommentList comments={sampleComments} />);
    expect(screen.getByText('这是第一条评论的内容')).toBeInTheDocument();
  });

  it('renders the created time for each comment', () => {
    renderWithProviders(<CommentList comments={sampleComments} />);
    expect(screen.getByText('2024-01-01 10:00')).toBeInTheDocument();
    expect(screen.getByText('2024-01-02 11:30')).toBeInTheDocument();
  });

  it('renders avatar image when avatar URL is provided', () => {
    const { container } = renderWithProviders(<CommentList comments={sampleComments} />);
    const imgs = container.querySelectorAll('img');
    // First comment has no avatar, second has avatar URL
    const avatarImg = Array.from(imgs).find(
      (img) => img.getAttribute('src') === 'https://example.com/a.png'
    );
    expect(avatarImg).toBeDefined();
  });

  it('renders likes count for comments', () => {
    renderWithProviders(<CommentList comments={sampleComments} />);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders add comment section by default', () => {
    renderWithProviders(<CommentList comments={[]} />);
    expect(screen.getByText('添加评论')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('写下你的评论...')).toBeInTheDocument();
  });

  it('hides add comment section when allowAdd is false', () => {
    renderWithProviders(
      <CommentList
        comments={[]}
        allowAdd={false}
      />
    );
    expect(screen.queryByText('添加评论')).not.toBeInTheDocument();
  });

  it('calls onLike when like button is clicked', () => {
    const handleLike = vi.fn();
    renderWithProviders(
      <CommentList
        comments={sampleComments}
        onLike={handleLike}
      />
    );
    // Like buttons are buttons containing ThumbsUp; click first one
    const likeButtons = screen.getAllByRole('button');
    // The first like button is the one next to the first comment (after the add-comment send button)
    // Find button by looking for the one whose text content includes the like count "3"
    const likeBtn = likeButtons.find((b) => b.textContent === '3');
    expect(likeBtn).toBeDefined();
    fireEvent.click(likeBtn!);
    expect(handleLike).toHaveBeenCalledWith('c1');
  });
});
