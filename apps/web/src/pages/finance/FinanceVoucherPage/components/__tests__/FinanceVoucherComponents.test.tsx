import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils';

const addNotification = vi.fn();

vi.mock('react-i18next', () => {
  const sources = [
    require('../../../../../i18n/locales/zh/finance.json'),
    require('../../../../../i18n/locales/zh/common.json'),
    require('../../../../../i18n/locales/zh/components.json'),
    require('../../../../../i18n/locales/zh/pages.json'),
    require('../../../../../i18n/locales/zh/templates.json'),
    require('../../../../../i18n/locales/zh/schema.json'),
  ];
  const i18nMap: Record<string, string> = {};
  for (const src of sources) {
    for (const [k, v] of Object.entries(src)) {
      i18nMap[k] = v as string;
    }
  }
  i18nMap['finance.finance_voucher_page_components_voucher_import_modal.e1'] =
    '用友凭证数据 (JSON格式)';
  i18nMap['finance.finance_voucher_page_components_subject_list_panel.e1'] =
    '上级科目';
  const t = (key: string, options?: Record<string, unknown>) => {
    let base = i18nMap[key] ?? key;
    if (typeof options === 'object' && options !== null) {
      for (const [k, v] of Object.entries(options)) {
        const strVal = String(v);
        const placeholder = `{{${k}}}`;
        if (base.includes(placeholder)) {
          base = base.split(placeholder).join(strVal);
        }
        const placeholder2 = `{${k}}`;
        if (base.includes(placeholder2)) {
          base = base.split(placeholder2).join(strVal);
        }
      }
    }
    return base;
  };
  return {
    useTranslation: () => ({ t, i18n: { language: 'zh' } }),
    initReactI18next: { type: '3rdParty', init: () => {} },
    Trans: ({ i18nKey, children }: { i18nKey?: string; children?: any }) =>
      i18nKey ? (i18nMap[i18nKey] ?? i18nKey) : children,
  };
});

