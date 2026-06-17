import type { DevicePoint, StorageLocation } from "../../api/gis";
interface AmapLayerProps {
    devicePoints: DevicePoint[];
    storageLocations: StorageLocation[];
    center?: [number, number];
    zoom?: number;
}
export interface AmapLayerRef {
    getMap: () => any;
}
declare const AmapLayer: import("react").ForwardRefExoticComponent<AmapLayerProps & import("react").RefAttributes<AmapLayerRef>>;
export default AmapLayer;
