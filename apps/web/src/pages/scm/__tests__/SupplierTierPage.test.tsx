import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import { SupplierTierPage } from '@/pages/scm/setting/SupplierTierPage';

vi.mock('@/components/common', () => ({
  PageContainer: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/templates', () => ({
  SettingsPageTemplate: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/api/scm', () => ({
  scmApi: { settings: { get: vi.fn(), update: vi.fn() } },
}));

vi.mock('lucide-react', () => ({
  Settings: () => <div>icon</div>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

describe('SupplierTierPage', () => {
  it('渲染页面不报错', () => {
    render(<SupplierTierPage />);
    expect(document.body).toBeTruthy();
  });
});
