import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';
import LazyImage from '../LazyImage';

describe('LazyImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders an img element with alt attribute', () => {
    const { container } = renderWithProviders(
      <LazyImage
        src='https://example.com/img.png'
