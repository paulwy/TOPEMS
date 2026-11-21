import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor, fireEvent } from '@/__tests__/test-utils';

import AiPromptLibraryPage from '../AiPromptLibraryPage';

// --- mock i18n（页面直接调 i18n.t；列表视图行按钮文本用 key 原文断言）---
vi.mock('@/i18n', () => {
  const keys: Record<string, string> = {
    'ai.ai_prompt_library_page.k0': '写作助手',
    'ai.ai_prompt_library_page.k1': '撰写各类文案',
    'ai.ai_prompt_library_page.k3': '代码生成器',
    'ai.ai_prompt_library_page.k4': '生成代码片段',
    'ai.ai_prompt_library_page.k6': '数据分析',
    'ai.ai_prompt_library_page.k7': '分析业务数据',
    'ai.ai_prompt_library_page.k10': '使用提示词',
    'ai.ai_prompt_library_page.k17': '收藏',
  };
  return { default: { t: (k: string) => keys[k] ?? k } };
});

vi.mock('@/api/ai', () => {
  const items = [
    {
      id: '1',
      name: '写作助手',
      description: '撰写各类文案',
      category: 'writing',
      content: '请写一篇关于{主题}的文章',
      variables: ['主题'],
      usage_count: 12,
      is_favorite: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      created_by: 'tester',
    },
    {
      id: '2',
      name: '代码生成器',
      description: '生成代码片段',
      category: 'coding',
      content: '实现{功能}',
      variables: ['功能'],
      usage_count: 5,
      is_favorite: false,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      created_by: 'tester',
    },
    {
      id: '3',
      name: '数据分析',
      description: '分析业务数据',
      category: 'analysis',
      content: '分析{数据}',
      variables: ['数据'],
      usage_count: 3,
      is_favorite: false,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      created_by: 'tester',
    },
  ];
  return {
    aiApi: {
      listPromptTemplates: vi.fn(async () => ({
        success: true,
        data: { items, total: items.length, page: 1, page_size: 100 },
      })),
      togglePromptFavorite: vi.fn(async (id: string) => ({
        success: true,
        data: { id, is_favorite: true },
      })),
      deletePromptTemplate: vi.fn(async () => ({ success: true, data: true })),
      usePromptTemplate: vi.fn(async () => ({
        success: true,
        data: { result: '生成结果', formatted_prompt: '提示词' },
      })),
    },
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

// --- mock store：支持 zustand selector 式调用（页面用 useNotificationStore((s) => s.addNotification)）---
vi.mock('@/store', () => {
  const addNotification = vi.fn();
  return {
    useNotificationStore: (
      selector?: (s: { addNotification: typeof addNotification }) => unknown
    ) => (selector ? selector({ addNotification }) : { addNotification }),
  };
});

describe('AiPromptLibraryPage（#22 补测 · ai 域）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('渲染提示词列表（cell-name 行）', async () => {
    renderWithProviders(<AiPromptLibraryPage />);
    await waitFor(() => {
      expect(screen.getAllByTestId('cell-name').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('写作助手')).toBeInTheDocument();
    expect(screen.getByText('代码生成器')).toBeInTheDocument();
    expect(screen.getByText('数据分析')).toBeInTheDocument();
  });

  it('行 action「使用」→ 打开 Use Dialog', async () => {
    renderWithProviders(<AiPromptLibraryPage />);
    await waitFor(() => {
      expect(screen.getByText('写作助手')).toBeInTheDocument();
    });
    // 行 action use（key 原文按钮，首行）
    fireEvent.click(screen.getAllByText('ai.ai_prompt_library_page.k19')[0]);
    // Use Dialog 打开（title=所选 prompt.name=写作助手）
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getAllByText('写作助手').length).toBeGreaterThanOrEqual(2);
    });
  });

  it('行 action「删除」→ 乐观更新（setQueryData 过滤行）', async () => {
    const { useQueryClient } = await import('@tanstack/react-query');
    const qc = useQueryClient() as unknown as { setQueryData: ReturnType<typeof vi.fn> };
    renderWithProviders(<AiPromptLibraryPage />);
    await waitFor(() => {
      expect(screen.getByText('写作助手')).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByText('templates.list_page_template.k42')[0]);
    await waitFor(() => {
      expect(qc.setQueryData).toHaveBeenCalled();
      const updater = qc.setQueryData.mock.calls.find((c) => typeof c[1] === 'function')?.[1] as
        ((old: unknown) => unknown) | undefined;
      expect(typeof updater).toBe('function');
      const next = updater?.([
        { id: '1', is_favorite: true },
        { id: '2', is_favorite: true },
      ]) as Array<{ id: string }>;
      expect(next).toEqual([{ id: '2', is_favorite: true }]);
    });
  });
});
