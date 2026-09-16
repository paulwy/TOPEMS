import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';

import { Tooltip } from '../Tooltip';

describe('Tooltip', () => {
  it('renders children', () => {
    render(
      <Tooltip content='这是提示信息'>
        <button>悬停我</button>
      </Tooltip>
    );

    expect(screen.getByText('悬停我')).toBeInTheDocument();
  });

  it.skip('shows tooltip on hover', async () => {
    const user = userEvent.setup();

    render(
      <Tooltip
        content='这是提示信息'
        delay={0}
      >
        <button>悬停我</button>
      </Tooltip>
    );

    // 悬停在按钮上
    await user.hover(screen.getByText('悬停我'));

    // 提示信息应该显示在 document.body 上
    expect(document.body.textContent).toContain('这是提示信息');
  });

  it('renders with placement', () => {
    render(
      <Tooltip
        content='这是提示信息'
        placement='bottom'
      >
        <button>悬停我</button>
      </Tooltip>
    );

    expect(screen.getByText('悬停我')).toBeInTheDocument();
  });
});
