import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderWithProviders, screen } from '@/__tests__/test-utils';

import { StatisticsCards } from '../StatisticsCards';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (x: string) => x }),
}));

const defaultProps = {
  statistics: {
    device_points: 10,
    pipelines: 20,
    storage_locations: 30,
    evidence_records: 40,
    factory_maps: 50,
    business_locations: 60,
  },
  devicePointsLength: 100,
  pipelinesLength: 200,
  storageLocationsLength: 300,
  evidenceRecordsLength: 400,
  factoryMapsLength: 500,
  businessLocationsLength: 600,
};

describe('StatisticsCards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all six stat labels', () => {
    renderWithProviders(<StatisticsCards {...defaultProps} />);
    expect(screen.getByText('gis.index.stat_device_points')).toBeInTheDocument();
    expect(screen.getByText('gis.index.stat_pipelines')).toBeInTheDocument();
    expect(screen.getByText('gis.index.stat_storage_locations')).toBeInTheDocument();
    expect(screen.getByText('gis.index.stat_evidence_records')).toBeInTheDocument();
    expect(screen.getByText('gis.index.stat_factory_maps')).toBeInTheDocument();
    expect(screen.getByText('gis.index.stat_business_locations')).toBeInTheDocument();
  });

  it('uses statistics values when provided', () => {
    renderWithProviders(<StatisticsCards {...defaultProps} />);
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('60')).toBeInTheDocument();
  });

  it('falls back to length props when statistics is null', () => {
    renderWithProviders(
      <StatisticsCards
        {...defaultProps}
        statistics={null}
      />
    );
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByText('300')).toBeInTheDocument();
    expect(screen.getByText('400')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('600')).toBeInTheDocument();
  });

  it('renders 6 Paper cards', () => {
    const { container } = renderWithProviders(<StatisticsCards {...defaultProps} />);
    const papers = container.querySelectorAll('.MuiPaper-root');
    expect(papers.length).toBe(6);
  });

  it('renders an icon for each card', () => {
    const { container } = renderWithProviders(<StatisticsCards {...defaultProps} />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(6);
  });

  it('handles partial statistics object (uses fallback for missing fields)', () => {
    renderWithProviders(
      <StatisticsCards
        {...defaultProps}
        statistics={{ device_points: 11 }}
      />
    );
    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
  });
});
