import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { LoadingOverlay } from '../LoadingOverlay';

describe('LoadingOverlay', () => {
  it('renders when visible', () => {
    render(<LoadingOverlay visible={true} />);

    // 加载覆盖层应该显示
    const overlay = document.querySelector('.redesign-loading-overlay');
    expect(overlay).toBeInTheDocument();
  });

  it('does not render when not visible', () => {
    render(<LoadingOverlay visible={false} />);

    // 加载覆盖层不应该显示
    const overlay = document.querySelector('.redesign-loading-overlay');
    expect(overlay).not.toBeInTheDocument();
  });

  it('renders with label', () => {
    render(
      <LoadingOverlay
        visible={true}
        label='加载中，请稍候...'
      />
    );

    expect(screen.getByText('加载中，请稍候...')).toBeInTheDocument();
  });
});
