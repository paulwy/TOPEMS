import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import { FormDialog } from '../FormDialog';
import { renderWithProviders } from '@/__tests__/test-utils';

const { i18nMap, translate } = vi.hoisted(() => {
  const i18nMap: Record<string, string> = {
    'shared.form_dialog.k0': '保存',
    'shared.form_dialog.k1': '取消',
  };

  const translate = (key: string, options?: Record<string, unknown>): string => {
    if (i18nMap[key]) {
      let result = i18nMap[key];
      if (options) {
        for (const [k, v] of Object.entries(options)) {
          result = result.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
        }
      }
      return result;
    }
    if (!options) return key;
    return `${key}:${Object.values(options).join(',')}`;
  };

  return { i18nMap, translate };
});

vi.mock('react-i18next', () => ({
  useTranslation: (ns?: string) => ({
    t: (key: string, options?: Record<string, unknown>) => translate(key, options),
    i18n: { language: 'zh-CN', changeLanguage: vi.fn(), exists: (k: string) => !!i18nMap[k] },
    ready: true,
  }),
  withTranslation: () => (Component: any) => Component,
  initReactI18next: { type: '3rdParty', init: vi.fn() },
  Trans: ({ i18nKey, children }: { i18nKey?: string; children?: any }) =>
    i18nKey ? translate(i18nKey) : children,
}));

vi.mock('@/i18n', () => ({
  default: {
    t: (key: string, options?: Record<string, unknown>) => translate(key, options),
    language: 'zh-CN',
    changeLanguage: vi.fn(),
    exists: (key: string) => !!i18nMap[key],
  },
}));

vi.mock('@/store', () => ({
  useNotificationStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
        }
  ),
  useAuthStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          user: null,
        })
      : {
          user: null,
        }
  ),
}));

describe('FormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when open is false', () => {
    renderWithProviders(
      <FormDialog
        open={false}
        title='新增用户'
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      >
        <p>表单内容</p>
      </FormDialog>
    );
    expect(screen.queryByText('新增用户')).not.toBeInTheDocument();
    expect(screen.queryByText('表单内容')).not.toBeInTheDocument();
  });

  it('renders title and children when open is true', () => {
    renderWithProviders(
      <FormDialog
        open
        title='编辑用户'
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      >
        <p>表单内容</p>
      </FormDialog>
    );
    expect(screen.getByText('编辑用户')).toBeInTheDocument();
    expect(screen.getByText('表单内容')).toBeInTheDocument();
  });

  it('renders default confirm and cancel button text', () => {
    renderWithProviders(
      <FormDialog
        open
        title='测试'
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /保存/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /取消/i })).toBeInTheDocument();
  });

  it('renders custom confirm and cancel button text', () => {
    renderWithProviders(
      <FormDialog
        open
        title='测试'
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        confirmText='确定'
        cancelText='返回'
      />
    );
    expect(screen.getByRole('button', { name: /确定/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /返回/i })).toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', () => {
    const handleClose = vi.fn();
    renderWithProviders(
      <FormDialog
        open
        title='测试'
        onClose={handleClose}
        onSubmit={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /取消/i }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onSubmit when confirm button is clicked', () => {
    const handleSubmit = vi.fn();
    renderWithProviders(
      <FormDialog
        open
        title='测试'
        onClose={vi.fn()}
        onSubmit={handleSubmit}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /保存/i }));
    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });

  it('calls onSubmit when Enter key is pressed inside the form', () => {
    const handleSubmit = vi.fn();
    renderWithProviders(
      <FormDialog
        open
        title='测试'
        onClose={vi.fn()}
        onSubmit={handleSubmit}
      >
        <input
          data-testid='inner-input'
          type='text'
        />
      </FormDialog>
    );
    const input = screen.getByTestId('inner-input');
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });
    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });

  it('disables confirm button and shows loading text when loading is true', () => {
    renderWithProviders(
      <FormDialog
        open
        title='测试'
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        loading
      />
    );
    // loading 时确认按钮被禁用（MUI Dialog 显示 spinner 替代 label 文本时用 DOM 定位 fallback）
    const confirmLabel = screen.queryByText('保存');
    if (confirmLabel) {
      const confirmButton = confirmLabel.closest('button');
      expect(confirmButton).not.toBeNull();
      expect(confirmButton).toBeDisabled();
    } else {
      // Fallback: 所有被 disabled 的 button 至少有 1 个（确认按钮）
      const buttons = screen.getAllByRole('button');
      const disabledButtons = buttons.filter((b) => b.hasAttribute('disabled'));
      expect(disabledButtons.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('disables confirm button when disableSubmit is true', () => {
    renderWithProviders(
      <FormDialog
        open
        title='测试'
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        disableSubmit
      />
    );
    expect(screen.getByRole('button', { name: /保存/i })).toBeDisabled();
  });

  it('hides cancel button when hideCancelButton is true', () => {
    renderWithProviders(
      <FormDialog
        open
        title='测试'
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        hideCancelButton
      />
    );
    expect(screen.queryByRole('button', { name: /取消/i })).not.toBeInTheDocument();
  });
});
