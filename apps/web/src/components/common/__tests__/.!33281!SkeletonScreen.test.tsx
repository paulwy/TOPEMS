import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';
import { SkeletonScreen } from '../SkeletonScreen';

describe('SkeletonScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard variant by default without crashing', () => {
    const { container } = renderWithProviders(<SkeletonScreen />);
    expect(container.firstChild).not.toBeNull();
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders list variant with skeleton elements', () => {
    const { container } = renderWithProviders(<SkeletonScreen variant='list' />);
