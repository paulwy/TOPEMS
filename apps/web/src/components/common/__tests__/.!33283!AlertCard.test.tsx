import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';
import { AlertCard } from '../AlertCard';

vi.mock('@/store', () => ({
  useNotificationStore: vi.fn((selector?: unknown) =>
    selector
      ? selector({ addNotification: vi.fn(), notifications: [] })
      : { addNotification: vi.fn(), notifications: [] }
  ),
  useAuthStore: vi.fn((selector?: unknown) =>
    selector ? selector({ user: null }) : { user: null }
  ),
}));

describe('AlertCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title and message', () => {
    renderWithProviders(
      <AlertCard
        level='info'
