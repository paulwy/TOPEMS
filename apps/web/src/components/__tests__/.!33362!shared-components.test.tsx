import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge, DEFAULT_STATUS_MAP } from '@topems/shared-components';

describe('StatusBadge', () => {
  it('should render with default status', () => {
    render(<StatusBadge status='active' />);
    expect(screen.getByText('启用')).toBeInTheDocument();
  });

  it('should render with custom label', () => {
    render(
      <StatusBadge
        status='active'
