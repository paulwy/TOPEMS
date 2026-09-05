import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGisPage } from '../UseGisPage';

const gisState = vi.hoisted(() => ({
  devicePoints: [{ id: 'dp-1', name: 'DP1' }],
  pipelines: [{ id: 'pl-1', name: 'PL1' }],
  storageLocations: [{ id: 'sl-1', name: 'SL1' }],
  evidenceRecords: [{ id: 'er-1', name: 'ER1' }],
  factoryMaps: [{ id: 'fm-1', name: 'FM1' }],
  businessLocations: [{ id: 'bl-1', name: 'BL1' }],
  statistics: { total: 6 },
  loading: false,
  error: null,
}));

const loadAllDataMock = vi.hoisted(() => ({ fn: vi.fn() }));

vi.mock('@/context/GisContext', () => ({
  useGis: () => ({
    state: gisState,
    loadAllData: loadAllDataMock.fn,
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (x: string) => x }),
}));

vi.mock('lucide-react', () => ({
  MapPin: () => null,
  ArrowRight: () => null,
  Warehouse: () => null,
  Camera: () => null,
  Map: () => null,
  Building2: () => null,
}));

describe('UseGisPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadAllDataMock.fn.mockClear();
  });

  it('should render and return initial state', () => {
    const { result } = renderHook(() => useGisPage());
    expect(result.current).toBeDefined();
    expect(result.current.activeTab).toBe('map');
    expect(result.current.notification).toBeNull();
  });

  it('should return data and state from context', () => {
    const { result } = renderHook(() => useGisPage());
    expect(result.current.statistics).toEqual({ total: 6 });
    expect(result.current.devicePoints).toHaveLength(1);
    expect(result.current.pipelines).toHaveLength(1);
    expect(result.current.storageLocations).toHaveLength(1);
    expect(result.current.evidenceRecords).toHaveLength(1);
    expect(result.current.factoryMaps).toHaveLength(1);
    expect(result.current.businessLocations).toHaveLength(1);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should return 7 tabs', () => {
    const { result } = renderHook(() => useGisPage());
    expect(Array.isArray(result.current.tabs)).toBe(true);
    expect(result.current.tabs).toHaveLength(7);
    expect(result.current.tabs.map((t) => t.id)).toEqual([
      'map',
      'devicePoints',
      'pipelines',
      'storageLocations',
      'evidenceRecords',
      'factoryMaps',
      'businessLocations',
    ]);
  });

  it('getCurrentData should return empty array when default activeTab is map', () => {
    const { result } = renderHook(() => useGisPage());
    expect(result.current.getCurrentData()).toEqual([]);
  });

  it('getCurrentData should return devicePoints after switching to devicePoints tab', () => {
    const { result } = renderHook(() => useGisPage());
    act(() => {
      result.current.setActiveTab('devicePoints');
    });
    expect(result.current.activeTab).toBe('devicePoints');
    expect(result.current.getCurrentData()).toEqual([{ id: 'dp-1', name: 'DP1' }]);
  });

  it('getCurrentData should return pipelines after switching to pipelines tab', () => {
    const { result } = renderHook(() => useGisPage());
    act(() => {
      result.current.setActiveTab('pipelines');
    });
    expect(result.current.getCurrentData()).toEqual([{ id: 'pl-1', name: 'PL1' }]);
  });

  it('showNotification should set notification', () => {
    const { result } = renderHook(() => useGisPage());
    act(() => {
      result.current.showNotification('success', 'Operation successful');
    });
    expect(result.current.notification).toEqual({
      type: 'success',
      message: 'Operation successful',
    });
  });

  it('setNotification should update notification state directly', () => {
    const { result } = renderHook(() => useGisPage());
    act(() => {
      result.current.setNotification({ type: 'error', message: 'Failed' });
    });
    expect(result.current.notification).toEqual({ type: 'error', message: 'Failed' });
    act(() => {
      result.current.setNotification(null);
    });
    expect(result.current.notification).toBeNull();
  });

  it('should return loadAllData function', () => {
    const { result } = renderHook(() => useGisPage());
    expect(typeof result.current.loadAllData).toBe('function');
  });
});
