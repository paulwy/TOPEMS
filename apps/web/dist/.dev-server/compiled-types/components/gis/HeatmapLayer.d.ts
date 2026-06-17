import React from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { DevicePoint, StorageLocation } from "../../api/gis";
interface HeatmapLayerProps {
    devicePoints: DevicePoint[];
    storageLocations: StorageLocation[];
    mapRef: React.RefObject<L.Map | null>;
    visible: boolean;
    intensityMode: "density" | "status";
}
declare const HeatmapLayer: React.FC<HeatmapLayerProps>;
export declare const HeatmapLegend: React.FC<{
    mode: "density" | "status";
}>;
export default HeatmapLayer;
