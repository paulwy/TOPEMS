import { useState, useEffect } from 'react';
import { MapView } from './components/MapView';
import { Sidebar } from './components/Sidebar';
import {
  fetchDeviceLocations,
  fetchPipelines,
  fetchWarehouseLocations,
  fetchLocationPhotos,
  fetchBusinessLocations,
} from './api/client';
import type { DeviceLocation, Pipeline, WarehouseLocation, LocationPhoto, BusinessLocation } from './types';

function App() {
  const [deviceLocations, setDeviceLocations] = useState<DeviceLocation[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [warehouseLocations, setWarehouseLocations] = useState<WarehouseLocation[]>([]);
  const [locationPhotos, setLocationPhotos] = useState<LocationPhoto[]>([]);
  const [businessLocations, setBusinessLocations] = useState<BusinessLocation[]>([]);
  const [selectedLayer, setSelectedLayer] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [devicesRes, pipelinesRes, warehousesRes, photosRes, businessRes] = await Promise.all([
        fetchDeviceLocations(),
        fetchPipelines(),
        fetchWarehouseLocations(),
        fetchLocationPhotos(),
        fetchBusinessLocations(),
      ]);

      if (devicesRes.success && devicesRes.data) {
        setDeviceLocations(devicesRes.data.device_locations || []);
      }
      if (pipelinesRes.success && pipelinesRes.data) {
        setPipelines(pipelinesRes.data.pipelines || []);
      }
      if (warehousesRes.success && warehousesRes.data) {
        setWarehouseLocations(warehousesRes.data.warehouse_locations || []);
      }
      if (photosRes.success && photosRes.data) {
        setLocationPhotos(photosRes.data.location_photos || []);
      }
      if (businessRes.success && businessRes.data) {
        setBusinessLocations(businessRes.data.business_locations || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setError('加载数据失败，请检查网络连接或稍后重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-gray-500">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-100">
      <Sidebar
        deviceLocations={deviceLocations}
        warehouseLocations={warehouseLocations}
        pipelines={pipelines}
        locationPhotos={locationPhotos}
        businessLocations={businessLocations}
        selectedLayer={selectedLayer}
        onLayerChange={setSelectedLayer}
        onRefresh={loadData}
      />
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">TOPEMS GIS - 空间数字化系统</h1>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            刷新数据
          </button>
        </header>
        {error && (
          <div className="bg-red-50 border border-red-200 px-4 py-3 text-red-700">
            {error}
          </div>
        )}
        <div className="flex-1">
          <MapView
            deviceLocations={deviceLocations}
            pipelines={pipelines}
            warehouseLocations={warehouseLocations}
            locationPhotos={locationPhotos}
            businessLocations={businessLocations}
            selectedLayer={selectedLayer}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
