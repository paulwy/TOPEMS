import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { DateRangePicker } from '../DateRangePicker';

describe('DateRangePicker', () => {
  it('renders with placeholder', () => {
    render(
      <DateRangePicker
