import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConfirmDialog, { AlertDialog, InfoDialog, SuccessDialog, WarningDialog, ErrorDialog, ConfirmationDialog } from '../components/ConfirmDialog';

describe('ConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    title: '确认操作',
    message: '确定要执行此操作吗？',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when open', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText('确认操作')).toBeInTheDocument();
    expect(screen.getByText('确定要执行此操作吗？')).toBeInTheDocument();
    expect(screen.getByText('确认')).toBeInTheDocument();
    expect(screen.getByText('取消')).toBeInTheDocument();
  });

  it('calls onClose when clicking cancel', () => {
    render(<ConfirmDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('取消'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onConfirm when clicking confirm', async () => {
    const onConfirm = jest.fn();
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText('确认'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('shows loading state during async onConfirm', async () => {
    const onConfirm = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText('确认'));
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  it('shows error message when onConfirm throws', async () => {
    const onConfirm = jest.fn().mockRejectedValue(new Error('操作失败'));
    const onError = jest.fn();
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} onError={onError} />);
    fireEvent.click(screen.getByText('确认'));
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
      expect(screen.getByText('操作失败')).toBeInTheDocument();
    });
  });

  it('calls onSuccess when onConfirm succeeds', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    const onSuccess = jest.fn();
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} onSuccess={onSuccess} />);
    fireEvent.click(screen.getByText('确认'));
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('applies danger mode styling', () => {
    render(<ConfirmDialog {...defaultProps} danger />);
    const confirmButton = screen.getByText('确认');
    expect(confirmButton).toHaveStyle({ backgroundColor: expect.stringContaining('error') });
  });

  it('hides cancel button for alert type', () => {
    render(<ConfirmDialog {...defaultProps} type="alert" />);
    expect(screen.queryByText('取消')).not.toBeInTheDocument();
  });

  it('hides cancel button for success type', () => {
    render(<ConfirmDialog {...defaultProps} type="success" />);
    expect(screen.queryByText('取消')).not.toBeInTheDocument();
  });

  it('shows custom close button when showCloseButton is true', () => {
    render(<ConfirmDialog {...defaultProps} showCloseButton />);
    expect(screen.getByLabelText('关闭')).toBeInTheDocument();
  });

  it('calls onClose when clicking close button', () => {
    render(<ConfirmDialog {...defaultProps} showCloseButton />);
    fireEvent.click(screen.getByLabelText('关闭'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('disables confirm button when confirmDisabled is true', () => {
    render(<ConfirmDialog {...defaultProps} confirmDisabled />);
    expect(screen.getByText('确认')).toBeDisabled();
  });

  it('renders custom buttons', () => {
    const customOnClick = jest.fn();
    render(<ConfirmDialog
      {...defaultProps}
      buttons={[{ label: '自定义按钮', onClick: customOnClick, primary: true }]}
    />);
    expect(screen.getByText('自定义按钮')).toBeInTheDocument();
    expect(screen.queryByText('确认')).not.toBeInTheDocument();
    expect(screen.queryByText('取消')).not.toBeInTheDocument();
  });

  it('calls custom button onClick', () => {
    const customOnClick = jest.fn();
    render(<ConfirmDialog
      {...defaultProps}
      buttons={[{ label: '自定义按钮', onClick: customOnClick, primary: true }]}
    />);
    fireEvent.click(screen.getByText('自定义按钮'));
    expect(customOnClick).toHaveBeenCalled();
  });

  it('renders custom icon', () => {
    render(<ConfirmDialog {...defaultProps} icon={<span data-testid="custom-icon">Icon</span>} />);
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('hides title when showTitle is false', () => {
    render(<ConfirmDialog {...defaultProps} showTitle={false} />);
    expect(screen.queryByText('确认操作')).not.toBeInTheDocument();
  });

  it('hides message when showMessage is false', () => {
    render(<ConfirmDialog {...defaultProps} showMessage={false} />);
    expect(screen.queryByText('确定要执行此操作吗？')).not.toBeInTheDocument();
  });

  it('renders children content', () => {
    render(<ConfirmDialog {...defaultProps}>
      <div data-testid="custom-content">自定义内容</div>
    </ConfirmDialog>);
    expect(screen.getByTestId('custom-content')).toBeInTheDocument();
  });

  describe('Convenience exports', () => {
    it('AlertDialog renders with alert type', () => {
      render(<AlertDialog {...defaultProps} />);
      expect(screen.getByText('确认操作')).toBeInTheDocument();
    });

    it('InfoDialog renders with info type', () => {
      render(<InfoDialog {...defaultProps} />);
      expect(screen.getByText('确认操作')).toBeInTheDocument();
    });

    it('SuccessDialog renders with success type and icon', () => {
      render(<SuccessDialog {...defaultProps} />);
      expect(screen.getByText('确认操作')).toBeInTheDocument();
    });

    it('WarningDialog renders with warning type', () => {
      render(<WarningDialog {...defaultProps} />);
      expect(screen.getByText('确认操作')).toBeInTheDocument();
    });

    it('ErrorDialog renders with error type', () => {
      render(<ErrorDialog {...defaultProps} />);
      expect(screen.getByText('确认操作')).toBeInTheDocument();
    });

    it('ConfirmationDialog renders with confirm type', () => {
      render(<ConfirmationDialog {...defaultProps} />);
      expect(screen.getByText('确认操作')).toBeInTheDocument();
    });
  });
});
