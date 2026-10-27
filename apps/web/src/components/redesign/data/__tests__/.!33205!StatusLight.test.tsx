import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { StatusLight } from '../StatusLight';

describe('StatusLight', () => {
  it('renders with state', () => {
    render(<StatusLight state='running' />);

