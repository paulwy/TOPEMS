import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StatusBadge } from '../StatusBadge';
import { FSMActionButtons } from '../FSMActionButtons';

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
    render(<FSMActionButtons status='draft' onTransition={() => {}} />);
    expect(screen.getByText('released')).toBeInTheDocument();
    expect(screen.getByText('cancelled')).toBeInTheDocument();
  });

  it('marks approval transitions with (审批) label', () => {
    render(<FSMActionButtons status='in_progress' onTransition={() => {}} />);
    expect(screen.getByText(/cancelled.*审批/)).toBeInTheDocument();
  });

  it('shows no buttons for terminal status', () => {
    render(<FSMActionButtons status='completed' onTransition={() => {}} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders equipment transitions correctly', () => {
    render(<FSMActionButtons status='running' onTransition={() => {}} />);
    expect(screen.getByText('idle')).toBeInTheDocument();
    expect(screen.getByText('down')).toBeInTheDocument();
    expect(screen.getByText(/scrapped.*审批/)).toBeInTheDocument();
  });

  it('calls onTransition when button clicked', () => {
    const onTransition = vi.fn();
    render(<FSMActionButtons status='draft' onTransition={onTransition} />);
    screen.getByText('released').click();
    expect(onTransition).toHaveBeenCalledWith('released');
  });

  it('disables all buttons when disabled prop is true', () => {
    render(
      <FSMActionButtons
        status='draft'
        onTransition={() => {}}
        disabled
      />,
    );
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => expect(btn).toBeDisabled());
  });
});
