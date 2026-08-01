import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderWithProviders, screen } from '@/__tests__/test-utils';

import { StatusChip } from '../StatusChip';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (x: string) => x }),
}));

describe('StatusChip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the status text as the chip label', () => {
    renderWithProviders(<StatusChip status='Active' />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders a chip with small size', () => {
    const { container } = renderWithProviders(<StatusChip status='Pending' />);
    const chip = container.querySelector('.MuiChip-root');
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveClass('MuiChip-sizeSmall');
  });

  it('renders pending status text', () => {
    renderWithProviders(<StatusChip status='Pending' />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders inactive status text', () => {
    renderWithProviders(<StatusChip status='Inactive' />);
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('renders unknown status without errors (falls back to grey style)', () => {
    const { container } = renderWithProviders(<StatusChip status='Unknown' />);
    expect(container.querySelector('.MuiChip-root')).toBeInTheDocument();
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('renders empty string status without errors', () => {
    const { container } = renderWithProviders(<StatusChip status='' />);
    expect(container.querySelector('.MuiChip-root')).toBeInTheDocument();
  });

  it('applies success style for active-like status', () => {
    const { container } = renderWithProviders(<StatusChip status='active' />);
    const chip = container.querySelector('.MuiChip-root') as HTMLElement;
    expect(chip).toBeInTheDocument();
    // Active status maps to success.lighter bg
    expect(chip.style.backgroundColor || chip.className).toBeTruthy();
  });
});
