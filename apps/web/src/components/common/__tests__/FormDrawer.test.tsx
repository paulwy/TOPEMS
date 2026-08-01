import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import { FormDrawer } from '../FormDrawer';
import { renderWithProviders } from '@/__tests__/test-utils';

const i18nMap: Record<string, string> = {
  'components.common.formDrawer.confirmText': '保存',
  'components.common.formDrawer.cancelText': '取消',
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => i18nMap[key] ?? key,
    i18n: {
      changeLanguage: vi.fn(),
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn(),
  },
  Trans: ({ children }: any) => children,
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

describe('FormDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render title when open is false', () => {
    renderWithProviders(
      <FormDrawer
        open={false}
        title='编辑用户'
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      >
        <p>表单内容</p>
      </FormDrawer>
    );
    expect(screen.queryByText('编辑用户')).not.toBeInTheDocument();
  });

  it('renders title and children when open is true', () => {
    renderWithProviders(
      <FormDrawer
        open
        title='编辑用户'
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      >
        <p>表单内容</p>
      </FormDrawer>
    );
    expect(screen.getByText('编辑用户')).toBeInTheDocument();
    expect(screen.getByText('表单内容')).toBeInTheDocument();
  });

  it('renders default confirm and cancel button text', () => {
    renderWithProviders(
      <FormDrawer
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
      <FormDrawer
        open
        title='测试'
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        confirmText='提交'
        cancelText='返回'
      />
    );
    expect(screen.getByRole('button', { name: /提交/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /返回/i })).toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', () => {
    const handleClose = vi.fn();
    renderWithProviders(
      <FormDrawer
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
      <FormDrawer
        open
        title='测试'
        onClose={vi.fn()}
        onSubmit={handleSubmit}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /保存/i }));
    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });

  it('disables confirm button when loading is true', () => {
    renderWithProviders(
      <FormDrawer
        open
        title='测试'
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        loading
      />
    );
    expect(screen.getByRole('button', { name: /保存/i })).toBeDisabled();
  });

  it('disables confirm button when disableSubmit is true', () => {
    renderWithProviders(
      <FormDrawer
        open
        title='测试'
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        disableSubmit
      />
    );
    expect(screen.getByRole('button', { name: /保存/i })).toBeDisabled();
  });
});
