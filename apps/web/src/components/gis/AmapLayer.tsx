import { useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';
import type { DevicePoint, StorageLocation } from '../../api/gis';
import config from '../../config/runtime';
import { logger } from '@/utils/logger';
import i18n from '@/i18n';

interface AmapLayerProps {
  devicePoints: DevicePoint[];
  storageLocations: StorageLocation[];
  center?: [number, number];
  zoom?: number;
}

interface AmapLayerRef {
  getMap: () => unknown;
}

const AmapLayer = forwardRef<AmapLayerRef, AmapLayerProps>(
  ({ devicePoints, storageLocations, center = [116.397428, 39.90923], zoom = 10 }, ref) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- AMap 实例来自无类型 JS SDK
    const mapRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- AMap.Marker 无类型声明
    const markersRef = useRef<Map<string, any>>(new Map());

    useImperativeHandle(ref, () => ({
      getMap: () => mapRef.current,
    }));

    const updateMarkers = useCallback(
      (
        AMap: AMapType,
        map: { remove: (marker: AMapMarker) => void; add: (marker: AMapMarker) => void }
      ) => {
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
              <p>${i18n.t('components.amap_layer.k0')}</p>
              <p>${i18n.t('components.amap_layer.pointstatus_1', { point })}</p>
              <p>${i18n.t('components.amap_layer.k2', { point })}</p>
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
              <p>${i18n.t('components.amap_layer.k3', { location })}</p>
              <p>${i18n.t('components.amap_layer.k0')}${location.capacity || i18n.t('gis.amap_layer.k1')}</p>
              <p>${i18n.t('components.amap_layer.k4', { location })}</p>
            </div>
          `,
            });
            infoWindow.open(map, marker.getPosition());
          });

          map.add(marker);
          markersRef.current.set(`storage-${location.id}`, marker);
        });
      },
      [devicePoints, storageLocations]
    );

    useEffect(() => {
      if (!mapRef.current) return;

      mapRef.current.plugin(['AMap.Marker'], () => {
        updateMarkers(
          (window as unknown as Record<string, unknown>).AMap as AMapType,
          mapRef.current
        );
      });
    }, [devicePoints, storageLocations, updateMarkers]);

    useEffect(() => {
      if (!mapContainer.current) return;

      AMapLoader.load({
        key: config.thirdParty.amapKey || i18n.t('gis.amap_layer.apikey_0'),
        version: '2.0',
        plugins: ['AMap.SCALE', 'AMap.ToolBar', 'AMap.MarkerClusterer'],
      })
        .then((AMap) => {
          const map = new AMap.Map(mapContainer.current, {
            center,
            zoom,
            viewMode: '3D',
            pitch: 30,
          });

          map.addControl(new AMap.SCALE());
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
          logger.error(i18n.t('components.amap_layer.k0'), error);
        });
    }, [center, zoom, updateMarkers]);

    interface AMapMarkerOptions {
      position: [number, number];
      title?: string;
      icon?: unknown;
    }

    interface AMapMarker {
      position: [number, number];
      on(event: string, callback: () => void): void;
      getPosition(): [number, number];
    }

    interface AMapInfoWindow {
      new (options: { content: string }): {
        open: (map: unknown, position: [number, number]) => void;
      };
    }

    interface AMapType {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      Marker: new (options: AMapMarkerOptions) => AMapMarker;
      // eslint-disable-next-line @typescript-eslint/naming-convention
      Icon: new (options: unknown) => unknown;
      // eslint-disable-next-line @typescript-eslint/naming-convention
      Size: new (width: number, height: number) => unknown;
      // eslint-disable-next-line @typescript-eslint/naming-convention
      InfoWindow: AMapInfoWindow;
    }

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
