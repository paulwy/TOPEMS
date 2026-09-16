import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { TopBar } from '../TopBar';

describe('TopBar', () => {
  it('renders with title', () => {
    render(<TopBar title='TOPEMS' />);

    expect(screen.getByText('TOPEMS')).toBeInTheDocument();
  });

  it('renders with menu toggle button', () => {
    render(<TopBar onMenuToggle={() => {}} />);

    expect(screen.getByLabelText('Toggle navigation')).toBeInTheDocument();
  });

  it('renders with notifications button', () => {
    render(<TopBar onNotificationsOpen={() => {}} />);

    expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
  });
});
