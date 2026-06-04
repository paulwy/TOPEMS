import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import type { DeviceLocation, Pipeline, WarehouseLocation, LocationPhoto } from '../types';

const deviceIcon = L.icon({
  iconUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%233b82f6" stroke-width="2"%3E%3Cpath d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/%3E%3Ccircle cx="12" cy="12" r="3"/%3E%3C/svg%3E',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const warehouseIcon = L.icon({
  iconUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%2310b981" stroke-width="2"%3E%3Cpath d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/%3E%3C/svg%3E',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const photoIcon = L.icon({
  iconUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23f59e0b" stroke-width="2"%3E%3Cpath d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/%3E%3Ccircle cx="12" cy="13" r="4"/%3E%3C/svg%3E',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

interface MapViewProps {
  deviceLocations: DeviceLocation[];
  pipelines: Pipeline[];
  warehouseLocations: WarehouseLocation[];
  locationPhotos: LocationPhoto[];
  selectedLayer: string;
}

export function MapView({ deviceLocations, pipelines, warehouseLocations, locationPhotos, selectedLayer }: MapViewProps) {
  const [center, setCenter] = useState<[number, number]>([39.9042, 116.4074]);

  useEffect(() => {
    const allLocations = [
      ...deviceLocations.map(d => d.position),
      ...warehouseLocations.map(w => w.position),
      ...locationPhotos.map(p => p.position),
    ];
    
    if (allLocations.length > 0) {
      const validPositions = allLocations.filter(pos => pos && typeof pos === 'object' && typeof (pos as any).lat === 'number');
      if (validPositions.length > 0) {
        const firstPos = validPositions[0] as { lat: number; lng: number };
        setCenter([firstPos.lat, firstPos.lng]);
      }
    }
  }, [deviceLocations, warehouseLocations, locationPhotos]);

  const filteredDevices = selectedLayer === 'all' || selectedLayer === 'devices' ? deviceLocations : [];
  const filteredPipelines = selectedLayer === 'all' || selectedLayer === 'pipelines' ? pipelines : [];
  const filteredWarehouses = selectedLayer === 'all' || selectedLayer === 'warehouses' ? warehouseLocations : [];
  const filteredPhotos = selectedLayer === 'all' || selectedLayer === 'photos' ? locationPhotos : [];

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={center}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {filteredPipelines.map((pipeline) => {
          const path = pipeline.path as Array<{ lat: number; lng: number }>;
          if (!path || path.length < 2) return null;
          const latLngs: [number, number][] = path.map((p) => [p.lat, p.lng]);
          return (
            <Polyline
              key={pipeline.id}
              positions={latLngs}
              color={pipeline.status === 'active' ? '#3b82f6' : '#6b7280'}
              weight={4}
              opacity={0.8}
            >
              <Popup>
                <div className="p-3 min-w-[200px]">
                  <h3 className="font-bold text-lg mb-2">{pipeline.name}</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">编号:</span> {pipeline.code}</p>
                    <p><span className="font-medium">类型:</span> {pipeline.pipeline_type || '未指定'}</p>
                    <p><span className="font-medium">状态:</span> <span className={pipeline.status === 'active' ? 'text-green-600' : 'text-gray-500'}>{pipeline.status === 'active' ? '运行中' : '停用'}</span></p>
                  </div>
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {filteredWarehouses.map((warehouse) => {
          const pos = warehouse.position as { lat: number; lng: number };
          if (!pos || typeof pos.lat !== 'number') return null;
          return (
            <Marker key={warehouse.id} position={[pos.lat, pos.lng]} icon={warehouseIcon}>
              <Popup>
                <div className="p-3 min-w-[200px]">
                  <h3 className="font-bold text-lg mb-2">{warehouse.warehouse_name}</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">区域:</span> {warehouse.zone || '未指定'}</p>
                    <p><span className="font-medium">容量:</span> {warehouse.capacity || 0}</p>
                    <p><span className="font-medium">使用率:</span> {(warehouse.usage_rate || 0) * 100}%</p>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {filteredDevices.map((device) => {
          const pos = device.position as { lat: number; lng: number };
          if (!pos || typeof pos.lat !== 'number') return null;
          return (
            <Marker key={device.id} position={[pos.lat, pos.lng]} icon={deviceIcon}>
              <Popup>
                <div className="p-3 min-w-[200px]">
                  <h3 className="font-bold text-lg mb-2">{device.device_name}</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">编号:</span> {device.device_code}</p>
                    <p><span className="font-medium">类型:</span> {device.device_type || '未指定'}</p>
                    <p><span className="font-medium">状态:</span> <span className={device.status === 'active' ? 'text-green-600' : 'text-red-500'}>{device.status === 'active' ? '运行中' : '离线'}</span></p>
                    {device.description && <p><span className="font-medium">描述:</span> {device.description}</p>}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {filteredPhotos.map((photo) => {
          const pos = photo.position as { lat: number; lng: number };
          if (!pos || typeof pos.lat !== 'number') return null;
          return (
            <Marker key={photo.id} position={[pos.lat, pos.lng]} icon={photoIcon}>
              <Popup>
                <div className="p-3 min-w-[200px]">
                  <h3 className="font-bold text-lg mb-2">{photo.description || '现场照片'}</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">拍摄人:</span> {photo.taken_by}</p>
                    <p><span className="font-medium">拍摄时间:</span> {new Date(photo.taken_at).toLocaleString()}</p>
                    {photo.photo_url && (
                      <div className="mt-2">
                        <img src={photo.photo_url} alt="现场照片" className="max-w-[180px] max-h-[150px] object-cover rounded" />
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 z-10">
        <h4 className="font-semibold text-sm mb-2">图例</h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500"></div>
            <span>设备点位</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-blue-500"></div>
            <span>管网管线</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span>仓储位置</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
            <span>现场照片</span>
          </div>
        </div>
      </div>
    </div>
  );
}
