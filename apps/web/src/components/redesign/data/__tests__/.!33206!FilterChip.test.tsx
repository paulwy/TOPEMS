import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { FilterChip } from '../FilterChip';

describe('FilterChip', () => {
  it('renders with label', () => {
    render(<FilterChip label='状态: 活跃' />);

    expect(screen.getByText('状态: 活跃')).toBeInTheDocument();
  });

  it('renders with active state', () => {
    render(
      <FilterChip
