import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';
import { HelpButton } from '../HelpButton';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('HelpButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the help button with default icon', () => {
    renderWithProviders(<HelpButton content='帮助说明' />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
