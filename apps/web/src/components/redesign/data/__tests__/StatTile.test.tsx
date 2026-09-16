import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Building2 } from 'lucide-react';

import { StatTile } from '../StatTile';

describe('StatTile', () => {
  it('renders with label and value', () => {
    render(
      <StatTile
        label='总客户数'
        value={1234}
      />
    );

    expect(screen.getByText('总客户数')).toBeInTheDocument();
    expect(screen.getByText('1234')).toBeInTheDocument();
  });

  it('renders with icon', () => {
    render(
      <StatTile
        label='总客户数'
        value={1234}
        icon={Building2}
      />
    );

    // 图标应该渲染
    const iconElement = document.querySelector('.lucide-building-2');
    expect(iconElement).toBeInTheDocument();
  });

  it('renders with trend', () => {
    render(
      <StatTile
        label='总客户数'
        value={1234}
        trend='up'
        trendValue='+12.5%'
      />
    );

    expect(screen.getByText('+12.5%')).toBeInTheDocument();
  });
});
