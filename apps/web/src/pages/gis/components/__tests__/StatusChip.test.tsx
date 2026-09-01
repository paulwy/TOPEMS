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
});
