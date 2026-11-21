import type {
  DevicePoint,
  StorageLocation,
  Pipeline,
  EvidenceRecord,
  FactoryMap,
  BusinessLocation,
} from '@/api/gis';

export type TabType =
  | 'map'
  | 'devicePoints'
  | 'pipelines'
  | 'storageLocations'
  | 'evidenceRecords'
  | 'factoryMaps'
  | 'businessLocations';

export type ModalType = 'create' | 'edit' | null;

export interface FormErrors {
  [key: string]: string;
}

export type GisEntity =
  DevicePoint | StorageLocation | Pipeline | EvidenceRecord | FactoryMap | BusinessLocation;
