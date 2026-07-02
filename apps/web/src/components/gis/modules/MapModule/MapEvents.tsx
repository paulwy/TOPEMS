// modules/MapModule/MapEvents.tsx
import type React from 'react';
import { useEffect } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import type { DrawFeature } from '../shared/types';

type ToolMode =
  'select' | 'measure-distance' | 'measure-area' | 'draw-point' | 'draw-line' | 'draw-polygon';

interface MapEventsProps {
  toolMode: ToolMode;
  measurePoints: [number, number][];
  setMeasurePoints: (points: [number, number][]) => void;
  setMeasureResult: (result: string) => void;
  currentDrawing: DrawFeature | null;
  setCurrentDrawing: (drawing: DrawFeature | null) => void;
  drawFeatures: DrawFeature[];
  setDrawFeatures: (features: DrawFeature[]) => void;
  setTooltipPosition: (pos: [number, number]) => void;
  setShowMeasureTooltip: (show: boolean) => void;
  bounds?: [number, number][] | undefined;
  calculateTotalDistance: (points: [number, number][]) => number;
  calculateArea: (points: [number, number][]) => number;
  formatDistance: (meters: number) => string;
  formatArea: (squareMeters: number) => string;
}

const MapEvents: React.FC<MapEventsProps> = ({
  toolMode,
  measurePoints,
  setMeasurePoints,
  setMeasureResult,
  currentDrawing,
  setCurrentDrawing,
  drawFeatures,
  setDrawFeatures,
  setTooltipPosition,
  setShowMeasureTooltip,
  bounds,
  calculateTotalDistance,
  calculateArea,
  formatDistance,
  formatArea,
}) => {
  const map = useMap();

  // Fit bounds on mount or bounds change
  useEffect(() => {
    if (bounds && bounds.length >= 2) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, bounds]);

  useMapEvents({
    click: (e) => {
      const latlng = e.latlng;
      const point: [number, number] = [latlng.lat, latlng.lng];

      if (toolMode === 'measure-distance') {
        const newPoints = [...measurePoints, point];
        setMeasurePoints(newPoints);
        if (newPoints.length >= 2) {
          const totalDistance = calculateTotalDistance(newPoints);
          setMeasureResult(`距离: ${formatDistance(totalDistance)}`);
        }
      } else if (toolMode === 'measure-area') {
        const newPoints = [...measurePoints, point];
        setMeasurePoints(newPoints);
        if (newPoints.length >= 3) {
          const area = calculateArea(newPoints);
          setMeasureResult(`面积: ${formatArea(area)}`);
        }
      } else if (toolMode === 'draw-point') {
        const newFeature: DrawFeature = {
          id: `point-${Date.now()}`,
          type: 'point',
          points: [{ lat: point[0], lng: point[1], timestamp: Date.now() }],
          color: 'error.main',
        };
        setDrawFeatures([...drawFeatures, newFeature]);
      } else if (toolMode === 'draw-line') {
        if (!currentDrawing) {
          setCurrentDrawing({
            id: `line-${Date.now()}`,
            type: 'line',
            points: [{ lat: point[0], lng: point[1] }],
            color: 'primary.main',
          });
        } else {
          const updatedDrawing = {
            ...currentDrawing,
            points: [...currentDrawing.points, { lat: point[0], lng: point[1] }],
          };
          setCurrentDrawing(updatedDrawing);
        }
      } else if (toolMode === 'draw-polygon') {
        if (!currentDrawing) {
          setCurrentDrawing({
            id: `polygon-${Date.now()}`,
            type: 'polygon',
            points: [{ lat: point[0], lng: point[1] }],
            color: 'success.main',
          });
        } else {
          const updatedDrawing = {
            ...currentDrawing,
            points: [...currentDrawing.points, { lat: point[0], lng: point[1] }],
          };
          setCurrentDrawing(updatedDrawing);
        }
      }
    },
    mousemove: (e) => {
      if (
        (toolMode === 'measure-distance' || toolMode === 'measure-area') &&
        measurePoints.length > 0
      ) {
        const latlng = e.latlng;
        setTooltipPosition([latlng.lat, latlng.lng]);
        setShowMeasureTooltip(true);

        const tempPoints: [number, number][] = [...measurePoints, [latlng.lat, latlng.lng]];
        if (toolMode === 'measure-distance') {
          const totalDistance = calculateTotalDistance(tempPoints);
          setMeasureResult(`距离: ${formatDistance(totalDistance)}`);
        } else if (toolMode === 'measure-area' && tempPoints.length >= 3) {
          const area = calculateArea(tempPoints);
          setMeasureResult(`面积: ${formatArea(area)}`);
        }
      } else {
        setShowMeasureTooltip(false);
      }
    },
  });

  return null;
};

export default MapEvents;
