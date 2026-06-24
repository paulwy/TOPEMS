/**
 * 3D地图模块
 * 支持3D地图视图、高度可视化、3D建筑和设施模型
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MapContainer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import 'leaflet-3d-tiles';

// 3D地图类型定义
export interface ViewState3D {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
  altitude: number;
}

export interface Building3D {
  id: string;
  name: string;
  position: [number, number];
  height: number;
  footprint: [number, number][];
  color?: string;
  properties?: Record<string, unknown>;
}

export interface Terrain3D {
  id: string;
  name: string;
  bounds: [[number, number], [number, number]];
  heightData?: Float32Array;
}

export interface CameraAnimation {
  from: ViewState3D;
  to: ViewState3D;
  duration: number;
  easing?: (t: number) => number;
}

// 默认3D视图状态
export const DEFAULT_3D_VIEW: ViewState3D = {
  center: [31.2304, 121.4737], // 上海
  zoom: 15,
  pitch: 45,
  bearing: 0,
  altitude: 500,
};

// 3D地图组件属性
export interface Map3DViewProps {
  viewState: ViewState3D;
  onViewStateChange?: (viewState: ViewState3D) => void;
  buildings?: Building3D[];
  terrain?: Terrain3D;
  enable3D?: boolean;
  enableTerrain?: boolean;
  enableBuildings?: boolean;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 3D地图视图组件
 * 基于Leaflet的3D地图实现，支持倾斜、旋转、高度可视化
 */
export const Map3DView: React.FC<Map3DViewProps> = ({
  viewState,
  onViewStateChange,
  buildings = [],
  terrain,
  enable3D = true,
  enableTerrain = true,
  enableBuildings = true,
  children,
  className = '',
  style = {},
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const [isReady, setIsReady] = useState(false);

  // 初始化3D地图
  useEffect(() => {
    if (!mapRef.current && enable3D) {
      // 初始化3D地图逻辑
      setIsReady(true);
    }
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [enable3D]);

  // 处理视角变化
  const handleMove = useCallback(() => {
    if (mapRef.current && onViewStateChange) {
      const center = mapRef.current.getCenter();
      onViewStateChange({
        ...viewState,
        center: [center.lat, center.lng],
        zoom: mapRef.current.getZoom(),
      });
    }
  }, [viewState, onViewStateChange]);

  // 视角动画
  const animateTo = useCallback(
    (animation: CameraAnimation) => {
      if (!mapRef.current) return;

      const startTime = Date.now();
      const easing = animation.easing || ((t: number) => t);

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / animation.duration, 1);
        const easedProgress = easing(progress);

        const currentView: ViewState3D = {
          center: [
            animation.from.center[0] +
              (animation.to.center[0] - animation.from.center[0]) * easedProgress,
            animation.from.center[1] +
              (animation.to.center[1] - animation.from.center[1]) * easedProgress,
          ],
          zoom: animation.from.zoom + (animation.to.zoom - animation.from.zoom) * easedProgress,
          pitch: animation.from.pitch + (animation.to.pitch - animation.from.pitch) * easedProgress,
          bearing:
            animation.from.bearing +
            (animation.to.bearing - animation.from.bearing) * easedProgress,
          altitude:
            animation.from.altitude +
            (animation.to.altitude - animation.from.altitude) * easedProgress,
        };

        if (onViewStateChange) {
          onViewStateChange(currentView);
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      animate();
    },
    [onViewStateChange]
  );

  // 渲染3D建筑
  const renderBuildings = useCallback(() => {
    if (!enableBuildings || !mapRef.current) return null;

    return buildings.map((building) => (
      <BuildingMarker
        key={building.id}
        building={building}
        map={mapRef.current!}
        enable3D={enable3D}
      />
    ));
  }, [buildings, enableBuildings, enable3D]);

  return (
    <div
      className={`map-3d-view ${className}`}
      style={style}
    >
      <MapContainer
        center={viewState.center}
        zoom={viewState.zoom}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
        className='map-3d-container'
      >
        {/* 地图层级 */}
        <TileLayer3D
          viewState={viewState}
          enable3D={enable3D}
        />

        {/* 3D建筑标记 */}
        {enableBuildings &&
          buildings.map((building) => (
            <BuildingMarker
              key={building.id}
              building={building}
              enable3D={enable3D}
            />
          ))}

        {/* 子组件 */}
        {children}
      </MapContainer>

      {/* 3D控制面板 */}
      <div className='map-3d-controls'>
        <button
          onClick={() =>
            animateTo({
              from: viewState,
              to: { ...viewState, pitch: 0 },
              duration: 500,
            })
          }
          title='2D视图'
        >
          2D
        </button>
        <button
          onClick={() =>
            animateTo({
              from: viewState,
              to: { ...viewState, pitch: 45 },
              duration: 500,
            })
          }
          title='3D视图'
        >
          3D
        </button>
        <button
          onClick={() =>
            animateTo({
              from: viewState,
              to: { ...viewState, bearing: viewState.bearing + 45 },
              duration: 500,
            })
          }
          title='旋转'
        >
          ↻
        </button>
      </div>

      {/* 高度指示器 */}
      {enable3D && (
        <div className='altitude-indicator'>高度: {Math.round(viewState.altitude)}m</div>
      )}
    </div>
  );
};

// 3D瓦片图层组件
interface TileLayer3DProps {
  viewState: ViewState3D;
  enable3D: boolean;
}

const TileLayer3D: React.FC<TileLayer3DProps> = ({ viewState, enable3D }) => {
  const map = useMap();

  useEffect(() => {
    if (enable3D && map) {
      // 应用3D倾斜效果
      // @ts-ignore - Leaflet 3D扩展
      if (map.setView) {
        // 根据pitch调整视角
      }
    }
  }, [viewState.pitch, viewState.bearing, enable3D, map]);

  return <>{/* 标准瓦片图层 */}</>;
};

// 3D建筑标记组件
interface BuildingMarkerProps {
  building: Building3D;
  enable3D: boolean;
  map?: L.Map;
}

const BuildingMarker: React.FC<BuildingMarkerProps> = ({ building, enable3D, map }) => {
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!map) return;

    // 创建3D建筑标记
    const icon = L.divIcon({
      html: `
        <div class="building-marker ${enable3D ? 'building-marker-3d' : ''}"
             style="height: ${building.height}px; background: ${building.color || '#666'};">
          <span>${building.name}</span>
        </div>
      `,
      className: 'building-marker-container',
      iconSize: [50, building.height],
      iconAnchor: [25, building.height],
    });

    markerRef.current = L.marker(building.position, { icon }).addTo(map).bindPopup(`
        <div class="building-popup">
          <h4>${building.name}</h4>
          <p>高度: ${building.height}m</p>
          ${building.properties ? `<pre>${JSON.stringify(building.properties, null, 2)}</pre>` : ''}
        </div>
      `);

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
      }
    };
  }, [building, enable3D, map]);

  return null;
};

