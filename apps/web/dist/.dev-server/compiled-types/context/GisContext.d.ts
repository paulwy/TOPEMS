import React from "react";
import type { DevicePoint, Pipeline, StorageLocation, EvidenceRecord, FactoryMap, BusinessLocation, GisStatistics } from "../api/gis";
type GisState = {
    devicePoints: DevicePoint[];
    pipelines: Pipeline[];
    storageLocations: StorageLocation[];
    evidenceRecords: EvidenceRecord[];
    factoryMaps: FactoryMap[];
    businessLocations: BusinessLocation[];
    statistics: GisStatistics | null;
    loading: boolean;
    error: string | null;
    activeTab: string;
    cacheTimestamp: number | null;
};
interface GisContextType {
    state: GisState;
    loadAllData: (forceRefresh?: boolean) => Promise<void>;
    createDevicePoint: (data: any) => Promise<void>;
    updateDevicePoint: (id: string, data: any) => Promise<void>;
    deleteDevicePoint: (id: string) => Promise<void>;
    createPipeline: (data: any) => Promise<void>;
    updatePipeline: (id: string, data: any) => Promise<void>;
    deletePipeline: (id: string) => Promise<void>;
    createStorageLocation: (data: any) => Promise<void>;
    updateStorageLocation: (id: string, data: any) => Promise<void>;
    deleteStorageLocation: (id: string) => Promise<void>;
    createEvidenceRecord: (data: any) => Promise<void>;
    deleteEvidenceRecord: (id: string) => Promise<void>;
    createFactoryMap: (data: any) => Promise<void>;
    updateFactoryMap: (id: string, data: any) => Promise<void>;
    deleteFactoryMap: (id: string) => Promise<void>;
    createBusinessLocation: (data: any) => Promise<void>;
    updateBusinessLocation: (id: string, data: any) => Promise<void>;
    deleteBusinessLocation: (id: string) => Promise<void>;
    setActiveTab: (tab: string) => void;
    clearError: () => void;
    clearCache: () => void;
}
export declare const GisProvider: React.FC<{
    children: React.ReactNode;
}>;
export declare const useGis: () => GisContextType;
export {};
