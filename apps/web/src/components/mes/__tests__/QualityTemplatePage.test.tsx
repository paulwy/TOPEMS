import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import QualityTemplatePage from '@/components/mes/setting/QualityTemplatePage';

vi.mock('@/components/common', () => ({
  PageContainer: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/templates', () => ({
  SettingsPageTemplate: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('lucide-react', () => ({
  Settings: () => <div>icon</div>,
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

describe('QualityTemplatePage', () => {
  it('渲染页面不报错', () => {
    render(<QualityTemplatePage />);
    expect(document.body).toBeTruthy();
  });
});
