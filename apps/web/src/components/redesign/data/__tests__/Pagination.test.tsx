import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { Pagination } from '../Pagination';

describe('Pagination', () => {
  it('renders with current page and total pages', () => {
    render(
      <Pagination
        current={1}
        total={10}
        onChange={() => {}}
      />
    );

    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders with total items', () => {
    render(
      <Pagination
        current={1}
        total={10}
        totalItems={100}
        showTotal={true}
        onChange={() => {}}
      />
    );

    expect(screen.getByText(/共/)).toBeInTheDocument();
    expect(screen.getByText(/100/)).toBeInTheDocument();
  });

  it('renders with page size changer', () => {
    render(
      <Pagination
        current={1}
        total={10}
        pageSize={10}
        showSizeChanger={true}
        onPageSizeChange={() => {}}
        onChange={() => {}}
      />
    );

    // 每页条数选择器应该显示
    const selectElement = document.querySelector('select');
    expect(selectElement).toBeInTheDocument();
  });
});
