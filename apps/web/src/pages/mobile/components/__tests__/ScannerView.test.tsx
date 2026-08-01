import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils';

import ScannerView from '../ScannerView';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (x: string) => x }),
}));

const baseProps = {
  scanning: true,
  scanResult: null,
  flashOn: false,
  onFlashToggle: vi.fn(),
  onManualTabClick: vi.fn(),
  onRescan: vi.fn(),
  onCopyResult: vi.fn(),
};

describe('ScannerView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders flashlight, album, and manual action labels', () => {
    renderWithProviders(<ScannerView {...baseProps} />);
    expect(screen.getByText('mobile.scan.action.flashlight')).toBeInTheDocument();
    expect(screen.getByText('mobile.scan.action.album')).toBeInTheDocument();
    expect(screen.getByText('mobile.scan.section.manual')).toBeInTheDocument();
  });

  it('calls onFlashToggle when flashlight button is clicked', () => {
    const onFlashToggle = vi.fn();
    const { container } = renderWithProviders(
      <ScannerView
        {...baseProps}
        onFlashToggle={onFlashToggle}
      />
    );
    // First IconButton is the flashlight toggle
    const iconButtons = container.querySelectorAll('.MuiIconButton-root');
    fireEvent.click(iconButtons[0]);
    expect(onFlashToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onManualTabClick when manual button is clicked', () => {
    const onManualTabClick = vi.fn();
    const { container } = renderWithProviders(
      <ScannerView
        {...baseProps}
        onManualTabClick={onManualTabClick}
      />
    );
    // Third IconButton is the manual entry toggle
    const iconButtons = container.querySelectorAll('.MuiIconButton-root');
    fireEvent.click(iconButtons[2]);
    expect(onManualTabClick).toHaveBeenCalledTimes(1);
  });

  it('renders scan success overlay when scanResult is provided', () => {
    renderWithProviders(
      <ScannerView
        {...baseProps}
        scanning={false}
        scanResult='PROD-123'
      />
    );
    expect(screen.getByText('mobile.scan.message.scan_success')).toBeInTheDocument();
    expect(screen.getByText('PROD-123')).toBeInTheDocument();
    expect(screen.getByText('mobile.scan.action.rescan')).toBeInTheDocument();
    expect(screen.getByText('mobile.scan.action.copy_result')).toBeInTheDocument();
  });

  it('calls onRescan when rescan button is clicked', () => {
    const onRescan = vi.fn();
    renderWithProviders(
      <ScannerView
        {...baseProps}
        scanning={false}
        scanResult='PROD-123'
        onRescan={onRescan}
      />
    );
    fireEvent.click(screen.getByText('mobile.scan.action.rescan'));
    expect(onRescan).toHaveBeenCalledTimes(1);
  });

  it('calls onCopyResult when copy button is clicked', () => {
    const onCopyResult = vi.fn();
    renderWithProviders(
      <ScannerView
        {...baseProps}
        scanning={false}
        scanResult='PROD-123'
        onCopyResult={onCopyResult}
      />
    );
    fireEvent.click(screen.getByText('mobile.scan.action.copy_result'));
    expect(onCopyResult).toHaveBeenCalledTimes(1);
  });

  it('renders related info paper when scanResult is set', () => {
    renderWithProviders(
      <ScannerView
        {...baseProps}
        scanning={false}
        scanResult='INV-001'
      />
    );
    expect(screen.getByText('mobile.scan.label.related_info')).toBeInTheDocument();
    expect(screen.getByText('mobile.scan.name.resistor_10k')).toBeInTheDocument();
    // Material code label includes the scan result; the result also appears in the success overlay
    const matches = screen.getAllByText(/INV-001/);
    expect(matches.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('mobile.scan.action.view')).toBeInTheDocument();
  });

  it('does not render success overlay when scanResult is null', () => {
    renderWithProviders(
      <ScannerView
        {...baseProps}
        scanResult={null}
      />
    );
    expect(screen.queryByText('mobile.scan.message.scan_success')).not.toBeInTheDocument();
    expect(screen.queryByText('mobile.scan.action.rescan')).not.toBeInTheDocument();
  });
});
