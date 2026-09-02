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
        alt='示例图片'
      />
    );
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('alt', '示例图片');
  });

  it('renders the placeholder when image is not loaded yet', () => {
    const { container } = renderWithProviders(
      <LazyImage
        src='https://example.com/img.png'
        alt='示例图片'
      />
    );
    // The default placeholder is an svg; component renders a wrapper div containing placeholder + img
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    // The img should not have loaded the real src yet (IntersectionObserver mocked to no-op)
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img!.getAttribute('src')).not.toBe('https://example.com/img.png');
  });

  it('renders a custom placeholder when provided', () => {
    const { container } = renderWithProviders(
      <LazyImage
        src='https://example.com/img.png'
        alt='示例图片'
        placeholder={<div data-testid='custom-placeholder'>加载中</div>}
      />
    );
    // Custom placeholder present
    expect(container.querySelector('[data-testid="custom-placeholder"]')).not.toBeNull();
  });

  it('renders fallback image when image fails to load and fallback is provided', () => {
    const { container } = renderWithProviders(
      <LazyImage
        src='https://example.com/missing.png'
        alt='失败图片'
        fallback='https://example.com/fallback.png'
      />
    );
    // Initially img has empty src (not loaded); trigger error to switch to fallback
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    fireEvent.error(img!);

    // After error, component should render fallback img
    const fallbackImg = container.querySelector('img');
    expect(fallbackImg).toHaveAttribute('src', 'https://example.com/fallback.png');
    expect(fallbackImg).toHaveAttribute('alt', '失败图片');
  });

  it('calls onError callback when image fails to load', () => {
    const onError = vi.fn();
    const { container } = renderWithProviders(
      <LazyImage
        src='https://example.com/missing.png'
        alt='失败图片'
        onError={onError}
      />
    );
    const img = container.querySelector('img');
    fireEvent.error(img!);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('calls onLoad callback when image load event fires', () => {
    const onLoad = vi.fn();
    const { container } = renderWithProviders(
      <LazyImage
        src='https://example.com/img.png'
        alt='示例图片'
        onLoad={onLoad}
      />
    );
    const img = container.querySelector('img');
    fireEvent.load(img!);
    expect(onLoad).toHaveBeenCalledTimes(1);
  });

  it('applies className and style to the wrapper', () => {
    const { container } = renderWithProviders(
      <LazyImage
        src='https://example.com/img.png'
        alt='示例图片'
        className='lazy-img'
        style={{ width: 100 }}
      />
    );
    const wrapper = container.querySelector('.lazy-img');
    expect(wrapper).not.toBeNull();
    expect((wrapper as HTMLElement).style.width).toBe('100px');
  });

  it('does not crash with minimal props', () => {
    const { container } = renderWithProviders(
      <LazyImage
        src='x'
        alt='x'
      />
    );
    expect(container.querySelector('img')).not.toBeNull();
  });
});
