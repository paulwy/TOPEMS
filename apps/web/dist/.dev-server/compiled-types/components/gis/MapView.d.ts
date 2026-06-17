import React from "react";
import type { DevicePoint, Pipeline, StorageLocation } from "../../api/gis";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
interface MapViewProps {
    devicePoints?: DevicePoint[];
    pipelines?: Pipeline[];
    storageLocations?: StorageLocation[];
    onMarkerClick?: (item: DevicePoint | StorageLocation) => void;
}
declare const MapView: React.FC<MapViewProps>;
export default MapView;
