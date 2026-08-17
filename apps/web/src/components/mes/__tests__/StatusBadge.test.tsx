import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { StatusBadge } from '../StatusBadge';
import { FSMActionButtons } from '../FSMActionButtons';

vi.mock('@/i18n', () => {
  const i18nMap: Record<string, string> = {
    'components.mes.status_badge.draft': 'draft',
    'components.mes.status_badge.completed': 'completed',
    'components.mes.status_badge.submitted': 'submitted',
    'components.mes.status_badge.reworking': 'reworking',
    'components.mes.status_badge.inspecting': 'inspecting',
    'components.mes.status_badge.concession_received': 'concession received',
    'components.mes.status_badge.frozen': 'frozen',
    'components.mes.status_badge.investigating': 'investigating',
    'components.mes.status_badge.running': 'running',
    'components.mes.status_badge.maintenance': 'maintenance',
    'components.mes.status_badge.triggered': 'triggered',
    'components.mes.status_badge.false_alarm_verified': 'false alarm verified',
    'components.mes.fsm_action_buttons.released': 'released',
    'components.mes.fsm_action_buttons.cancelled': 'cancelled',
    'components.mes.fsm_action_buttons.idle': 'idle',
    'components.mes.fsm_action_buttons.down': 'down',
    'components.mes.fsm_action_buttons.scrapped': 'scrapped',
    'components.mes.fsm_action_buttons.approval_suffix': ' (审批)',
  };
  return {
    default: {
      t: (key: string) =>
        i18nMap[key] ??
        key
          .replace(/^components\.(mes|wms|tms|qms|aps)\.(status_badge|fsm_action_buttons)\./, '')
          .replace(/_/g, ' '),
      language: 'zh',
      on: () => {},
      use: () => ({ init: () => {} }),
      init: () => {},
    },
  };
});

vi.mock('react-i18next', () => {
  const merge = (...objs: Record<string, string>[]) => Object.assign({}, ...objs);
  const i18nMap = merge(
    require('../../../i18n/locales/zh/mes.json'),
    require('../../../i18n/locales/zh/common.json'),
    require('../../../i18n/locales/zh/components.json'),
    require('../../../i18n/locales/zh/pages.json'),
    require('../../../i18n/locales/zh/templates.json')
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
    require('../../../i18n/locales/zh/mes.json'),
    require('../../../i18n/locales/zh/common.json'),
    require('../../../i18n/locales/zh/components.json'),
    require('../../../i18n/locales/zh/pages.json'),
    require('../../../i18n/locales/zh/templates.json')
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

describe('StatusBadge', () => {
  it('renders production_order statuses with correct colors', () => {
    const { rerender } = render(<StatusBadge status='draft' />);
    expect(screen.getByText('draft')).toBeInTheDocument();
    rerender(<StatusBadge status='completed' />);
    expect(screen.getByText('completed')).toBeInTheDocument();
  });

  it('renders unknown status with default color', () => {
    render(<StatusBadge status='unknown_xyz' />);
    expect(screen.getByText('unknown xyz')).toBeInTheDocument();
  });

  it('renders work report statuses', () => {
    const { rerender } = render(<StatusBadge status='submitted' />);
    expect(screen.getByText('submitted')).toBeInTheDocument();
    rerender(<StatusBadge status='reworking' />);
    expect(screen.getByText('reworking')).toBeInTheDocument();
  });

  it('renders quality inspection statuses', () => {
    const { rerender } = render(<StatusBadge status='inspecting' />);
    expect(screen.getByText('inspecting')).toBeInTheDocument();
    rerender(<StatusBadge status='concession_received' />);
    expect(screen.getByText('concession received')).toBeInTheDocument();
  });

  it('renders traceability statuses', () => {
    const { rerender } = render(<StatusBadge status='frozen' />);
    expect(screen.getByText('frozen')).toBeInTheDocument();
    rerender(<StatusBadge status='investigating' />);
    expect(screen.getByText('investigating')).toBeInTheDocument();
  });

  it('renders equipment statuses', () => {
    const { rerender } = render(<StatusBadge status='running' />);
    expect(screen.getByText('running')).toBeInTheDocument();
    rerender(<StatusBadge status='maintenance' />);
    expect(screen.getByText('maintenance')).toBeInTheDocument();
  });

  it('renders anomaly statuses', () => {
    const { rerender } = render(<StatusBadge status='triggered' />);
    expect(screen.getByText('triggered')).toBeInTheDocument();
    rerender(<StatusBadge status='false_alarm_verified' />);
    expect(screen.getByText('false alarm verified')).toBeInTheDocument();
  });
});

describe('FSMActionButtons', () => {
  it('shows correct transitions for draft status', () => {
    render(
      <FSMActionButtons
        status='draft'
        onTransition={() => {}}
      />
    );
    expect(screen.getByText('released')).toBeInTheDocument();
    expect(screen.getByText('cancelled')).toBeInTheDocument();
  });

  it('marks approval transitions with (审批) label', () => {
    render(
      <FSMActionButtons
        status='in_progress'
        onTransition={() => {}}
      />
    );
    expect(screen.getByText(/cancelled.*审批/)).toBeInTheDocument();
  });

  it('shows no buttons for terminal status', () => {
    render(
      <FSMActionButtons
        status='completed'
        onTransition={() => {}}
      />
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders equipment transitions correctly', () => {
    render(
      <FSMActionButtons
        status='running'
        onTransition={() => {}}
      />
    );
    expect(screen.getByText('idle')).toBeInTheDocument();
    expect(screen.getByText('down')).toBeInTheDocument();
    expect(screen.getByText(/scrapped.*审批/)).toBeInTheDocument();
  });

  it('calls onTransition when button clicked', () => {
    const onTransition = vi.fn();
    render(
      <FSMActionButtons
        status='draft'
        onTransition={onTransition}
      />
    );
    screen.getByText('released').click();
    expect(onTransition).toHaveBeenCalledWith('released');
  });

  it('disables all buttons when disabled prop is true', () => {
    render(
      <FSMActionButtons
        status='draft'
        onTransition={() => {}}
        disabled
      />
    );
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => expect(btn).toBeDisabled());
  });
});
