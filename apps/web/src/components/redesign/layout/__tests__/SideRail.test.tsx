import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Home, Settings } from 'lucide-react';

import { SideRail } from '../SideRail';

describe('SideRail', () => {
  it('renders with default items', () => {
    render(<SideRail />);

    expect(screen.getByText('首页')).toBeInTheDocument();
    expect(screen.getByText('制造执行')).toBeInTheDocument();
  });

  it('renders with custom items', () => {
    render(
      <SideRail
        items={[
          { id: 'home', label: '首页', icon: Home },
          { id: 'settings', label: '设置', icon: Settings },
        ]}
      />
    );

    expect(screen.getByText('首页')).toBeInTheDocument();
    expect(screen.getByText('设置')).toBeInTheDocument();
  });

  it('renders with active item', () => {
    render(
      <SideRail
        items={[
          { id: 'home', label: '首页', icon: Home },
          { id: 'settings', label: '设置', icon: Settings },
        ]}
        activeId='home'
      />
    );

    expect(screen.getByText('首页')).toBeInTheDocument();
  });
});
