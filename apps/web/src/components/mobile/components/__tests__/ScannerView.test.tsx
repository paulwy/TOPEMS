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
    expect(screen.getByText('闪光灯')).toBeInTheDocument();
    expect(screen.getByText('相册')).toBeInTheDocument();
    expect(screen.getByText('手动输入')).toBeInTheDocument();
  });
});
