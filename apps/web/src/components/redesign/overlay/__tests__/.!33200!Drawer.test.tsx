import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { Drawer } from '../Drawer';

describe('Drawer', () => {
  it('renders with title and children', () => {
    render(
      <Drawer
        open={true}
