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
