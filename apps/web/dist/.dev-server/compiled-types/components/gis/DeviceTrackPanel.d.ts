import React from "react";
import type { DevicePoint } from "../../api/gis";
import "leaflet/dist/leaflet.css";
interface DeviceTrackPanelProps {
    devicePoints: DevicePoint[];
    onClose: () => void;
}
declare const DeviceTrackPanel: React.FC<DeviceTrackPanelProps>;
export default DeviceTrackPanel;
