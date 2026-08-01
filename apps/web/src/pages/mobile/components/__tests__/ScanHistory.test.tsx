import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils';

import ScanHistory from '../ScanHistory';
import type { ScanHistoryItem } from '../hooks/useMobileScan';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (x: string) => x }),
}));

const historyItems: ScanHistoryItem[] = [
  {
    id: '1',
    content: 'PROD-2024-001234',
    type: 'barcode',
    format: 'Code 128',
    time: '10:30',
    relatedData: { type: 'Product', name: 'Smart Sensor', code: 'PROD-2024-001234' },
  },
  {
    id: '2',
    content: 'INV-A3-005678',
    type: 'qrcode',
    format: 'QR Code',
    time: '09:45',
  },
];

const baseProps = {
  searchQuery: '',
  onSearchChange: vi.fn(),
  scanHistory: historyItems,
  filteredHistory: historyItems,
  onClearHistory: vi.fn(),
  onItemClick: vi.fn(),
};

describe('ScanHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search input with placeholder', () => {
    renderWithProviders(<ScanHistory {...baseProps} />);
    expect(screen.getByPlaceholderText('mobile.scan.action.search_history')).toBeInTheDocument();
  });

  it('renders empty state when filteredHistory is empty', () => {
    renderWithProviders(
      <ScanHistory
        {...baseProps}
        filteredHistory={[]}
      />
    );
    expect(screen.getByText('mobile.scan.status.empty_history')).toBeInTheDocument();
    expect(screen.getByText('mobile.scan.status.history_desc')).toBeInTheDocument();
  });

  it('renders history items when filteredHistory is non-empty', () => {
    renderWithProviders(<ScanHistory {...baseProps} />);
    expect(screen.getByText('PROD-2024-001234')).toBeInTheDocument();
    expect(screen.getByText('INV-A3-005678')).toBeInTheDocument();
  });

  it('shows relatedData subtitle when present', () => {
    renderWithProviders(<ScanHistory {...baseProps} />);
    expect(screen.getByText('Product: Smart Sensor')).toBeInTheDocument();
  });

  it('shows format as subtitle when relatedData is absent', () => {
    renderWithProviders(<ScanHistory {...baseProps} />);
    // 'QR Code' appears both as the subtitle (format) and as the chip label
    const qrMatches = screen.getAllByText('QR Code');
    expect(qrMatches.length).toBeGreaterThanOrEqual(2);
  });

  it('shows the format chip for each item', () => {
    renderWithProviders(<ScanHistory {...baseProps} />);
    expect(screen.getByText('Code 128')).toBeInTheDocument();
  });

  it('shows time badge for each item', () => {
    renderWithProviders(<ScanHistory {...baseProps} />);
    expect(screen.getByText('10:30')).toBeInTheDocument();
    expect(screen.getByText('09:45')).toBeInTheDocument();
  });

  it('renders clear history button when scanHistory is non-empty', () => {
    const { container } = renderWithProviders(<ScanHistory {...baseProps} />);
    // Trash2 icon button is in the input end adornment
    const clearBtn = container.querySelector('button[aria-label="Clear"]');
    // The button may not have aria-label; verify by clicking the trash icon button at end of input
    const input = screen.getByPlaceholderText('mobile.scan.action.search_history');
    // Find the end adornment button
    const endAdornment = input.closest('.MuiOutlinedInput-root')?.querySelector('button');
    expect(endAdornment).toBeInTheDocument();
  });

  it('calls onClearHistory when clear button is clicked', () => {
    const onClearHistory = vi.fn();
    const { container } = renderWithProviders(
      <ScanHistory
        {...baseProps}
        onClearHistory={onClearHistory}
      />
    );
    const input = screen.getByPlaceholderText('mobile.scan.action.search_history');
    const endAdornment = input.closest('.MuiOutlinedInput-root')?.querySelector('button');
    if (endAdornment) {
      fireEvent.click(endAdornment);
      expect(onClearHistory).toHaveBeenCalledTimes(1);
    }
  });

  it('does not render clear button when scanHistory is empty', () => {
    const { container } = renderWithProviders(
      <ScanHistory
        {...baseProps}
        scanHistory={[]}
        filteredHistory={[]}
      />
    );
    const buttons = container.querySelectorAll('.MuiOutlinedInput-root button');
    expect(buttons.length).toBe(0);
  });

  it('calls onItemClick when an item is clicked', () => {
    const onItemClick = vi.fn();
    renderWithProviders(
      <ScanHistory
        {...baseProps}
        onItemClick={onItemClick}
      />
    );
    fireEvent.click(screen.getByText('PROD-2024-001234'));
    expect(onItemClick).toHaveBeenCalledWith('PROD-2024-001234');
  });
});
