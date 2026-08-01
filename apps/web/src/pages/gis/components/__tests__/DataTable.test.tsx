import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderWithProviders, screen } from '@/__tests__/test-utils';

import { DataTable } from '../DataTable';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (x: string) => x }),
}));

describe('DataTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when data is empty', () => {
    renderWithProviders(
      <DataTable
        data={[]}
        type='devicePoints'
      />
    );
    expect(screen.getByText('gis.index.empty_no_data')).toBeInTheDocument();
  });

  it('renders devicePoints columns and rows', () => {
    const data = [
      {
        id: '1',
        name: 'Temperature Sensor',
        device_type: 'Sensor',
        latitude: 31.2304,
        longitude: 121.4737,
        status: 'active',
        created_at: '',
        updated_at: '',
      },
    ];
    renderWithProviders(
      <DataTable
        data={data}
        type='devicePoints'
      />
    );
    expect(screen.getByText('Temperature Sensor')).toBeInTheDocument();
    expect(screen.getByText('Sensor')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    // Column headers
    expect(screen.getByText('gis.index.col_name')).toBeInTheDocument();
    expect(screen.getByText('gis.index.col_type')).toBeInTheDocument();
    expect(screen.getByText('gis.index.col_coordinates')).toBeInTheDocument();
    expect(screen.getByText('gis.index.col_status')).toBeInTheDocument();
  });

  it('renders pipelines columns including start/end points', () => {
    const data = [
      {
        id: '1',
        name: 'Pipeline A',
        pipeline_type: 'Water',
        start_point: [31.2304, 121.4737] as [number, number],
        end_point: [31.2404, 121.4837] as [number, number],
        status: 'pending',
        created_at: '',
        updated_at: '',
      },
    ];
    renderWithProviders(
      <DataTable
        data={data}
        type='pipelines'
      />
    );
    expect(screen.getByText('Pipeline A')).toBeInTheDocument();
    expect(screen.getByText('Water')).toBeInTheDocument();
    expect(screen.getByText('gis.index.col_start_point')).toBeInTheDocument();
    expect(screen.getByText('gis.index.col_end_point')).toBeInTheDocument();
  });

  it('renders storageLocations columns', () => {
    const data = [
      {
        id: '1',
        name: 'Warehouse 1',
        location_type: 'Warehouse',
        latitude: 31.2304,
        longitude: 121.4737,
        capacity: 1000,
        created_at: '',
        updated_at: '',
      },
    ];
    renderWithProviders(
      <DataTable
        data={data}
        type='storageLocations'
      />
    );
    expect(screen.getByText('Warehouse 1')).toBeInTheDocument();
    expect(screen.getByText('Warehouse')).toBeInTheDocument();
    expect(screen.getByText('1000')).toBeInTheDocument();
    expect(screen.getByText('gis.index.col_capacity')).toBeInTheDocument();
  });

  it('renders evidenceRecords with title and recorder', () => {
    const data = [
      {
        id: '1',
        title: 'Evidence A',
        evidence_type: 'Photo',
        latitude: 0,
        longitude: 0,
        recorded_by: 'Inspector Li',
        recorded_at: '2024-01-15T10:00:00Z',
        created_at: '',
      },
    ];
    renderWithProviders(
      <DataTable
        data={data}
        type='evidenceRecords'
      />
    );
    expect(screen.getByText('Evidence A')).toBeInTheDocument();
    expect(screen.getByText('Photo')).toBeInTheDocument();
    expect(screen.getByText('Inspector Li')).toBeInTheDocument();
    expect(screen.getByText('gis.index.col_title')).toBeInTheDocument();
    expect(screen.getByText('gis.index.col_recorder')).toBeInTheDocument();
  });

  it('renders factoryMaps with name and code', () => {
    const data = [
      {
        id: '1',
        name: 'Floor Map 1',
        code: 'FM-001',
        map_type: 'Indoor',
        file_url: '',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '',
      },
    ];
    renderWithProviders(
      <DataTable
        data={data}
        type='factoryMaps'
      />
    );
    expect(screen.getByText('Floor Map 1')).toBeInTheDocument();
    expect(screen.getByText('FM-001')).toBeInTheDocument();
    expect(screen.getByText('Indoor')).toBeInTheDocument();
    expect(screen.getByText('gis.index.col_code')).toBeInTheDocument();
    expect(screen.getByText('gis.index.col_created_at')).toBeInTheDocument();
  });

  it('renders businessLocations with address and contact', () => {
    const data = [
      {
        id: '1',
        business_type: 'Office',
        business_name: 'HQ',
        position: { lat: 0, lng: 0 },
        address: '123 Main St',
        contact_person: 'John',
        status: 'active',
        created_at: '',
        updated_at: '',
      },
    ];
    renderWithProviders(
      <DataTable
        data={data}
        type='businessLocations'
      />
    );
    expect(screen.getByText('HQ')).toBeInTheDocument();
    expect(screen.getByText('Office')).toBeInTheDocument();
    expect(screen.getByText('123 Main St')).toBeInTheDocument();
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('gis.index.col_address')).toBeInTheDocument();
    expect(screen.getByText('gis.index.col_contact')).toBeInTheDocument();
  });

  it('renders a table element for non-empty data', () => {
    const { container } = renderWithProviders(
      <DataTable
        data={[
          {
            id: '1',
            name: 'X',
            device_type: 'Y',
            latitude: 0,
            longitude: 0,
            status: 'active',
            created_at: '',
            updated_at: '',
          },
        ]}
        type='devicePoints'
      />
    );
    expect(container.querySelector('table')).toBeInTheDocument();
  });
});
