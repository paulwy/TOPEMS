import type { ApiResponse } from "./client";
export interface ListQueryParams {
    page?: number;
    page_size?: number;
    search?: string;
    status?: string;
}
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}
export interface GisStatistics {
    device_points: number;
    pipelines: number;
    storage_locations: number;
    evidence_records: number;
    business_locations: number;
    factory_maps: number;
    active_devices: number;
    active_pipelines: number;
}
export interface DevicePoint {
    id: string;
    name: string;
    description?: string;
    device_type: string;
    latitude: number;
    longitude: number;
    status: string;
    last_inspected?: string;
    created_at: string;
    updated_at: string;
}
export interface DeviceLocationRecord {
    id: string;
    device_id: string;
    device_name: string;
    latitude: number;
    longitude: number;
    timestamp: string;
    accuracy?: number;
    speed?: number;
    heading?: number;
    battery_level?: number;
    created_at: string;
}
export interface TrackQueryParams {
    device_id: string;
    start_time?: string;
    end_time?: string;
    page?: number;
    page_size?: number;
}
export interface CreateDevicePointRequest {
    name: string;
    description?: string;
    device_type: string;
    latitude: number;
    longitude: number;
    status?: string;
}
export interface Pipeline {
    id: string;
    name: string;
    description?: string;
    pipeline_type: string;
    start_point: [number, number];
    end_point: [number, number];
    status: string;
    created_at: string;
    updated_at: string;
    code?: string;
}
export interface CreatePipelineRequest {
    name: string;
    description?: string;
    pipeline_type: string;
    start_point: [number, number];
    end_point: [number, number];
    status?: string;
}
export interface StorageLocation {
    id: string;
    name: string;
    description?: string;
    location_type: string;
    latitude: number;
    longitude: number;
    capacity?: number;
    current_usage?: number;
    created_at: string;
    updated_at: string;
}
export interface CreateStorageLocationRequest {
    name: string;
    description?: string;
    location_type: string;
    latitude: number;
    longitude: number;
    capacity?: number;
    current_usage?: number;
}
export interface EvidenceRecord {
    id: string;
    title: string;
    description?: string;
    evidence_type: string;
    latitude: number;
    longitude: number;
    file_url?: string;
    recorded_by: string;
    recorded_at: string;
    created_at: string;
}
export interface CreateEvidenceRecordRequest {
    title: string;
    description?: string;
    evidence_type: string;
    latitude: number;
    longitude: number;
    file_url?: string;
    recorded_by: string;
}
export interface WarehouseLocation {
    id: string;
    warehouse_name: string;
    zone?: string;
    position: {
        lat: number;
        lng: number;
    };
    capacity?: number;
    usage_rate?: number;
    status: string;
    created_at: string;
    updated_at: string;
}
export interface LocationPhoto {
    id: string;
    position: {
        lat: number;
        lng: number;
    };
    photo_url: string;
    description?: string;
    taken_by: string;
    taken_at: string;
    created_at: string;
}
export interface BusinessLocation {
    id: string;
    business_type: string;
    business_name: string;
    business_code?: string;
    category?: string;
    position: {
        lat: number;
        lng: number;
    };
    address?: string;
    contact_person?: string;
    contact_phone?: string;
    capacity?: number;
    current_usage?: number;
    status: string;
    properties?: Record<string, any>;
    description?: string;
    external_id?: string;
    external_type?: string;
    created_at: string;
    updated_at: string;
}
export interface CreateBusinessLocationRequest {
    business_type: string;
    business_name: string;
    business_code?: string;
    category?: string;
    position: {
        lat: number;
        lng: number;
    };
    address?: string;
    contact_person?: string;
    contact_phone?: string;
    capacity?: number;
    current_usage?: number;
    status?: string;
    properties?: Record<string, any>;
    description?: string;
    external_id?: string;
    external_type?: string;
}
export interface MapMarker {
    id: string;
    marker_type: string;
    name: string;
    marker_style?: string;
    position: {
        lat: number;
        lng: number;
    };
    icon_svg?: string;
    color?: string;
    size?: number;
    popup_content?: string;
    click_action?: string;
    action_data?: Record<string, any>;
    visible?: boolean;
    z_index?: number;
    created_at: string;
    updated_at: string;
}
export interface CreateMapMarkerRequest {
    marker_type: string;
    name: string;
    marker_style?: string;
    position: {
        lat: number;
        lng: number;
    };
    icon_svg?: string;
    color?: string;
    size?: number;
    popup_content?: string;
    click_action?: string;
    action_data?: Record<string, any>;
    visible?: boolean;
    z_index?: number;
}
export interface CreateFactoryMapRequest {
    name: string;
    code: string;
    map_type: string;
    file_url: string;
    bounds?: any;
    description?: string;
}
export interface FactoryMap {
    id: string;
    name: string;
    code: string;
    map_type: string;
    file_url: string;
    bounds?: {
        north: number;
        south: number;
        east: number;
        west: number;
    };
    description?: string;
    created_at: string;
    updated_at: string;
}
export interface SearchResult {
    type: string;
    id: string;
    name: string;
    code?: string;
    position?: {
        lat: number;
        lng: number;
    };
    status: string;
}
export interface GeoJSONFeature {
    type: "Feature";
    geometry: {
        type: "Point" | "LineString" | "Polygon";
        coordinates: any;
    };
    properties: Record<string, any>;
}
export interface GeoJSON {
    type: "FeatureCollection";
    features: GeoJSONFeature[];
}
export declare const gisApi: {
    getStatistics: () => Promise<ApiResponse<GisStatistics>>;
    listDevicePoints: (params?: ListQueryParams) => Promise<ApiResponse<PaginatedResponse<DevicePoint>>>;
    getDevicePoint: (id: string) => Promise<ApiResponse<DevicePoint>>;
    listDevicePointsByMap: (mapId: string, params?: ListQueryParams) => Promise<ApiResponse<PaginatedResponse<DevicePoint>>>;
    createDevicePoint: (data: CreateDevicePointRequest) => Promise<ApiResponse<DevicePoint>>;
    updateDevicePoint: (id: string, data: Partial<CreateDevicePointRequest>) => Promise<ApiResponse<DevicePoint>>;
    deleteDevicePoint: (id: string) => Promise<ApiResponse<void>>;
    listPipelines: (params?: ListQueryParams) => Promise<ApiResponse<PaginatedResponse<Pipeline>>>;
    getPipeline: (id: string) => Promise<ApiResponse<Pipeline>>;
    listPipelinesByMap: (mapId: string, params?: ListQueryParams) => Promise<ApiResponse<PaginatedResponse<Pipeline>>>;
    createPipeline: (data: CreatePipelineRequest) => Promise<ApiResponse<Pipeline>>;
    updatePipeline: (id: string, data: Partial<CreatePipelineRequest>) => Promise<ApiResponse<Pipeline>>;
    deletePipeline: (id: string) => Promise<ApiResponse<void>>;
    listStorageLocations: (params?: ListQueryParams) => Promise<ApiResponse<PaginatedResponse<StorageLocation>>>;
    getStorageLocation: (id: string) => Promise<ApiResponse<StorageLocation>>;
    listStorageLocationsByMap: (mapId: string, params?: ListQueryParams) => Promise<ApiResponse<PaginatedResponse<StorageLocation>>>;
    createStorageLocation: (data: CreateStorageLocationRequest) => Promise<ApiResponse<StorageLocation>>;
    updateStorageLocation: (id: string, data: Partial<CreateStorageLocationRequest>) => Promise<ApiResponse<StorageLocation>>;
    deleteStorageLocation: (id: string) => Promise<ApiResponse<void>>;
    listEvidenceRecords: (params?: ListQueryParams) => Promise<ApiResponse<PaginatedResponse<EvidenceRecord>>>;
    getEvidenceRecord: (id: string) => Promise<ApiResponse<LocationPhoto>>;
    listEvidenceRecordsByMap: (mapId: string, params?: ListQueryParams) => Promise<ApiResponse<PaginatedResponse<EvidenceRecord>>>;
    createEvidenceRecord: (data: CreateEvidenceRecordRequest) => Promise<ApiResponse<EvidenceRecord>>;
    deleteEvidenceRecord: (id: string) => Promise<ApiResponse<void>>;
    listFactoryMaps: (params?: ListQueryParams) => Promise<ApiResponse<PaginatedResponse<FactoryMap>>>;
    getFactoryMap: (id: string) => Promise<ApiResponse<FactoryMap>>;
    createFactoryMap: (data: CreateFactoryMapRequest) => Promise<ApiResponse<FactoryMap>>;
    updateFactoryMap: (id: string, data: Partial<CreateFactoryMapRequest>) => Promise<ApiResponse<FactoryMap>>;
    deleteFactoryMap: (id: string) => Promise<ApiResponse<void>>;
    listBusinessLocations: (params?: ListQueryParams) => Promise<ApiResponse<PaginatedResponse<BusinessLocation>>>;
    getBusinessLocation: (id: string) => Promise<ApiResponse<BusinessLocation>>;
    listBusinessLocationsByType: (type: string, params?: ListQueryParams) => Promise<ApiResponse<PaginatedResponse<BusinessLocation>>>;
    createBusinessLocation: (data: CreateBusinessLocationRequest) => Promise<ApiResponse<BusinessLocation>>;
    updateBusinessLocation: (id: string, data: Partial<CreateBusinessLocationRequest>) => Promise<ApiResponse<BusinessLocation>>;
    deleteBusinessLocation: (id: string) => Promise<ApiResponse<void>>;
    listMapMarkers: (params?: ListQueryParams) => Promise<ApiResponse<PaginatedResponse<MapMarker>>>;
    createMapMarker: (data: CreateMapMarkerRequest) => Promise<ApiResponse<MapMarker>>;
    updateMapMarker: (id: string, data: Partial<CreateMapMarkerRequest>) => Promise<ApiResponse<MapMarker>>;
    deleteMapMarker: (id: string) => Promise<ApiResponse<void>>;
    search: (query: string, type?: string) => Promise<ApiResponse<any>>;
    exportGeoJSON: () => Promise<ApiResponse<GeoJSON>>;
    health: () => Promise<ApiResponse<string>>;
    importData: (type: string, file: File) => Promise<ApiResponse<any>>;
    getDeviceTrack: (params: TrackQueryParams) => Promise<ApiResponse<PaginatedResponse<DeviceLocationRecord>>>;
    getDeviceTrackStatistics: (device_id: string) => Promise<ApiResponse<{
        total_distance: number;
        avg_speed: number;
        max_speed: number;
        track_points: number;
        start_time: string;
        end_time: string;
    }>>;
    listDevicesWithTracks: () => Promise<ApiResponse<DevicePoint[]>>;
};
