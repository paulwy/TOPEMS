import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';
import { TabGroup, type TabItem } from '../Tabs';

vi.mock('@/i18n', () => ({
  default: { t: (k: string) => k, language: 'zh', on: () => {}, off: () => {} },
  SUPPORTED_LANGUAGES: [{ code: 'zh', name: '中文', flag: 'CN' }],
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'zh' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const items: TabItem[] = [
  { key: 'enterprise', label: '企业平台' },
  { key: 'manufacturing', label: '制造域' },
  { key: 'platform', label: '平台能力', disabled: true },
];

describe('TabGroup', () => {
  it('renders tablist with all tabs and correct ARIA roles', () => {
    renderWithProviders(
      <TabGroup
        items={items}
        value='enterprise'
        onChange={() => {}}
      />
    );
    const tablist = screen.getByRole('tablist');
    expect(tablist).toBeInTheDocument();
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
  });

  it('marks disabled tabs with aria-disabled', () => {
    renderWithProviders(
      <TabGroup
        items={items}
        value='enterprise'
        onChange={() => {}}
      />
    );
    const disabledTab = screen.getByRole('tab', { name: '平台能力' });
    expect(disabledTab).toHaveAttribute('aria-disabled', 'true');
    expect(disabledTab).toBeDisabled();
  });

  it('fires onChange when clicking an inactive tab', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <TabGroup
        items={items}
        value='enterprise'
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByRole('tab', { name: '制造域' }));
    expect(onChange).toHaveBeenCalledWith('manufacturing');
  });

  it('does not fire onChange when clicking the active tab', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <TabGroup
        items={items}
        value='enterprise'
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByRole('tab', { name: '企业平台' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
