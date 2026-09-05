import { useState, useCallback } from 'react';
import { useGis } from '../../../context/GisContext';
import { useTranslation } from 'react-i18next';
import { MapPin, ArrowRight, Warehouse, Camera, Map, Building2 } from 'lucide-react';
import type { ReactNode } from 'react';

export type TabType =
  | 'map'
  | 'devicePoints'
  | 'pipelines'
  | 'storageLocations'
  | 'evidenceRecords'
  | 'factoryMaps'
  | 'businessLocations';

export interface Notification {
  type: 'success' | 'error';
  message: string;
}

export const useGisPage = () => {
  const { state, loadAllData } = useGis();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const [notification, setNotification] = useState<Notification | null>(null);

  const {
    devicePoints,
    pipelines,
    storageLocations,
    evidenceRecords,
    factoryMaps,
    businessLocations,
    statistics,
    loading,
    error,
  } = state;

  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
  }, []);

  const tabs: Array<{ id: TabType; label: string; icon: ReactNode }> = [
    { id: 'map', label: t('gis.index.tab_map_view'), icon: <Map size={18} /> },
    { id: 'devicePoints', label: t('gis.index.tab_device_points'), icon: <MapPin size={18} /> },
    { id: 'pipelines', label: t('gis.index.tab_pipelines'), icon: <ArrowRight size={18} /> },
    {
      id: 'storageLocations',
      label: t('gis.index.tab_storage_locations'),
      icon: <Warehouse size={18} />,
    },
    {
      id: 'evidenceRecords',
      label: t('gis.index.tab_evidence_records'),
      icon: <Camera size={18} />,
    },
    { id: 'factoryMaps', label: t('gis.index.tab_factory_maps'), icon: <Map size={18} /> },
    {
      id: 'businessLocations',
      label: t('gis.index.tab_business_locations'),
      icon: <Building2 size={18} />,
    },
  ];

  const getCurrentData = useCallback(() => {
    switch (activeTab) {
      case 'devicePoints':
        return devicePoints;
      case 'pipelines':
        return pipelines;
      case 'storageLocations':
        return storageLocations;
      case 'evidenceRecords':
        return evidenceRecords;
      case 'factoryMaps':
        return factoryMaps;
      case 'businessLocations':
        return businessLocations;
      default:
        return [];
    }
  }, [
    activeTab,
    devicePoints,
    pipelines,
    storageLocations,
    evidenceRecords,
    factoryMaps,
    businessLocations,
  ]);

  return {
    activeTab,
    setActiveTab,
    notification,
    setNotification,
    showNotification,
    tabs,
    getCurrentData,
    statistics,
    devicePoints,
    pipelines,
    storageLocations,
    evidenceRecords,
    factoryMaps,
    businessLocations,
    loading,
    error,
    loadAllData,
  };
};
