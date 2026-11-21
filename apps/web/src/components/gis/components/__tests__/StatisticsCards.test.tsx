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
});
