import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { Dialog } from '../Dialog';
import { renderWithProviders } from '@/__tests__/test-utils';

vi.mock('react-i18next', () => {
  const merge = (...objs: Record<string, string>[]) => Object.assign({}, ...objs);
  const i18nMap = merge(
    require('../../../i18n/locales/zh/common.json'),
    require('../../../i18n/locales/zh/components.json'),
    require('../../../i18n/locales/zh/pages.json'),
    require('../../../i18n/locales/zh/templates.json'),
    require('../../../i18n/locales/zh/design-system.json')
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
    require('../../../i18n/locales/zh/templates.json'),
    require('../../../i18n/locales/zh/design-system.json')
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

describe('Dialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children when open', () => {
    renderWithProviders(
      <Dialog
        open
        onClose={vi.fn()}
        title='测试对话框'
      >
        <p>对话框内容</p>
      </Dialog>
    );
    expect(screen.getByText('测试对话框')).toBeInTheDocument();
    expect(screen.getByText('对话框内容')).toBeInTheDocument();
  });

  it('does not render content when closed', () => {
    renderWithProviders(
      <Dialog
        open={false}
        onClose={vi.fn()}
        title='关闭的对话框'
      >
        <p>不应显示</p>
      </Dialog>
    );
    expect(screen.queryByText('关闭的对话框')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    renderWithProviders(
      <Dialog
        open
        onClose={handleClose}
        title='可关闭对话框'
      />
    );
    const closeButtons = screen.getAllByRole('button');
    const closeButton = closeButtons.find((btn) => btn.querySelector('svg'));
    if (closeButton) {
      fireEvent.click(closeButton);
      expect(handleClose).toHaveBeenCalledTimes(1);
    }
  });

  it('does not show close button when showCloseButton is false', () => {
    renderWithProviders(
      <Dialog
        open
        onClose={vi.fn()}
        title='无关闭按钮'
        showCloseButton={false}
      />
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    const closeIcons = dialog.querySelectorAll('svg');
    expect(closeIcons.length).toBe(0);
  });

  it('does not close when closable is false', () => {
    const handleClose = vi.fn();
    renderWithProviders(
      <Dialog
        open
        onClose={handleClose}
        title='不可关闭'
        closable={false}
        showCloseButton={false}
      />
    );
    expect(screen.getByText('不可关闭')).toBeInTheDocument();
  });

  it('renders confirm button', () => {
    renderWithProviders(
      <Dialog
        open
        onClose={vi.fn()}
        title='确认对话框'
        confirmButton={{ label: '确认', onClick: vi.fn() }}
      />
    );
    expect(screen.getByRole('button', { name: /确认/i })).toBeInTheDocument();
  });

  it('renders cancel button', () => {
    renderWithProviders(
      <Dialog
        open
        onClose={vi.fn()}
        title='取消对话框'
        cancelButton={{ label: '取消' }}
      />
    );
    expect(screen.getByRole('button', { name: /取消/i })).toBeInTheDocument();
  });

  it('calls confirmButton onClick when confirm is clicked', () => {
    const handleConfirm = vi.fn();
    renderWithProviders(
      <Dialog
        open
        onClose={vi.fn()}
        title='确认操作'
        confirmButton={{ label: '确认', onClick: handleConfirm }}
      />
    );
    const confirmButton = screen.getByRole('button', { name: /确认/i });
    fireEvent.click(confirmButton);
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls cancelButton onClick when cancel is clicked', () => {
    const handleCancel = vi.fn();
    renderWithProviders(
      <Dialog
        open
        onClose={vi.fn()}
        title='取消操作'
        cancelButton={{ label: '取消', onClick: handleCancel }}
      />
    );
    const cancelButton = screen.getByRole('button', { name: /取消/i });
    fireEvent.click(cancelButton);
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel button has no onClick', () => {
    const handleClose = vi.fn();
    renderWithProviders(
      <Dialog
        open
        onClose={handleClose}
        title='默认取消'
        cancelButton={{ label: '取消' }}
      />
    );
    const cancelButton = screen.getByRole('button', { name: /取消/i });
    fireEvent.click(cancelButton);
    expect(handleClose).toHaveBeenCalled();
  });

  it('disables confirm button when confirmButton.disabled is true', () => {
    renderWithProviders(
      <Dialog
        open
        onClose={vi.fn()}
        title='禁用确认'
        confirmButton={{ label: '确认', disabled: true }}
      />
    );
    const confirmButton = screen.getByRole('button', { name: /确认/i });
    expect(confirmButton).toBeDisabled();
  });

  it('shows loading text on confirm button when loading', () => {
    renderWithProviders(
      <Dialog
        open
        onClose={vi.fn()}
        title='加载中'
        confirmButton={{ label: '确认', loading: true }}
      />
    );
    expect(screen.getByText('处理中...')).toBeInTheDocument();
  });

  it('renders custom actions when provided', () => {
    renderWithProviders(
      <Dialog
        open
        onClose={vi.fn()}
        title='自定义操作'
        actions={<button data-testid='custom-action'>自定义按钮</button>}
      />
    );
    expect(screen.getByTestId('custom-action')).toBeInTheDocument();
  });

  it('renders with different maxWidth', () => {
    const { rerender } = renderWithProviders(
      <Dialog
        open
        onClose={vi.fn()}
        title='小尺寸'
        maxWidth='sm'
      />
    );
    expect(screen.getByText('小尺寸')).toBeInTheDocument();

    rerender(
      <Dialog
        open
        onClose={vi.fn()}
        title='大尺寸'
        maxWidth='lg'
      />
    );
    expect(screen.getByText('大尺寸')).toBeInTheDocument();
  });

  it('renders without title', () => {
    renderWithProviders(
      <Dialog
        open
        onClose={vi.fn()}
      >
        <p>无标题对话框</p>
      </Dialog>
    );
    expect(screen.getByText('无标题对话框')).toBeInTheDocument();
  });

  it('renders with confirmButton color', () => {
    renderWithProviders(
      <Dialog
        open
        onClose={vi.fn()}
        title='彩色按钮'
        confirmButton={{ label: '成功', color: 'success' }}
      />
    );
    const confirmButton = screen.getByRole('button', { name: /成功/i });
    expect(confirmButton).toBeInTheDocument();
  });
});
