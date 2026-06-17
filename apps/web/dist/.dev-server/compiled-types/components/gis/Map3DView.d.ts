import React from "react";
import type { DevicePoint, Pipeline, StorageLocation } from "../../api/gis";
interface Map3DViewProps {
    devicePoints: DevicePoint[];
    pipelines: Pipeline[];
    storageLocations: StorageLocation[];
    onClose: () => void;
}
declare const Map3DView: React.FC<Map3DViewProps>;
export default Map3DView;
