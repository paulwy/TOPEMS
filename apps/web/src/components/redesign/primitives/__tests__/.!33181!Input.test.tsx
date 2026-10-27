import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { Input } from '../Input';

describe('Input', () => {
  it('renders with placeholder', () => {
    render(<Input placeholder='请输入内容' />);

    expect(screen.getByPlaceholderText('请输入内容')).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(
      <Input
