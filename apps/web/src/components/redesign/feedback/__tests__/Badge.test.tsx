import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { Badge } from '../../primitives/Badge';

describe('Badge', () => {
  it('renders with children', () => {
    render(<Badge>默认标签</Badge>);

    expect(screen.getByText('默认标签')).toBeInTheDocument();
  });

  it('renders with variant', () => {
    render(<Badge variant='success'>成功</Badge>);

    expect(screen.getByText('成功')).toBeInTheDocument();
  });

  it('renders with dot', () => {
    render(
      <Badge
        variant='info'
        dot
      >
        信息
      </Badge>
    );

    expect(screen.getByText('信息')).toBeInTheDocument();
  });
});
