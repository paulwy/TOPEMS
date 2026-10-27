import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { Avatar } from '../Avatar';

describe('Avatar', () => {
  it('renders with name', () => {
    render(<Avatar name='张三' />);

    expect(screen.getByText('张三')).toBeInTheDocument();
  });

  it('renders with image', () => {
    render(
      <Avatar