vi.mock('@/i18n', () => {
  const sources = [
    require('../../../../../i18n/locales/zh/finance.json'),
    require('../../../../../i18n/locales/zh/common.json'),
    require('../../../../../i18n/locales/zh/components.json'),
    require('../../../../../i18n/locales/zh/pages.json'),
    require('../../../../../i18n/locales/zh/templates.json'),
    require('../../../../../i18n/locales/zh/schema.json'),
  ];
  const i18nMap: Record<string, string> = {};
  for (const src of sources) {
    for (const [k, v] of Object.entries(src)) {
      i18nMap[k] = v as string;
    }
  }
  i18nMap['finance.finance_voucher_page_components_voucher_import_modal.e1'] =
    '用友凭证数据 (JSON格式)';
  i18nMap['finance.finance_voucher_page_components_subject_list_panel.e1'] =
    '上级科目';
  const t = (key: string, options?: Record<string, unknown>) => {
    let base = i18nMap[key] ?? key;
    if (typeof options === 'object' && options !== null) {
      for (const [k, v] of Object.entries(options)) {
        const strVal = String(v);
        const placeholder = `{{${k}}}`;
        if (base.includes(placeholder)) {
          base = base.split(placeholder).join(strVal);
        }
        const placeholder2 = `{${k}}`;
        if (base.includes(placeholder2)) {
          base = base.split(placeholder2).join(strVal);
        }
      }
    }
    return base;
  };
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

vi.mock('@/store', () => ({
  useNotificationStore: (
    selector: (state: { addNotification: typeof addNotification }) => unknown
  ) => selector({ addNotification }),
}));

vi.mock('@/components/common', async () => {
  const React = await import('react');
  return {
    ConfirmDialog: ({
      isOpen,
      title,
      message,
      onClose,
      onConfirm,
      danger,
    }: {
      isOpen: boolean;
      title: string;
      message: string;
      onClose: () => void;
      onConfirm: () => void;
      danger?: boolean;
    }) =>
      isOpen
        ? React.createElement(
            'section',
            { 'data-testid': danger ? 'danger-confirm-dialog' : 'confirm-dialog' },
            React.createElement('h2', null, title),
            React.createElement('p', null, message),
            React.createElement('button', { onClick: onClose }, '关闭'),
            React.createElement('button', { onClick: onConfirm }, '确认')
          )
        : null,
    Dialog: ({
      open,
      title,
      children,
      cancelButton,
      confirmButton,
    }: {
      open: boolean;
      title: string;
      children: React.ReactNode;
      cancelButton?: { label: string; onClick: () => void };
      confirmButton?: { label: string; onClick: () => void };
    }) =>
      open
        ? React.createElement(
            'section',
            { role: 'dialog' },
            React.createElement('h2', null, title),
            children,
            cancelButton
              ? React.createElement('button', { onClick: cancelButton.onClick }, cancelButton.label)
              : null,
            confirmButton
              ? React.createElement(
                  'button',
                  { onClick: confirmButton.onClick },
                  confirmButton.label
                )
              : null
          )
        : null,
    FormField: (props: {
      id?: string;
      name: string;
      placeholder?: string;
      multiline?: boolean;
      rows?: number;
    }) =>
      React.createElement('textarea', {
        id: props.id,
        name: props.name,
        placeholder: props.placeholder,
        rows: props.rows,
        'aria-label': props.name,
      }),
    ActionButton: ({ label, onClick }: { label: string; onClick: () => void }) =>
      React.createElement('button', { onClick }, label),
  };
});

vi.mock('@/components', async () => {
  const React = await import('react');
  return {
    StatusBadge: ({ status, label }: { status: string; label: string }) =>
      React.createElement('span', { 'data-testid': `status-${status}` }, label),
    StatCardGroup: ({
      stats,
      columns,
    }: {
      stats: Array<{ title?: string; value?: string | number }>;
      columns: number;
    }) =>
      React.createElement(
        'div',
        { 'data-testid': 'stat-card-group', 'data-columns': columns },
        stats.map((stat, index) =>
          React.createElement('span', { key: index }, `${stat.title ?? 'stat'}:${stat.value ?? ''}`)
        )
      ),
  };
});

import ConfirmDialogs from '../ConfirmDialogs';
import VoucherImportModal from '../VoucherImportModal';
import SubjectListPanel from '../SubjectListPanel';

const subjects = [
  {
    id: 'subject-1',
    code: '1002',
    name: '银行存款',
    status: 'active',
    level: 1,
    category: '资产类',
    parent_code: '1000',
    is_cash_flow: true,
    description: '用于核算银行存款',
  },
  {
    id: 'subject-2',
    code: '6602',
    name: '管理费用',
    status: 'inactive',
    level: 2,
    is_cash_flow: false,
  },
];

describe('FinanceVoucher components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ConfirmDialogs', () => {
    it('renders delete dialog and calls handlers', () => {
      const onCloseDelete = vi.fn();
      const onConfirmDelete = vi.fn();
      renderWithProviders(
        <ConfirmDialogs
          deleteDialogOpen
          onCloseDelete={onCloseDelete}
          onConfirmDelete={onConfirmDelete}
          batchDeleteDialogOpen={false}
          onCloseBatchDelete={vi.fn()}
          onConfirmBatchDelete={vi.fn()}
          selectedIds={[]}
        />
      );

      expect(
        screen.getByText('finance.finance_voucher_page_components__confirm_dialogs.confirm_delete')
      ).toBeInTheDocument();
      expect(
        screen.getByText('finance.finance_voucher_page_components__confirm_dialogs.confirm')
      ).toBeInTheDocument();

      fireEvent.click(screen.getByText('关闭'));
      fireEvent.click(screen.getByText('确认'));

      expect(onCloseDelete).toHaveBeenCalledTimes(1);
      expect(onConfirmDelete).toHaveBeenCalledTimes(1);
    });

    it('renders batch delete message with selected count', () => {
      renderWithProviders(
        <ConfirmDialogs
          deleteDialogOpen={false}
          onCloseDelete={vi.fn()}
          onConfirmDelete={vi.fn()}
          batchDeleteDialogOpen
          onCloseBatchDelete={vi.fn()}
          onConfirmBatchDelete={vi.fn()}
          selectedIds={['v1', 'v2', 'v3']}
        />
      );

      expect(
        screen.getByText('finance.finance_voucher_page_components__confirm_dialogs.batch_delete')
      ).toBeInTheDocument();
      expect(screen.getByText('确定要删除选中的 3 张凭证吗？')).toBeInTheDocument();
    });
  });

  describe('VoucherImportModal', () => {
    it('renders nothing when closed', () => {
      renderWithProviders(
        <VoucherImportModal
          open={false}
          onClose={vi.fn()}
          onImport={vi.fn()}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders import instructions and buttons when open', () => {
      renderWithProviders(
        <VoucherImportModal
          open
          onClose={vi.fn()}
          onImport={vi.fn()}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(
        screen.getByText('finance.finance_voucher_page_components__voucher_import_modal.import')
      ).toBeInTheDocument();
      expect(screen.getAllByText('用友凭证数据 (JSON格式)')[0]).toBeInTheDocument();
      expect(
        screen.getByText(
          'finance.finance_voucher_page_components__voucher_import_modal.text_b7a702'
        )
      ).toBeInTheDocument();
    });

    it('notifies when import data is empty', () => {
      renderWithProviders(
        <VoucherImportModal
          open
          onClose={vi.fn()}
          onImport={vi.fn()}
        />
      );

      fireEvent.click(
        screen.getByText('finance.finance_voucher_page_components__voucher_import_modal.import_1')
      );

      expect(addNotification).toHaveBeenCalledWith({
        title: 'finance.finance_voucher_page_components__voucher_import_modal.hint',
        message: 'finance.finance_voucher_page_components__voucher_import_modal.please_input',
        type: 'warning',
      });
    });

    it('imports entered JSON content', () => {
      const onImport = vi.fn(() => Promise.resolve());
      renderWithProviders(
        <VoucherImportModal
          open
          onClose={vi.fn()}
          onImport={onImport}
        />
      );

      fireEvent.change(screen.getByLabelText('importData'), {
        target: { value: '[{"voucher_number":"记-001"}]' },
      });
      fireEvent.click(
        screen.getByText('finance.finance_voucher_page_components__voucher_import_modal.import_1')
      );

      expect(onImport).toHaveBeenCalledWith('[{"voucher_number":"记-001"}]');
    });

    it('fills sample data when sample button is clicked', () => {
      renderWithProviders(
        <VoucherImportModal
          open
          onClose={vi.fn()}
          onImport={vi.fn()}
        />
      );

      const textarea = screen.getByLabelText('importData') as HTMLTextAreaElement;
      fireEvent.click(
        screen.getByText(
          'finance.finance_voucher_page_components__voucher_import_modal.text_b7a702'
        )
      );

      expect(textarea.value).toContain('voucher_number');
      expect(textarea.value).toContain('items');
    });
  });

  describe('SubjectListPanel', () => {
    it('renders stat card group and subjects', () => {
      renderWithProviders(
        <SubjectListPanel
          subjects={subjects as any}
          subjectStatCards={[{ title: '总科目', value: 2 }]}
        />
      );

      expect(screen.getByTestId('stat-card-group')).toHaveAttribute('data-columns', '4');
      expect(screen.getByText('总科目:2')).toBeInTheDocument();
      expect(screen.getByText('1002')).toBeInTheDocument();
      expect(screen.getByText('银行存款')).toBeInTheDocument();
      expect(screen.getByText('6602')).toBeInTheDocument();
      expect(screen.getByText('管理费用')).toBeInTheDocument();
    });

    it('renders status, cash-flow badge, parent and description', () => {
      renderWithProviders(
        <SubjectListPanel
          subjects={subjects as any}
          subjectStatCards={[]}
        />
      );

      expect(screen.getByTestId('status-cash_flow')).toHaveTextContent(
        'finance.finance_voucher_page_components__subject_list_panel.text_16b663'
      );
      expect(screen.getByTestId('status-active')).toHaveTextContent(
        'finance.finance_voucher_page_components__subject_list_panel.active'
      );
      expect(screen.getByTestId('status-inactive')).toHaveTextContent(
        'finance.finance_voucher_page_components__subject_list_panel.text_710ad0'
      );
      expect(screen.getByText('上级科目:')).toBeInTheDocument();
      expect(screen.getByText('1000')).toBeInTheDocument();
      expect(screen.getByText('用于核算银行存款')).toBeInTheDocument();
    });

    it('falls back when category is missing', () => {
      renderWithProviders(
        <SubjectListPanel
          subjects={subjects as any}
          subjectStatCards={[]}
        />
      );

      expect(
        screen.getByText('finance.finance_voucher_page_components__subject_list_panel.text_ecf7eb')
      ).toBeInTheDocument();
    });
  });
});
