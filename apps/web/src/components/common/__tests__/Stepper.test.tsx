import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';
import Stepper, { type StepItem } from '../Stepper';

// Stepper 现为 @topems/shared-components 的真实实现（此前是 stub 空 div），
// 需要 steps/activeStep props。保留集成级断言：渲染不抛错 + 可点击。
const steps: StepItem[] = [
  { label: '创建', status: 'completed' },
  { label: '提交', status: 'active' },
  { label: '审批', status: 'pending' },
];

describe('Stepper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = renderWithProviders(
      <Stepper
        steps={steps}
        activeStep={1}
      />
    );
    expect(container.firstElementChild).not.toBeNull();
  });

  it('renders step labels', () => {
    const { getByText } = renderWithProviders(
      <Stepper
        steps={steps}
        activeStep={1}
      />
    );
    expect(getByText('创建')).toBeInTheDocument();
    expect(getByText('审批')).toBeInTheDocument();
  });

  it('does not crash when clicked', () => {
    const { container } = renderWithProviders(
      <Stepper
        steps={steps}
        activeStep={1}
      />
    );
    const el = container.firstElementChild;
    expect(() => fireEvent.click(el as Element)).not.toThrow();
  });
});
