import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { Card } from '../../primitives/Card';

describe('Card', () => {
  it('renders with children', () => {
    render(<Card>卡片内容</Card>);

    expect(screen.getByText('卡片内容')).toBeInTheDocument();
  });

  it('renders with title', () => {
    render(<Card title='卡片标题'>卡片内容</Card>);

    expect(screen.getByText('卡片标题')).toBeInTheDocument();
  });

  it('renders with action', () => {
    render(
      <Card
        title='卡片标题'
        action={<button>操作</button>}
      >
        卡片内容
      </Card>
    );

    expect(screen.getByText('操作')).toBeInTheDocument();
  });
});
