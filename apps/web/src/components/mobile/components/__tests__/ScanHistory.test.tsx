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
    expect(screen.getByPlaceholderText('搜索历史记录')).toBeInTheDocument();
  });
});
