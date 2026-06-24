import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { LoadingSpinner } from '../LoadingSpinner';
import { EmptyState } from '../mui/EmptyState';

// 增加测试超时时间
vi.setConfig({ testTimeout: 30000 });

describe('LoadingSpinner', () => {
  it('renders with default size', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
  });

  it('renders with small size', () => {
    render(<LoadingSpinner size='sm' />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
  });

  it('renders with large size', () => {
    render(<LoadingSpinner size='lg' />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  it('renders with title', () => {
    render(<EmptyState title='No files found' />);
    expect(screen.getByText('No files found')).toBeInTheDocument();
  });

  it('renders with description', () => {
    render(
      <EmptyState
        title='No files found'
        description='Upload your first file to get started'
      />
    );
    expect(screen.getByText('Upload your first file to get started')).toBeInTheDocument();
  });

  it('renders with action button', () => {
    const handleClick = vi.fn();
    render(
      <EmptyState
        title='No files found'
        action={{ label: 'Upload File', onClick: handleClick }}
      />
    );
    const button = screen.getByText('Upload File');
    expect(button).toBeInTheDocument();
    button.click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders with different icons', () => {
    const { unmount } = render(
      <EmptyState
        title='File Test'
        icon='file'
      />
    );
    expect(screen.getByText('File Test')).toBeInTheDocument();
    unmount();

    render(
      <EmptyState
        title='Folder Test'
        icon='folder'
      />
    );
    expect(screen.getByText('Folder Test')).toBeInTheDocument();
    unmount();

    render(
      <EmptyState
        title='Search Test'
        icon='search'
      />
    );
    expect(screen.getByText('Search Test')).toBeInTheDocument();
    unmount();

    render(
      <EmptyState
        title='Inbox Test'
        icon='inbox'
      />
    );
    expect(screen.getByText('Inbox Test')).toBeInTheDocument();
  });
});
