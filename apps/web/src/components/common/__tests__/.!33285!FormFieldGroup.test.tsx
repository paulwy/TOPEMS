import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import FormFieldGroup from '../FormFieldGroup';

vi.mock('@/store', () => ({
  useNotificationStore: vi.fn((selector?: unknown) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
        }
  ),
  useAuthStore: vi.fn((selector?: unknown) =>
    selector
      ? selector({
          user: null,
        })
      : {
          user: null,
        }
  ),
}));

describe('FormFieldGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with legend/title', () => {
    render(
      <FormFieldGroup title='基本信息'>
        <div>child</div>
      </FormFieldGroup>
    );
    expect(screen.getByText('基本信息')).toBeInTheDocument();
    const fieldset = document.querySelector('fieldset');
    expect(fieldset).toBeInTheDocument();
    const legend = document.querySelector('legend');
    expect(legend).toBeInTheDocument();
  });

  it('renders children inside fieldset', () => {
    render(
      <FormFieldGroup title='基本信息'>
        <input data-testid='field1' />
        <input data-testid='field2' />
      </FormFieldGroup>
    );
    expect(screen.getByTestId('field1')).toBeInTheDocument();
    expect(screen.getByTestId('field2')).toBeInTheDocument();
  });

  it('collapses when collapsible and toggled', () => {
    const { getByTestId } = render(
      <FormFieldGroup
