import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ProgressBar from '../common/ProgressBar';

describe('ProgressBar', () => {
  it('应该渲染线性进度条', () => {
    const { container } = render(
      <ProgressBar
        value={50}
        variant='linear'
      />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('应该渲染圆形进度条', () => {
    const { container } = render(
      <ProgressBar
        value={75}
        variant='circular'
      />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('应该渲染分段进度条', () => {
    const { container } = render(
      <ProgressBar
        value={60}
        variant='segmented'
      />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('应该接受不同属性', () => {
    const { container } = render(
      <ProgressBar
        value={50}
        label='测试'
        color='success'
        size='large'
      />
    );
    expect(container.firstChild).toBeTruthy();
  });
});
