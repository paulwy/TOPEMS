import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { ErrorState } from '../ErrorState';

describe('ErrorState', () => {
  it('renders with title and message', () => {
    render(
      <ErrorState
