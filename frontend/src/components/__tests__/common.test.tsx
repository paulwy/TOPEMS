import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';

describe('LoadingSpinner', () => {
  it('renders with default size', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
  });

  it('renders with small size', () => {
    render(<LoadingSpinner size="sm" />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
  });

  it('renders with large size', () => {
    render(<LoadingSpinner size="lg" />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  it('renders with title', () => {
    render(<EmptyState title="No files found" />);
    expect(screen.getByText('No files found')).toBeInTheDocument();
  });

  it('renders with description', () => {
    render(
      <EmptyState 
        title="No files found" 
        description="Upload your first file to get started" 
      />
    );
    expect(screen.getByText('Upload your first file to get started')).toBeInTheDocument();
  });

  it('renders with action button', () => {
    const handleClick = jest.fn();
    render(
      <EmptyState 
        title="No files found"
        action={{ label: 'Upload File', onClick: handleClick }}
      />
    );
    const button = screen.getByText('Upload File');
    expect(button).toBeInTheDocument();
    button.click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders with different icons', () => {
    render(<EmptyState title="Test" icon="file" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
    
    render(<EmptyState title="Test" icon="folder" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
    
    render(<EmptyState title="Test" icon="search" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
    
    render(<EmptyState title="Test" icon="inbox" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
