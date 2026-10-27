import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import { ListEmptyState } from '../EmptyState';
import { renderWithProviders } from '@/__tests__/test-utils';

vi.mock('@topems/shared-components', () => ({
  EmptyState: ({ title, description, action, icon }: unknown) => (
    <div data-testid='empty-state'>
      {icon}
      <span>{title}</span>
      <span>{description}</span>
      {action && <button onClick={action.onClick}>{action.label}</button>}
    </div>
  ),
  ErrorEmptyState: ({ error, onRetry }: unknown) => (
    <div data-testid='error-empty-state'>
      <span>{error}</span>
      {onRetry && <button onClick={onRetry}>重试</button>}
    </div>
  ),
}));

describe('ListEmptyState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeletons when loading is true', () => {
    const { container } = renderWithProviders(
      <table>
        <tbody>
          <ListEmptyState
            colSpan={3}
            loading
