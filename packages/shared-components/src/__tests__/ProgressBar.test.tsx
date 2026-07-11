import React from 'react';
import { render, screen } from '@testing-library/react';
import ProgressBar from '../components/ProgressBar';

describe('ProgressBar Component', () => {
  it('renders linear progress bar with default props', () => {
    render(<ProgressBar value={50} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(<ProgressBar value={50} label="完成进度" />);
    expect(screen.getByText('完成进度')).toBeInTheDocument();
  });

  it('renders with value display', () => {
    render(<ProgressBar value={75} showValue />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('renders with both label and value', () => {
    render(<ProgressBar value={50} label="完成进度" showValue />);
    expect(screen.getByText('完成进度')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('renders with custom max value', () => {
    render(<ProgressBar value={25} max={50} showValue />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('clamps value between 0 and 100', () => {
    render(<ProgressBar value={150} showValue />);
    expect(screen.getByText('100%')).toBeInTheDocument();

    render(<ProgressBar value={-10} showValue />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('renders circular variant', () => {
    render(<ProgressBar value={50} variant="circular" />);
    const svg = screen.queryByRole('img');
    expect(svg).toBeInTheDocument();
  });

  it('renders circular variant with value display', () => {
    render(<ProgressBar value={60} variant="circular" showValue />);
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('renders segmented variant', () => {
    render(<ProgressBar value={50} variant="segmented" />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders with different colors', () => {
    render(<ProgressBar value={50} color="success" />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    render(<ProgressBar value={50} color="warning" />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    render(<ProgressBar value={50} color="error" />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    render(<ProgressBar value={50} color="gradient" />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders with different sizes', () => {
    render(<ProgressBar value={50} size="small" />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    render(<ProgressBar value={50} size="medium" />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    render(<ProgressBar value={50} size="large" />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders with animation', () => {
    const { container } = render(<ProgressBar value={50} animated />);
    const progressBar = container.querySelector('.MuiLinearProgress-bar');
    expect(progressBar).toHaveStyle({ animation: 'flowAnimation 3s linear infinite' });
  });

  it('renders with stripes', () => {
    const { container } = render(<ProgressBar value={50} striped />);
    const progressBar = container.querySelector('.MuiLinearProgress-bar');
    expect(progressBar).toHaveStyle({ backgroundSize: '1rem 1rem' });
  });

  it('renders segmented with custom segments', () => {
    render(<ProgressBar value={30} variant="segmented" segments={5} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});