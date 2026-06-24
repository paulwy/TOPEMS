import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import FinanceInvoicePage from '@/pages/finance/FinanceInvoicePage';

// 增加测试超时时间
vi.setConfig({ testTimeout: 30000 });

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('FinanceInvoicePage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('组件存在性', () => {
    it('FinanceInvoicePage 组件应该存在', () => {
      expect(FinanceInvoicePage).toBeDefined();
    });

    it('FinanceInvoicePage 是一个有效的 React 组件', () => {
      expect(typeof FinanceInvoicePage).toBe('function');
    });
  });

  describe('基本渲染', () => {
    it('页面能够正常渲染', async () => {
      await act(async () => {
        renderWithProviders(<FinanceInvoicePage />);
      });

      await waitFor(
        () => {
          expect(screen.queryByText('发票管理')).toBeTruthy();
        },
        { timeout: 3000 }
      );
    });
  });
});
