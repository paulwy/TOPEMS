import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { Select } from '../Select';

const options = [
  { value: 'active', label: '活跃' },
  { value: 'inactive', label: '不活跃' },
];

describe('Select', () => {
  it('renders with label', () => {
    render(
      <Select
