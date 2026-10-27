import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import { FormSelect } from '../FormSelect';
import { renderWithProviders } from '@/__tests__/test-utils';

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

const sampleOptions = [
  { value: 'dev', label: '研发部' },
  { value: 'hr', label: '人力资源部' },
  { value: 'finance', label: '财务部' },
];

describe('FormSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders label', () => {
    renderWithProviders(
      <FormSelect
        name='department'
