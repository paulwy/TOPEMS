import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import { PageHeader } from '../PageHeader';
import { renderWithProviders } from '@/__tests__/test-utils';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@topems/shared-components', () => ({
  BackButton: ({ onClick, href, ...rest }: unknown) => (
    <button
      data-testid='back-button'
      onClick={onClick}
      data-href={href}
      {...rest}
    />
  ),
}));

describe('PageHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when no title or actions are provided', () => {
    const { container } = renderWithProviders(<PageHeader />);
    expect(container.firstChild).toBeNull();
  });

  it('renders title when provided', () => {
    renderWithProviders(<PageHeader title='用户管理' />);
    expect(screen.getByText('用户管理')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    renderWithProviders(
      <PageHeader
