import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

import { TrendLine } from '../TrendLine';

describe('TrendLine', () => {
  it('renders with data', () => {
    const { container } = render(<TrendLine data={[1, 2, 3, 4, 5]} />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders with area', () => {
    const { container } = render(
      <TrendLine
        data={[1, 2, 3, 4, 5]}
        area={true}
      />
    );

    const path = container.querySelector('path');
    expect(path).toBeInTheDocument();
  });

  it('does not render with less than 2 data points', () => {
    const { container } = render(<TrendLine data={[1]} />);

    const svg = container.querySelector('svg');
    expect(svg).not.toBeInTheDocument();
  });
});
