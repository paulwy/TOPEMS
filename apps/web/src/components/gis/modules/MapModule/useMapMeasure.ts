import { useState, useCallback } from 'react';

/**
 * MapView 测量状态管理 hook
 */
export function useMapMeasure() {
  const [measurePoints, setMeasurePoints] = useState<[number, number][]>([]);
  const [measureResult, setMeasureResult] = useState<string>('');
  const [showMeasureTooltip, setShowMeasureTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<[number, number]>([0, 0]);

  const startMeasure = useCallback(() => {
    setMeasurePoints([]);
    setMeasureResult('');
    setShowMeasureTooltip(true);
  }, []);

  const addMeasurePoint = useCallback((point: [number, number]) => {
    setMeasurePoints((prev) => [...prev, point]);
  }, []);

  const updateMeasureResult = useCallback((result: string) => {
    setMeasureResult(result);
  }, []);

  const updateTooltipPosition = useCallback((position: [number, number]) => {
    setTooltipPosition(position);
  }, []);

  const clearMeasure = useCallback(() => {
    setMeasurePoints([]);
    setMeasureResult('');
    setShowMeasureTooltip(false);
  }, []);

  return {
    measurePoints,
    setMeasurePoints,
    measureResult,
    setMeasureResult,
    showMeasureTooltip,
    setShowMeasureTooltip,
    tooltipPosition,
    setTooltipPosition,
    startMeasure,
    addMeasurePoint,
    updateMeasureResult,
    updateTooltipPosition,
    clearMeasure,
  };
}
