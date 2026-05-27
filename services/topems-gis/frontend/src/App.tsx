import { useState, useEffect } from 'react';
import { MapView } from './components/MapView';
import { Sidebar } from './components/Sidebar';
import {
  fetchDeviceLocations,
  fetchPipelines,
  fetchWarehouseLocations,
} from './api/client';
import type { DeviceLocation, Pipeline, WarehouseLocation } from './types';

function App() {
  const [deviceLocations, setDeviceLocations] = useState<DeviceLocation[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [warehouseLocations, setWarehouseLocations] = useState<WarehouseLocation[]>([]);
  const [selectedLayer, setSelectedLayer] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [devicesRes, pipelinesRes, warehousesRes] = await Promise.all([
          fetchDeviceLocations(),
          fetchPipelines(),
          fetchWarehouseLocations(),
        ]);

        if (devicesRes.success && devicesRes.data) {
          setDeviceLocations(devicesRes.data.device_locations);
        }
        if (pipelinesRes.success && pipelinesRes.data) {
          setPipelines(pipelinesRes.data.pipelines);
        }
        if (warehousesRes.success && warehousesRes.data) {
          setWarehouseLocations(warehousesRes.data.warehouse_locations);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-100">
      <Sidebar
        deviceLocations={deviceLocations}
        warehouseLocations={warehouseLocations}
        pipelines={pipelines}
        selectedLayer={selectedLayer}
        onLayerChange={setSelectedLayer}
      />
      <div className="flex-1">
        <MapView
          deviceLocations={deviceLocations}
          pipelines={pipelines}
          warehouseLocations={warehouseLocations}
          selectedLayer={selectedLayer}
        />
      </div>
    </div>
  );
}

export default App;
