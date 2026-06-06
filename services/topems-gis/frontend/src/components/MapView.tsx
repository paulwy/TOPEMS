import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { DeviceLocation, Pipeline, WarehouseLocation, LocationPhoto, BusinessLocation } from '../types';
import { Plus, Layers } from 'lucide-react';

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

const businessIcon = L.icon({
  iconUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%238b5cf6" stroke-width="2"%3E%3Cpath d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/%3E%3C/svg%3E',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const addMarkerIcon = L.icon({
  iconUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ef4444" stroke="%23ffffff" stroke-width="2"%3E%3Ccircle cx="12" cy="12" r="10"/%3E%3Cpath d="M12 8v8M8 12h8"/%3E%3C/svg%3E',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const editIcon = L.icon({
  iconUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23f59e0b" stroke="%23ffffff" stroke-width="2"%3E%3Ccircle cx="12" cy="12" r="10"/%3E%3Cpath d="M12 16l4-4-4-4M8 12h8"/%3E%3C/svg%3E',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

interface LayerVisibility {
  devices: boolean;
  pipelines: boolean;
  warehouses: boolean;
  photos: boolean;
  business: boolean;
}

interface MapViewProps {
  deviceLocations: DeviceLocation[];
  pipelines: Pipeline[];
  warehouseLocations: WarehouseLocation[];
  locationPhotos: LocationPhoto[];
  businessLocations: BusinessLocation[];
  selectedLayer: string;
  // 新增功能
  editable?: boolean;
  onAddPoint?: (position: { lat: number; lng: number }) => void;
  onEditPoint?: (id: string, position: { lat: number; lng: number }) => void;
  editMode?: boolean;
  editTarget?: { id: string; type: string; position: { lat: number; lng: number } } | null;
  flyToLocation?: { lat: number; lng: number } | null;
  onFlyToComplete?: () => void;
  searchResultHighlight?: { lat: number; lng: number } | null;
}

// 地图点击事件组件
function MapClickHandler({
  enabled,
  onMapClick
}: {
  enabled: boolean;
  onMapClick: (position: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click: (e) => {
      if (enabled) {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
}

// 定位到指定位置组件
function FlyToLocation({
  position,
  onComplete
}: {
  position: { lat: number; lng: number } | null;
  onComplete: () => void;
}) {
  const map = useMap();
  
  useEffect(() => {
    if (position) {
      map.flyTo([position.lat, position.lng], 16, { duration: 1.5 });
      const timer = setTimeout(onComplete, 1500);
      return () => clearTimeout(timer);
    }
  }, [position, map, onComplete]);
  
  return null;
}

export function MapView({
  deviceLocations,
  pipelines,
  warehouseLocations,
  locationPhotos,
  businessLocations,
  selectedLayer,
  editable = false,
  onAddPoint,
  onEditPoint,
  editMode = false,
  editTarget,
  flyToLocation,
  onFlyToComplete,
  searchResultHighlight,
}: MapViewProps) {
  const [center, setCenter] = useState<[number, number]>([39.9042, 116.4074]);
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({
    devices: true,
    pipelines: true,
    warehouses: true,
    photos: true,
    business: true,
  });
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [tempMarker, setTempMarker] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const allLocations = [
      ...deviceLocations.map(d => d.position),
      ...warehouseLocations.map(w => w.position),
      ...locationPhotos.map(p => p.position),
      ...businessLocations.map(b => b.position),
    ];

    if (allLocations.length > 0) {
      const validPositions = allLocations.filter(pos => pos && typeof pos === 'object' && typeof (pos as any).lat === 'number');
      if (validPositions.length > 0) {
        const firstPos = validPositions[0] as { lat: number; lng: number };
        setCenter([firstPos.lat, firstPos.lng]);
      }
    }
  }, [deviceLocations, warehouseLocations, locationPhotos, businessLocations]);

  const filteredDevices = selectedLayer === 'all' || selectedLayer === 'devices' ? deviceLocations : [];
  const filteredPipelines = selectedLayer === 'all' || selectedLayer === 'pipelines' ? pipelines : [];
  const filteredWarehouses = selectedLayer === 'all' || selectedLayer === 'warehouses' ? warehouseLocations : [];
  const filteredPhotos = selectedLayer === 'all' || selectedLayer === 'photos' ? locationPhotos : [];
  const filteredBusiness = selectedLayer === 'all' || selectedLayer === 'business' ? businessLocations : [];

  const handleMapClick = (position: { lat: number; lng: number }) => {
    if (editable && onAddPoint) {
      setTempMarker(position);
      onAddPoint(position);
      setTempMarker(null);
    }
  };

  const handleMarkerDragEnd = (id: string, e: L.DragEndEvent) => {
    const marker = e.target;
    const position = marker.getLatLng();
    if (onEditPoint) {
      onEditPoint(id, { lat: position.lat, lng: position.lng });
    }
  };

  const toggleLayer = (layer: keyof LayerVisibility) => {
    setLayerVisibility(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  const isDeviceVisible = layerVisibility.devices && (selectedLayer === 'all' || selectedLayer === 'devices');
  const isPipelineVisible = layerVisibility.pipelines && (selectedLayer === 'all' || selectedLayer === 'pipelines');
  const isWarehouseVisible = layerVisibility.warehouses && (selectedLayer === 'all' || selectedLayer === 'warehouses');
  const isPhotoVisible = layerVisibility.photos && (selectedLayer === 'all' || selectedLayer === 'photos');
  const isBusinessVisible = layerVisibility.business && (selectedLayer === 'all' || selectedLayer === 'business');

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

        <MapClickHandler enabled={editable && !editMode} onMapClick={handleMapClick} />
        <FlyToLocation position={flyToLocation ?? null} onComplete={onFlyToComplete || (() => {})} />

        {isPipelineVisible && filteredPipelines.map((pipeline) => {
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

        {isWarehouseVisible && filteredWarehouses.map((warehouse) => {
          const pos = warehouse.position as { lat: number; lng: number };
          if (!pos || typeof pos.lat !== 'number') return null;
          return (
            <Marker
              key={warehouse.id}
              position={[pos.lat, pos.lng]}
              icon={warehouseIcon}
              draggable={editable}
              eventHandlers={{
                dragend: (e) => handleMarkerDragEnd(warehouse.id, e),
              }}
            >
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

        {isDeviceVisible && filteredDevices.map((device) => {
          const pos = device.position as { lat: number; lng: number };
          const isHighlighted = searchResultHighlight && pos.lat === searchResultHighlight.lat && pos.lng === searchResultHighlight.lng;
          if (!pos || typeof pos.lat !== 'number') return null;
          return (
            <Marker
              key={device.id}
              position={[pos.lat, pos.lng]}
              icon={isHighlighted ? editIcon : deviceIcon}
              draggable={editable}
              eventHandlers={{
                dragend: (e) => handleMarkerDragEnd(device.id, e),
              }}
            >
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

        {isPhotoVisible && filteredPhotos.map((photo) => {
          const pos = photo.position as { lat: number; lng: number };
          if (!pos || typeof pos.lat !== 'number') return null;
          return (
            <Marker
              key={photo.id}
              position={[pos.lat, pos.lng]}
              icon={photoIcon}
              draggable={editable}
              eventHandlers={{
                dragend: (e) => handleMarkerDragEnd(photo.id, e),
              }}
            >
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

        {isBusinessVisible && filteredBusiness.map((location) => {
          const pos = location.position as { lat: number; lng: number };
          const isHighlighted = searchResultHighlight && pos.lat === searchResultHighlight.lat && pos.lng === searchResultHighlight.lng;
          if (!pos || typeof pos.lat !== 'number') return null;
          return (
            <Marker
              key={location.id}
              position={[pos.lat, pos.lng]}
              icon={isHighlighted ? editIcon : businessIcon}
              draggable={editable}
              eventHandlers={{
                dragend: (e) => handleMarkerDragEnd(location.id, e),
              }}
            >
              <Popup>
                <div className="p-3 min-w-[200px]">
                  <h3 className="font-bold text-lg mb-2">{location.business_name}</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">类型:</span> {location.business_type}</p>
                    <p><span className="font-medium">分类:</span> {location.category || '未指定'}</p>
                    {location.business_code && <p><span className="font-medium">编号:</span> {location.business_code}</p>}
                    {location.address && <p><span className="font-medium">地址:</span> {location.address}</p>}
                    {location.contact_person && <p><span className="font-medium">联系人:</span> {location.contact_person}</p>}
                    {location.contact_phone && <p><span className="font-medium">电话:</span> {location.contact_phone}</p>}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {tempMarker && (
          <Marker position={[tempMarker.lat, tempMarker.lng]} icon={addMarkerIcon}>
            <Popup>新位置</Popup>
          </Marker>
        )}

        {editTarget && (
          <Marker
            position={[editTarget.position.lat, editTarget.position.lng]}
            icon={editIcon}
            draggable={true}
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target;
                const position = marker.getLatLng();
                onEditPoint?.(editTarget.id, { lat: position.lat, lng: position.lng });
              },
            }}
          >
            <Popup>拖动标记到新位置</Popup>
          </Marker>
        )}
      </MapContainer>

      {/* 搜索结果高亮提示 */}
      {searchResultHighlight && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-cyan-600 text-white px-4 py-2 rounded-lg shadow-lg z-10 animate-bounce">
          已定位到目标位置
        </div>
      )}

      {/* 地图控制按钮 */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        {editable && (
          <button
            onClick={() => {}}
            className="bg-white rounded-lg shadow-lg p-2 hover:bg-gray-50 flex items-center gap-2"
            title="点击地图添加点位"
          >
            <Plus className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium">添加点位</span>
          </button>
        )}
        <button
          onClick={() => setShowLayerPanel(!showLayerPanel)}
          className="bg-white rounded-lg shadow-lg p-2 hover:bg-gray-50"
          title="图层管理"
        >
          <Layers className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* 临时标记提示 */}
      {tempMarker && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-10">
          已添加临时标记 ({tempMarker.lat.toFixed(6)}, {tempMarker.lng.toFixed(6)})
        </div>
      )}

      {/* 图层管理面板 */}
      {showLayerPanel && (
        <div className="absolute top-16 right-16 bg-white rounded-lg shadow-xl p-4 z-20 min-w-[200px]">
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4" />
            图层管理
          </h4>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
              <input
                type="checkbox"
                checked={layerVisibility.devices}
                onChange={() => toggleLayer('devices')}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <div className="w-4 h-4 rounded-full bg-blue-500"></div>
              <span className="text-sm">设备点位</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
              <input
                type="checkbox"
                checked={layerVisibility.pipelines}
                onChange={() => toggleLayer('pipelines')}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <div className="w-4 h-0.5 bg-blue-500"></div>
              <span className="text-sm">管网管线</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
              <input
                type="checkbox"
                checked={layerVisibility.warehouses}
                onChange={() => toggleLayer('warehouses')}
                className="w-4 h-4 text-green-600 rounded"
              />
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <span className="text-sm">仓储位置</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
              <input
                type="checkbox"
                checked={layerVisibility.photos}
                onChange={() => toggleLayer('photos')}
                className="w-4 h-4 text-yellow-600 rounded"
              />
              <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
              <span className="text-sm">现场照片</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
              <input
                type="checkbox"
                checked={layerVisibility.business}
                onChange={() => toggleLayer('business')}
                className="w-4 h-4 text-purple-600 rounded"
              />
              <div className="w-4 h-4 rounded-full bg-purple-500"></div>
              <span className="text-sm">业务位置</span>
            </label>
          </div>
        </div>
      )}

      {/* 图例 */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 z-10">
        <h4 className="font-semibold text-sm mb-2">图例</h4>
        <div className="space-y-2 text-xs">
          {layerVisibility.devices && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500"></div>
              <span>设备点位</span>
            </div>
          )}
          {layerVisibility.pipelines && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-blue-500"></div>
              <span>管网管线</span>
            </div>
          )}
          {layerVisibility.warehouses && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <span>仓储位置</span>
            </div>
          )}
          {layerVisibility.photos && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
              <span>现场照片</span>
            </div>
          )}
          {layerVisibility.business && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-purple-500"></div>
              <span>业务位置</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
