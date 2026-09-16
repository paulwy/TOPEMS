import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { Tag } from '../Tag';

describe('Tag', () => {
  it('renders with children', () => {
    render(<Tag>标签内容</Tag>);

    expect(screen.getByText('标签内容')).toBeInTheDocument();
  });

  it('renders with variant', () => {
    render(<Tag variant='success'>成功标签</Tag>);

    expect(screen.getByText('成功标签')).toBeInTheDocument();
  });

  it('renders with onRemove', () => {
    render(<Tag onRemove={() => {}}>可移除标签</Tag>);

    expect(screen.getByText('可移除标签')).toBeInTheDocument();
  });
});
