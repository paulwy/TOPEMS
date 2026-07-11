import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Stepper from '../components/Stepper';

const mockSteps = [
  { label: '步骤一', description: '第一步描述' },
  { label: '步骤二', description: '第二步描述' },
  { label: '步骤三', description: '第三步描述' },
];

describe('Stepper Component', () => {
  it('renders all steps', () => {
    render(<Stepper steps={mockSteps} activeStep={0} />);
    expect(screen.getByText('步骤一')).toBeInTheDocument();
    expect(screen.getByText('步骤二')).toBeInTheDocument();
    expect(screen.getByText('步骤三')).toBeInTheDocument();
  });

  it('renders step descriptions', () => {
    render(<Stepper steps={mockSteps} activeStep={0} />);
    expect(screen.getByText('第一步描述')).toBeInTheDocument();
    expect(screen.getByText('第二步描述')).toBeInTheDocument();
    expect(screen.getByText('第三步描述')).toBeInTheDocument();
  });

  it('hides descriptions when showDescriptions is false', () => {
    render(<Stepper steps={mockSteps} activeStep={0} showDescriptions={false} />);
    expect(screen.queryByText('第一步描述')).not.toBeInTheDocument();
  });

  it('hides labels when showLabels is false', () => {
    render(<Stepper steps={mockSteps} activeStep={0} showLabels={false} />);
    expect(screen.queryByText('步骤一')).not.toBeInTheDocument();
  });

  it('marks steps as completed when activeStep advances', () => {
    render(<Stepper steps={mockSteps} activeStep={2} />);
    const steps = screen.getAllByRole('button');
    expect(steps.length).toBe(3);
  });

  it('handles step click', () => {
    const handleClick = jest.fn();
    render(<Stepper steps={mockSteps} activeStep={0} onStepClick={handleClick} />);
    fireEvent.click(screen.getByText('步骤二'));
    expect(handleClick).toHaveBeenCalledWith(1);
  });

  it('renders vertical orientation', () => {
    render(<Stepper steps={mockSteps} activeStep={0} orientation="vertical" />);
    expect(screen.getByText('步骤一')).toBeInTheDocument();
  });

  it('renders with custom step status', () => {
    const stepsWithStatus = [
      { label: '步骤一', status: 'completed' as const },
      { label: '步骤二', status: 'active' as const },
      { label: '步骤三', status: 'pending' as const },
    ];
    render(<Stepper steps={stepsWithStatus} activeStep={1} />);
    expect(screen.getByText('步骤一')).toBeInTheDocument();
    expect(screen.getByText('步骤二')).toBeInTheDocument();
    expect(screen.getByText('步骤三')).toBeInTheDocument();
  });

  it('renders with error status', () => {
    const stepsWithError = [
      { label: '步骤一', status: 'completed' as const },
      { label: '步骤二', status: 'error' as const },
      { label: '步骤三', status: 'pending' as const },
    ];
    render(<Stepper steps={stepsWithError} activeStep={1} />);
    expect(screen.getByText('步骤二')).toBeInTheDocument();
  });

  it('renders with custom icons', () => {
    const stepsWithIcons = [
      { label: '步骤一', icon: <span data-testid="icon1">1</span> },
      { label: '步骤二', icon: <span data-testid="icon2">2</span> },
      { label: '步骤三', icon: <span data-testid="icon3">3</span> },
    ];
    render(<Stepper steps={stepsWithIcons} activeStep={0} />);
    expect(screen.getByTestId('icon1')).toBeInTheDocument();
    expect(screen.getByTestId('icon2')).toBeInTheDocument();
    expect(screen.getByTestId('icon3')).toBeInTheDocument();
  });

  it('renders with different variants', () => {
    render(<Stepper steps={mockSteps} activeStep={0} variant="default" />);
    expect(screen.getByText('步骤一')).toBeInTheDocument();

    render(<Stepper steps={mockSteps} activeStep={0} variant="outlined" />);
    expect(screen.getByText('步骤一')).toBeInTheDocument();

    render(<Stepper steps={mockSteps} activeStep={0} variant="gradient" />);
    expect(screen.getByText('步骤一')).toBeInTheDocument();
  });
});