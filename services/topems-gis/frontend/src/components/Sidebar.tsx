import type { DeviceLocation, WarehouseLocation, Pipeline } from '../types';

interface SidebarProps {
  deviceLocations: DeviceLocation[];
  warehouseLocations: WarehouseLocation[];
  pipelines: Pipeline[];
  selectedLayer: string;
  onLayerChange: (layer: string) => void;
}

export function Sidebar({
  deviceLocations,
  warehouseLocations,
  pipelines,
  selectedLayer,
  onLayerChange,
}: SidebarProps) {
  return (
    <div className="w-72 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-800">TOPEMS GIS</h1>
        <p className="text-sm text-gray-500">厂区空间数字化系统</p>
      </div>

      <div className="p-4 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-600 mb-2">图层控制</h2>
        <div className="space-y-2">
          <button
            onClick={() => onLayerChange('all')}
            className={`w-full px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedLayer === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            全部显示
          </button>
          <button
            onClick={() => onLayerChange('devices')}
            className={`w-full px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedLayer === 'devices'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            设备点位 ({deviceLocations.length})
          </button>
          <button
            onClick={() => onLayerChange('pipelines')}
            className={`w-full px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedLayer === 'pipelines'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            管网管线 ({pipelines.length})
          </button>
          <button
            onClick={() => onLayerChange('warehouses')}
            className={`w-full px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedLayer === 'warehouses'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            仓储位置 ({warehouseLocations.length})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="text-sm font-semibold text-gray-600 mb-3">设备列表</h2>
        <div className="space-y-2">
          {deviceLocations.slice(0, 10).map((device) => (
            <div key={device.id} className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-800 text-sm">{device.device_name}</div>
              <div className="text-xs text-gray-500">{device.device_code}</div>
              <div className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${
                device.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {device.status === 'active' ? '运行中' : '离线'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
