import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import KnowledgeBasePage from '../KnowledgeBasePage';
import type { TreePageTemplateProps } from '@/components/templates/TreePageTemplate';

// §4C 覆盖 barrel mock：全局 TreePageTemplate 是 children-only stub（吞掉 detailPanel），
// 这里覆盖为渲染 detailPanel 内容，使页面计算出的空态提示真正进入 DOM。
// 该页无 API 调用（使用 MOCK_DOCS 常量），无需 mock @/api/doc。
vi.mock('@/components/templates', () => ({
  TreePageTemplate: ({ detailPanel, data }: TreePageTemplateProps) => (
    <div>
      <div data-testid='tree-data'>{JSON.stringify((data ?? []).length)}</div>
      {detailPanel ? detailPanel(null) : null}
    </div>
  ),
}));

describe('KnowledgeBasePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty-state hint when no category selected', () => {
    renderWithProviders(<KnowledgeBasePage />);

    // detailPanel(null) 渲染空态 i18n.t('pages.knowledge_base_page.k37')
    expect(screen.getByText('选择一个分类查看知识库文档')).toBeInTheDocument();
  });

  it('passes built-in category tree data to template', () => {
    renderWithProviders(<KnowledgeBasePage />);

    // 5 个内置分类（产品手册/技术文档/培训资料/规章制度/常见问题）
    expect(screen.getByTestId('tree-data')).toHaveTextContent('5');
  });
});
