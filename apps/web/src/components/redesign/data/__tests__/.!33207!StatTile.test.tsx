import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Building2 } from 'lucide-react';

import { StatTile } from '../StatTile';

describe('StatTile', () => {
  it('renders with label and value', () => {
    render(
      <StatTile
