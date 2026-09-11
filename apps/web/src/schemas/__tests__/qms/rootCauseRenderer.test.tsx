import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

import rootCauseRenderer from '../../qms/rootCauseRenderer';

describe('rootCauseRenderer', () => {
  it('should render a div with expected text', () => {
    const { container } = render(rootCauseRenderer({}));
    const div = container.querySelector('div');
    expect(div).toBeInTheDocument();
    expect(div?.textContent).toBe('rootCauseRenderer');
  });

  it('should be a valid React component type', () => {
    expect(typeof rootCauseRenderer).toBe('function');
  });
});
