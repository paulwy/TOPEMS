import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Plus } from 'lucide-react';

import { Button } from '../Button';

describe('Button', () => {
  it('renders with children', () => {
    render(<Button>点击按钮</Button>);

    expect(screen.getByText('点击按钮')).toBeInTheDocument();
  });

  it('renders with variant', () => {
    render(<Button variant='primary'>主要按钮</Button>);

    expect(screen.getByText('主要按钮')).toBeInTheDocument();
  });

  it('renders with size', () => {
    render(<Button size='sm'>小按钮</Button>);

    expect(screen.getByText('小按钮')).toBeInTheDocument();
  });

  it('renders with left icon', () => {
    render(<Button leftIcon={<Plus size={16} />}>添加</Button>);

    expect(screen.getByText('添加')).toBeInTheDocument();
  });

  it('renders with loading state', () => {
    render(<Button loading={true}>加载中</Button>);

    // 加载状态应该禁用按钮
    const button = screen.getByText('加载中').closest('button');
    expect(button).toBeDisabled();
  });
});
