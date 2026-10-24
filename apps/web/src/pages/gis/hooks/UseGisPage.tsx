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
