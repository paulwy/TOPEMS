import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { FormField } from '@topems/shared-components';
import { renderWithProviders } from '@/__tests__/test-utils';

describe('FormField', () => {
  it('should render with name and label', () => {
    renderWithProviders(
      <FormField
        name='username'
