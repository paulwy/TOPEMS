import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import ProjectTimelinePage from '@/pages/pm/ProjectTimelinePage';

vi.mock('@/components/templates/TimelinePageTemplate', () => ({
  TimelinePageTemplate: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/common', () => ({
  PageContainer: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/api/pm/project', () => ({
  milestoneApi: { list: vi.fn() },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('lucide-react', () => ({
  Plus: () => <div>icon</div>,
  Rocket: () => <div>icon</div>,
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

vi.mock('./ProjectTimelinePage.module.css', () => ({}));

describe('ProjectTimelinePage', () => {
  it('渲染页面不报错', () => {
    render(<ProjectTimelinePage />);
    expect(document.body).toBeTruthy();
  });
});
