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
    // list 变体渲染 5 行，每行含圆形头像和文本骨架
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders form variant with skeleton elements', () => {
    const { container } = renderWithProviders(<SkeletonScreen variant='form' />);
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders detail variant with skeleton elements', () => {
    const { container } = renderWithProviders(<SkeletonScreen variant='detail' />);
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('list variant renders more skeleton rows than form variant', () => {
    const { container: listContainer } = renderWithProviders(<SkeletonScreen variant='list' />);
    const { container: formContainer } = renderWithProviders(<SkeletonScreen variant='form' />);
    const listSkeletons = listContainer.querySelectorAll('.MuiSkeleton-root');
    const formSkeletons = formContainer.querySelectorAll('.MuiSkeleton-root');
    expect(listSkeletons.length).toBeGreaterThan(0);
    expect(formSkeletons.length).toBeGreaterThan(0);
    // 两者数量应不同（不同布局）
    expect(listSkeletons.length).not.toBe(formSkeletons.length);
  });

  it('renders circular skeleton in list variant', () => {
    const { container } = renderWithProviders(<SkeletonScreen variant='list' />);
    // list 变体含 variant=circular 的骨架
    const circular = container.querySelectorAll('.MuiSkeleton-circular');
    expect(circular.length).toBeGreaterThan(0);
  });

  it('renders rectangular skeleton in form variant', () => {
    const { container } = renderWithProviders(<SkeletonScreen variant='form' />);
    // form 变体含 variant=rectangular 的骨架
    const rectangular = container.querySelectorAll('.MuiSkeleton-rectangular');
    expect(rectangular.length).toBeGreaterThan(0);
  });

  it('does not crash when clicked (skeleton has no handlers)', () => {
    const { container } = renderWithProviders(<SkeletonScreen />);
    expect(() => fireEvent.click(container.firstChild as Element)).not.toThrow();
  });
});
