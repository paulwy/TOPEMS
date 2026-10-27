import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { PageHeader } from '../PageHeader';

describe('PageHeader', () => {
  it('renders with title', () => {
    render(<PageHeader title='客户管理' />);

    expect(screen.getByText('客户管理')).toBeInTheDocument();
  });

  it('renders with subtitle', () => {
    render(
      <PageHeader
