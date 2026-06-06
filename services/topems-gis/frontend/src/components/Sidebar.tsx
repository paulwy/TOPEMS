import type { DeviceLocation, WarehouseLocation, Pipeline, LocationPhoto, BusinessLocation } from '../types';

interface SidebarProps {
  deviceLocations: DeviceLocation[];
  warehouseLocations: WarehouseLocation[];
  pipelines: Pipeline[];
  locationPhotos: LocationPhoto[];
  businessLocations: BusinessLocation[];
  selectedLayer: string;
  onLayerChange: (layer: string) => void;
  onRefresh: () => void;
}

export function Sidebar({
  deviceLocations,
  warehouseLocations,
  pipelines,
  locationPhotos,
  businessLocations,
  selectedLayer,
  onLayerChange,
  onRefresh,
}: SidebarProps) {
  return (
    <div className="w-72 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">TOPEMS GIS</h1>
          <p className="text-sm text-gray-500">空间数字化系统</p>
        </div>
        <button
          onClick={onRefresh}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="刷新数据"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div className="p-4 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-600 mb-2">图层控制</h2>
        <div className="space-y-2">
          <button
            onClick={() => onLayerChange('all')}
            className={`w-full px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
              selectedLayer === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            全部显示
          </button>
          <button
            onClick={() => onLayerChange('devices')}
            className={`w-full px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
              selectedLayer === 'devices'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            设备点位 ({deviceLocations.length})
          </button>
          <button
            onClick={() => onLayerChange('pipelines')}
            className={`w-full px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
              selectedLayer === 'pipelines'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            管网管线 ({pipelines.length})
          </button>
          <button
            onClick={() => onLayerChange('warehouses')}
            className={`w-full px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
              selectedLayer === 'warehouses'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            仓储位置 ({warehouseLocations.length})
          </button>
          <button
            onClick={() => onLayerChange('photos')}
            className={`w-full px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
              selectedLayer === 'photos'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            现场照片 ({locationPhotos.length})
          </button>
          <button
            onClick={() => onLayerChange('business')}
            className={`w-full px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
              selectedLayer === 'business'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            业务位置 ({businessLocations.length})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {selectedLayer === 'all' || selectedLayer === 'devices' ? (
            <>
              <h2 className="text-sm font-semibold text-gray-600">设备列表</h2>
              <div className="space-y-2">
                {deviceLocations.slice(0, 8).map((device) => (
                  <div key={device.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                    <div className="font-medium text-gray-800 text-sm">{device.device_name}</div>
                    <div className="text-xs text-gray-500">{device.device_code}</div>
                    <div className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${
                      device.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {device.status === 'active' ? '运行中' : '离线'}
                    </div>
                  </div>
                ))}
                {deviceLocations.length === 0 && (
                  <div className="text-center text-gray-400 text-sm py-4">暂无设备数据</div>
                )}
              </div>
            </>
          ) : null}

          {selectedLayer === 'pipelines' ? (
            <>
              <h2 className="text-sm font-semibold text-gray-600">管线列表</h2>
              <div className="space-y-2">
                {pipelines.slice(0, 8).map((pipeline) => (
                  <div key={pipeline.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                    <div className="font-medium text-gray-800 text-sm">{pipeline.name}</div>
                    <div className="text-xs text-gray-500">{pipeline.code}</div>
                    <div className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${
                      pipeline.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {pipeline.status === 'active' ? '运行中' : '停用'}
                    </div>
                  </div>
                ))}
                {pipelines.length === 0 && (
                  <div className="text-center text-gray-400 text-sm py-4">暂无管线数据</div>
                )}
              </div>
            </>
          ) : null}

          {selectedLayer === 'warehouses' ? (
            <>
              <h2 className="text-sm font-semibold text-gray-600">仓储列表</h2>
              <div className="space-y-2">
                {warehouseLocations.slice(0, 8).map((warehouse) => (
                  <div key={warehouse.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                    <div className="font-medium text-gray-800 text-sm">{warehouse.warehouse_name}</div>
                    <div className="text-xs text-gray-500">{warehouse.zone || '未指定区域'}</div>
                    <div className="text-xs text-gray-500">容量: {warehouse.capacity || 0}</div>
                  </div>
                ))}
                {warehouseLocations.length === 0 && (
                  <div className="text-center text-gray-400 text-sm py-4">暂无仓储数据</div>
                )}
              </div>
            </>
          ) : null}

          {selectedLayer === 'photos' ? (
            <>
              <h2 className="text-sm font-semibold text-gray-600">照片列表</h2>
              <div className="space-y-2">
                {locationPhotos.slice(0, 8).map((photo) => (
                  <div key={photo.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                    <div className="font-medium text-gray-800 text-sm truncate">{photo.description || '现场照片'}</div>
                    <div className="text-xs text-gray-500">拍摄人: {photo.taken_by}</div>
                    <div className="text-xs text-gray-500">{new Date(photo.taken_at).toLocaleString()}</div>
                  </div>
                ))}
                {locationPhotos.length === 0 && (
                  <div className="text-center text-gray-400 text-sm py-4">暂无照片数据</div>
                )}
              </div>
            </>
          ) : null}

          {selectedLayer === 'business' ? (
            <>
              <h2 className="text-sm font-semibold text-gray-600">业务位置列表</h2>
              <div className="space-y-2">
                {businessLocations.slice(0, 8).map((location) => (
                  <div key={location.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                    <div className="font-medium text-gray-800 text-sm">{location.business_name}</div>
                    <div className="text-xs text-gray-500">{location.business_code || '无编号'}</div>
                    <div className="text-xs text-gray-500">{location.business_type}</div>
                    {location.contact_person && (
                      <div className="text-xs text-gray-500">联系人: {location.contact_person}</div>
                    )}
                  </div>
                ))}
                {businessLocations.length === 0 && (
                  <div className="text-center text-gray-400 text-sm py-4">暂无业务位置数据</div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-500 space-y-1">
          <div>设备: {deviceLocations.length}</div>
          <div>管线: {pipelines.length}</div>
          <div>仓储: {warehouseLocations.length}</div>
          <div>照片: {locationPhotos.length}</div>
          <div>业务: {businessLocations.length}</div>
        </div>
      </div>
    </div>
  );
}