// 高度可视化组件
interface HeightVisualizationProps {
  data: Array<{
    position: [number, number];
    value: number;
  }>;
  colorScale?: string[];
  maxHeight?: number;
}

export const HeightVisualization: React.FC<HeightVisualizationProps> = ({
  data,
  colorScale = ['#00f', '#0ff', '#0f0', '#ff0', '#f00'],
  maxHeight = 100,
}) => {
  // 渲染高度热力图
  return (
    <div className='height-visualization'>
      {data.map((point, index) => (
        <div
          key={index}
          className='height-point'
          style={{
            left: `${point.position[1]}%`,
            top: `${point.position[0]}%`,
            height: `${(point.value / maxHeight) * 100}%`,
            background: colorScale[Math.floor((point.value / maxHeight) * (colorScale.length - 1))],
          }}
        />
      ))}
    </div>
  );
};

// 3D视角控制器hook
export function use3DViewController(initialView?: ViewState3D) {
  const [viewState, setViewState] = useState<ViewState3D>(initialView || DEFAULT_3D_VIEW);
  const [isAnimating, setIsAnimating] = useState(false);

  // 飞向指定位置
  const flyTo = useCallback((position: [number, number], zoom?: number, pitch?: number) => {
    setViewState((prev) => ({
      ...prev,
      center: position,
      zoom: zoom ?? prev.zoom,
      pitch: pitch ?? prev.pitch,
    }));
  }, []);

  // 改变视角
  const rotateTo = useCallback((bearing: number) => {
    setViewState((prev) => ({
      ...prev,
      bearing,
    }));
  }, []);

  // 改变倾斜
  const tiltTo = useCallback((pitch: number) => {
    setViewState((prev) => ({
      ...prev,
      pitch: Math.max(0, Math.min(60, pitch)),
    }));
  }, []);

  // 拉近/拉远
  const zoomBy = useCallback((delta: number) => {
    setViewState((prev) => ({
      ...prev,
      zoom: Math.max(1, Math.min(20, prev.zoom + delta)),
    }));
  }, []);

  // 重置视角
  const reset = useCallback(() => {
    setViewState(DEFAULT_3D_VIEW);
  }, []);

  return {
    viewState,
    setViewState,
    isAnimating,
    flyTo,
    rotateTo,
    tiltTo,
    zoomBy,
    reset,
  };
}

export default Map3DView;
