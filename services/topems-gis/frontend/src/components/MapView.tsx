import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import type { DeviceLocation, Pipeline, WarehouseLocation } from '../types';

const deviceIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2521/2521679.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const warehouseIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2575/2575679.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

interface MapViewProps {
  deviceLocations: DeviceLocation[];
  pipelines: Pipeline[];
  warehouseLocations: WarehouseLocation[];
  selectedLayer: string;
}

export function MapView({ deviceLocations, pipelines, warehouseLocations, selectedLayer }: MapViewProps) {
  const [center, setCenter] = useState([39.9042, 116.4074]);

  useEffect(() => {
    if (deviceLocations.length > 0) {
      const firstDevice = deviceLocations[0];
      if (firstDevice.position && typeof firstDevice.position === 'object') {
        const pos = firstDevice.position as { lat: number; lng: number };
        setCenter([pos.lat, pos.lng]);
      }
    }
  }, [deviceLocations]);

  const filteredDevices = selectedLayer === 'all' || selectedLayer === 'devices' ? deviceLocations : [];
  const filteredPipelines = selectedLayer === 'all' || selectedLayer === 'pipelines' ? pipelines : [];
  const filteredWarehouses = selectedLayer === 'all' || selectedLayer === 'warehouses' ? warehouseLocations : [];

  return (
    <div className="w-full h-full">
      <MapContainer
        center={center}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {filteredDevices.map((device) => {
          const pos = device.position as { lat: number; lng: number };
          if (!pos || typeof pos.lat !== 'number') return null;
          return (
            <Marker key={device.id} position={[pos.lat, pos.lng]} icon={deviceIcon}>
              <Popup>
                <div className="p-2">
                  <h3 className="font-bold">{device.device_name}</h3>
                  <p>编号: {device.device_code}</p>
                  <p>类型: {device.device_type || '未指定'}</p>
                  <p>状态: {device.status}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {filteredWarehouses.map((warehouse) => {
          const pos = warehouse.position as { lat: number; lng: number };
          if (!pos || typeof pos.lat !== 'number') return null;
          return (
            <Marker key={warehouse.id} position={[pos.lat, pos.lng]} icon={warehouseIcon}>
              <Popup>
                <div className="p-2">
                  <h3 className="font-bold">{warehouse.warehouse_name}</h3>
                  <p>区域: {warehouse.zone || '未指定'}</p>
                  <p>容量: {warehouse.capacity || 0}</p>
                  <p>使用率: {(warehouse.usage_rate || 0) * 100}%</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {filteredPipelines.map((pipeline) => {
          const path = pipeline.path as Array<{ lat: number; lng: number }>;
          if (!path || path.length < 2) return null;
          const latLngs = path.map((p) => [p.lat, p.lng]);
          return (
            <Polyline
              key={pipeline.id}
              positions={latLngs}
              color="blue"
              weight={3}
              opacity={0.8}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-bold">{pipeline.name}</h3>
                  <p>编号: {pipeline.code}</p>
                  <p>类型: {pipeline.pipeline_type || '未指定'}</p>
                </div>
              </Popup>
            </Polyline>
          );
        })}
      </MapContainer>
    </div>
  );
}
