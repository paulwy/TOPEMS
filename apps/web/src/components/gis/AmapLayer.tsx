import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';
import type { DevicePoint, StorageLocation } from '../../api/gis';
import config from '../../config/runtime';
import { logger } from '@/utils/logger';

interface AmapLayerProps {
  devicePoints: DevicePoint[];
  storageLocations: StorageLocation[];
  center?: [number, number];
  zoom?: number;
}

export interface AmapLayerRef {
  getMap: () => any;
}

const AmapLayer = forwardRef<AmapLayerRef, AmapLayerProps>(
  ({ devicePoints, storageLocations, center = [116.397428, 39.90923], zoom = 10 }, ref) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const markersRef = useRef<Map<string, any>>(new Map());

    useImperativeHandle(ref, () => ({
      getMap: () => mapRef.current,
    }));

    useEffect(() => {
      if (!mapContainer.current) return;

      AMapLoader.load({
        key: config.thirdParty.amapKey || '您的高德地图API Key',
        version: '2.0',
        plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.MarkerClusterer'],
      })
        .then((AMap) => {
          const map = new AMap.Map(mapContainer.current, {
            center,
            zoom,
            viewMode: '3D',
            pitch: 30,
          });

          map.addControl(new AMap.Scale());
          map.addControl(new AMap.ToolBar());

          mapRef.current = map;

          updateMarkers(AMap, map);

          return () => {
            markersRef.current.forEach((marker) => {
              map.remove(marker);
            });
            markersRef.current.clear();
            map.destroy();
          };
        })
        .catch((error) => {
          logger.error('高德地图加载失败:', error);
        });
    }, []);

    useEffect(() => {
      if (!mapRef.current) return;

      mapRef.current.plugin(['AMap.Marker'], () => {
        updateMarkers((window as any).AMap, mapRef.current);
      });
    }, [devicePoints, storageLocations]);

    const updateMarkers = (AMap: any, map: any) => {
      markersRef.current.forEach((marker) => {
        map.remove(marker);
      });
      markersRef.current.clear();

      devicePoints.forEach((point) => {
        const marker = new AMap.Marker({
          position: [point.longitude, point.latitude],
          title: point.name,
          icon: new AMap.Icon({
            size: new AMap.Size(32, 32),
            image:
              'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxMCIgZmlsbD0iIzAwQzg5NyIvPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjcGF0aCkiLz48L3N2Zz4=',
            imageSize: new AMap.Size(32, 32),
          }),
        });

        marker.on('click', () => {
          const infoWindow = new AMap.InfoWindow({
            content: `
            <div style="padding: 10px;">
              <h4>${point.name}</h4>
              <p>类型: ${point.device_type}</p>
              <p>状态: ${point.status}</p>
              <p>坐标: ${point.latitude}, ${point.longitude}</p>
            </div>
          `,
          });
          infoWindow.open(map, marker.getPosition());
        });

        map.add(marker);
        markersRef.current.set(`device-${point.id}`, marker);
      });

      storageLocations.forEach((location) => {
        const marker = new AMap.Marker({
          position: [location.longitude, location.latitude],
          title: location.name,
          icon: new AMap.Icon({
            size: new AMap.Size(32, 32),
            image:
              'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSI5IiBmaWxsPSIjRjVFOUgwQiIvPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjcGF0aCkiLz48L3N2Zz4=',
            imageSize: new AMap.Size(32, 32),
          }),
        });

        marker.on('click', () => {
          const infoWindow = new AMap.InfoWindow({
            content: `
            <div style="padding: 10px;">
              <h4>${location.name}</h4>
              <p>类型: ${location.location_type}</p>
              <p>容量: ${location.capacity || '未设置'}</p>
              <p>坐标: ${location.latitude}, ${location.longitude}</p>
            </div>
          `,
          });
          infoWindow.open(map, marker.getPosition());
        });

        map.add(marker);
        markersRef.current.set(`storage-${location.id}`, marker);
      });
    };

    return (
      <div
        ref={mapContainer}
        style={{ width: '100%', height: '100%' }}
      />
    );
  }
);

AmapLayer.displayName = 'AmapLayer';

export default AmapLayer;
