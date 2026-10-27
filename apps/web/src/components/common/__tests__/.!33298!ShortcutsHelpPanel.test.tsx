import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';
import ShortcutsHelpPanel from '../ShortcutsHelpPanel';

vi.mock('react-i18next', () => {
  const sources = [
    require('../../../i18n/locales/zh/common.json'),
    require('../../../i18n/locales/zh/components.json'),
    require('../../../i18n/locales/zh/pages.json'),
    require('../../../i18n/locales/zh/templates.json'),
    require('../../../i18n/locales/zh/store.json'),
    require('../../../i18n/locales/zh/shared.json'),
    require('../../../i18n/locales/zh/hooks.json'),
  ];
  const i18nMap: Record<string, string> = {};
  for (const src of sources) {
    for (const [k, v] of Object.entries(src)) {
      i18nMap[k] = v as string;
    }
  }
  const t = (key: string) => i18nMap[key] ?? key;
  return {
    useTranslation: () => ({ t, i18n: { language: 'zh' } }),
    initReactI18next: { type: '3rdParty', init: () => {} },
    Trans: ({ i18nKey, children }: { i18nKey?: string; children?: unknown }) =>
      i18nKey ? (i18nMap[i18nKey] ?? i18nKey) : children,
  };
});

vi.mock('@/i18n', () => {
  const sources = [
    require('../../../i18n/locales/zh/common.json'),
    require('../../../i18n/locales/zh/components.json'),
    require('../../../i18n/locales/zh/pages.json'),
    require('../../../i18n/locales/zh/templates.json'),
    require('../../../i18n/locales/zh/store.json'),
    require('../../../i18n/locales/zh/shared.json'),
    require('../../../i18n/locales/zh/hooks.json'),
  ];
  const i18nMap: Record<string, string> = {};
  for (const src of sources) {
    for (const [k, v] of Object.entries(src)) {
      i18nMap[k] = v as string;
    }
  }
  const t = (key: string) => i18nMap[key] ?? key;
  return {
    default: {
      t,
      language: 'zh',
      on: () => {},
      use: () => ({ init: () => {} }),
      init: () => {},
    },
  };
});

describe('ShortcutsHelpPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog when isOpen is true', () => {
    renderWithProviders(
      <ShortcutsHelpPanel
        isOpen
        onClose={vi.fn()}
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does not render dialog when isOpen is false', () => {
    renderWithProviders(
      <ShortcutsHelpPanel
        isOpen={false}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders shortcut categories from GLOBAL_SHORTCUTS', () => {
    renderWithProviders(
      <ShortcutsHelpPanel
        isOpen
        onClose={vi.fn()}
      />
    );
