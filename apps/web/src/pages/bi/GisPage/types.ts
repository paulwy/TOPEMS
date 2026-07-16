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
  | import('@/api/gis').DevicePoint
  | import('@/api/gis').StorageLocation
  | import('@/api/gis').Pipeline
  | import('@/api/gis').EvidenceRecord
  | import('@/api/gis').FactoryMap
  | import('@/api/gis').BusinessLocation;
