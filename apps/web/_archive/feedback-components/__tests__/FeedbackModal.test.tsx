import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';

import FeedbackModal from '../FeedbackModal';
import { feedbackApi } from '@/api/feedback';
import { toast } from 'react-toastify';

const { i18nMap, translate } = vi.hoisted(() => {
  const i18nMap: Record<string, string> = {
    'components.feedback_modal.k0': '反馈提交成功',
    'components.feedback_modal.k1': '反馈提交失败，请重试',
    'components.feedback_modal.k2': '提交反馈',
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

// Mock feedback API
vi.mock('@/api/feedback', () => ({
  feedbackApi: {
    createFeedback: vi.fn(),
  },
}));

// Mock react-toastify
vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock FeedbackForm to capture onSubmit callback
vi.mock('../FeedbackForm', () => ({
  default: ({ onSubmit, loading }: { onSubmit: (data: unknown) => void; loading?: boolean }) => (
    <div data-testid='mock-feedback-form'>
      <button
        data-testid='mock-submit'
        onClick={() =>
          onSubmit({
            type: 'bug',
            title: '测试标题',
            description: '测试描述',
            satisfaction: 3,
          })
        }
      >
        {loading ? '提交中...' : '模拟提交'}
      </button>
    </div>
  ),
}));

describe('FeedbackModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(feedbackApi.createFeedback).mockResolvedValue({
      code: 0,
      success: true,
      data: {} as never,
      message: 'ok',
      timestamp: Date.now(),
    });
  });

  it('does not render dialog content when open is false', () => {
    renderWithProviders(
      <FeedbackModal
        open={false}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByText('提交反馈')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-feedback-form')).not.toBeInTheDocument();
  });

  it('renders dialog with title when open is true', () => {
    renderWithProviders(
      <FeedbackModal
        open
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('提交反馈')).toBeInTheDocument();
    expect(screen.getByTestId('mock-feedback-form')).toBeInTheDocument();
  });

  it('renders FeedbackForm inside the dialog', () => {
    renderWithProviders(
      <FeedbackModal
        open
        onClose={vi.fn()}
      />
    );
    expect(screen.getByTestId('mock-feedback-form')).toBeInTheDocument();
  });

  it('calls onClose when dialog close button is clicked', () => {
    const handleClose = vi.fn();
    renderWithProviders(
      <FeedbackModal
        open
        onClose={handleClose}
      />
    );

    // The Dialog title is '提交反馈'; the close button is an IconButton inside DialogTitle
    const titleElement = screen.getByText('提交反馈');
    const dialogTitle = titleElement.closest('.MuiDialogTitle-root');
    expect(dialogTitle).toBeTruthy();
    const closeButton = within(dialogTitle!).getByRole('button');
    fireEvent.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls createFeedback and onClose when form is submitted', async () => {
    const handleClose = vi.fn();
    renderWithProviders(
      <FeedbackModal
        open
        onClose={handleClose}
      />
    );

    const submitButton = screen.getByTestId('mock-submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(feedbackApi.createFeedback).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('反馈提交成功'));
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  it('shows error toast when submission fails', async () => {
    // Suppress unhandled rejection warning from the mock
    const rejectionHandler = vi.fn();
    process.on('unhandledRejection', rejectionHandler);

    vi.mocked(feedbackApi.createFeedback).mockImplementation(() =>
      Promise.reject(new Error('Network error'))
    );
    const handleClose = vi.fn();

    renderWithProviders(
      <FeedbackModal
        open
        onClose={handleClose}
      />
    );

    const submitButton = screen.getByTestId('mock-submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('反馈提交失败，请重试'));
      expect(handleClose).not.toHaveBeenCalled();
    });

    process.off('unhandledRejection', rejectionHandler);
  });
});
