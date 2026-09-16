import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';

import { Toggle } from '../Toggle';

describe('Toggle', () => {
  it('renders with checked state', () => {
    render(
      <Toggle
        checked={true}
        onChange={() => {}}
      />
    );

    const button = screen.getByRole('switch');
    expect(button).toHaveAttribute('aria-checked', 'true');
  });

  it('renders with unchecked state', () => {
    render(
      <Toggle
        checked={false}
        onChange={() => {}}
      />
    );

    const button = screen.getByRole('switch');
    expect(button).toHaveAttribute('aria-checked', 'false');
  });

  it('renders with label', () => {
    render(
      <Toggle
        checked={true}
        onChange={() => {}}
        label='启用通知'
      />
    );

    expect(screen.getByText('启用通知')).toBeInTheDocument();
  });

  it('calls onChange when clicked', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <Toggle
        checked={false}
        onChange={handleChange}
      />
    );

    await user.click(screen.getByRole('switch'));

    expect(handleChange).toHaveBeenCalledWith(true);
  });
});
