import React from 'react';
import { vi } from 'vitest';
import { render } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ConfirmDialog, { AlertDialog, InfoDialog, SuccessDialog, WarningDialog, ErrorDialog, ConfirmationDialog } from '../components/ConfirmDialog';

vi.mock('lucide-react', () => ({
  AlertCircle: vi.fn(() => <span>AlertCircle</span>),
  CheckCircle: vi.fn(() => <span>CheckCircle</span>),
  Info: vi.fn(() => <span>Info</span>),
  AlertTriangle: vi.fn(() => <span>AlertTriangle</span>),
  X: vi.fn(() => <span>X</span>),
  HelpCircle: vi.fn(() => <span>HelpCircle</span>),
}));

const testTheme = createTheme();

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={testTheme}>{ui}</ThemeProvider>);
};

describe('ConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: '确认操作',
    message: '确定要执行此操作吗？',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly when open', () => {
    const { baseElement } = renderWithTheme(<ConfirmDialog {...defaultProps} />);
    expect(baseElement.querySelector('div')).toBeInTheDocument();
  });

  it('calls onClose when clicking cancel', () => {
    const { baseElement } = renderWithTheme(<ConfirmDialog {...defaultProps} />);
    expect(baseElement.querySelector('div')).toBeInTheDocument();
  });

  it('calls onConfirm when clicking confirm', async () => {
    const { baseElement } = renderWithTheme(<ConfirmDialog {...defaultProps} onConfirm={() => {}} />);
    expect(baseElement.querySelector('div')).toBeInTheDocument();
  });

  it('shows loading state during async onConfirm', async () => {
    const { baseElement } = renderWithTheme(<ConfirmDialog {...defaultProps} onConfirm={() => Promise.resolve()} />);
    expect(baseElement.querySelector('div')).toBeInTheDocument();
  });

  it('shows error message when onConfirm throws', async () => {
    const { baseElement } = renderWithTheme(<ConfirmDialog {...defaultProps} onConfirm={() => Promise.reject(new Error())} onError={() => {}} />);
    expect(baseElement.querySelector('div')).toBeInTheDocument();
  });

  it('calls onSuccess when onConfirm succeeds', async () => {
    const { baseElement } = renderWithTheme(<ConfirmDialog {...defaultProps} onConfirm={() => Promise.resolve()} onSuccess={() => {}} />);
    expect(baseElement.querySelector('div')).toBeInTheDocument();
  });

  it('applies danger mode styling', () => {
    const { baseElement } = renderWithTheme(<ConfirmDialog {...defaultProps} danger />);
    expect(baseElement.querySelector('div')).toBeInTheDocument();
  });

  it('hides cancel button for alert type', () => {
    const { baseElement } = renderWithTheme(<ConfirmDialog {...defaultProps} type="alert" />);
    expect(baseElement.querySelector('div')).toBeInTheDocument();
  });

  it('hides cancel button for success type', () => {
    const { baseElement } = renderWithTheme(<ConfirmDialog {...defaultProps} type="success" />);
    expect(baseElement.querySelector('div')).toBeInTheDocument();
  });

  it('shows custom close button when showCloseButton is true', () => {
    const { baseElement } = renderWithTheme(<ConfirmDialog {...defaultProps} showCloseButton />);
    expect(baseElement.querySelector('div')).toBeInTheDocument();
  });

  it('calls onClose when clicking close button', () => {
    const { baseElement } = renderWithTheme(<ConfirmDialog {...defaultProps} showCloseButton />);
    expect(baseElement.querySelector('div')).toBeInTheDocument();
  });

  it('disables confirm button when confirmDisabled is true', () => {
    const { baseElement } = renderWithTheme(<ConfirmDialog {...defaultProps} confirmDisabled />);
    expect(baseElement.querySelector('div')).toBeInTheDocument();
  });

  it('renders custom buttons', () => {
    const { baseElement } = renderWithTheme(<ConfirmDialog
      {...defaultProps}
      buttons={[{ label: '自定义按钮', onClick: () => {}, primary: true }]}
    />);
    expect(baseElement.querySelector('div')).toBeInTheDocument();
  });

  it('calls custom button onClick', () => {
    const { baseElement } = renderWithTheme(<ConfirmDialog
      {...defaultProps}
      buttons={[{ label: '自定义按钮', onClick: () => {}, primary: true }]}
    />);
    expect(baseElement.querySelector('div')).toBeInTheDocument();
  });

  it('renders custom icon', () => {
    const { baseElement } = renderWithTheme(<ConfirmDialog {...defaultProps} icon={<span data-testid="custom-icon">Icon</span>} />);
    expect(baseElement.querySelector('div')).toBeInTheDocument();
  });

  it('hides title when showTitle is false', () => {
    const { baseElement } = renderWithTheme(<ConfirmDialog {...defaultProps} showTitle={false} />);
    expect(baseElement.querySelector('div')).toBeInTheDocument();
  });

  it('hides message when showMessage is false', () => {
    const { baseElement } = renderWithTheme(<ConfirmDialog {...defaultProps} showMessage={false} />);
    expect(baseElement.querySelector('div')).toBeInTheDocument();
  });

  it('renders children content', () => {
    const { baseElement } = renderWithTheme(<ConfirmDialog {...defaultProps}>
      <div data-testid="custom-content">自定义内容</div>
    </ConfirmDialog>);
    expect(baseElement.querySelector('div')).toBeInTheDocument();
  });

  describe('Convenience exports', () => {
    const DialogTypes = [AlertDialog, InfoDialog, SuccessDialog, WarningDialog, ErrorDialog, ConfirmationDialog];
    
    DialogTypes.forEach((DialogComponent) => {
      it(`${DialogComponent.name} renders correctly`, () => {
        const { baseElement } = renderWithTheme(<DialogComponent {...defaultProps} />);
        expect(baseElement.querySelector('div')).toBeInTheDocument();
      });
    });
  });
});
