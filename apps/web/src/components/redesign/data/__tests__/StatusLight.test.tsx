import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { StatusLight } from '../StatusLight';

describe('StatusLight', () => {
  it('renders with state', () => {
    render(<StatusLight state='running' />);

    // 状态指示灯应该显示
    const light = document.querySelector('.redesign-status-light');
    expect(light).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(
      <StatusLight
        state='running'
        label='运行中'
      />
    );

    expect(screen.getByText('运行中')).toBeInTheDocument();
  });

  it('renders with pulse', () => {
    render(
      <StatusLight
        state='running'
        pulse={true}
        label='运行中'
      />
    );

    expect(screen.getByText('运行中')).toBeInTheDocument();
  });
});
