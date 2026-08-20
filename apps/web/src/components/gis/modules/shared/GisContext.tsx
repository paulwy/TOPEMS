// modules/shared/GisContext.tsx
import React, { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { MapModuleConfig } from '../MapModule/types';
import type { TrackRecord } from '../TrackModule/types';
import type { EvidenceRecord } from '../EvidenceModule/types';
import type { SyncStatus, ToolMode, DrawFeature } from './types';

// State Interface
export interface GisState {
  // 地图状态
  mapConfig: MapModuleConfig;
  visibleLayers: {
    devices: boolean;
    pipelines: boolean;
    storage: boolean;
  };
  toolMode: ToolMode;
  mapType: 'osm' | 'amap';

  // 测量状态
  measurePoints: [number, number][];
  measureResult: string;

  // 绘制状态
  drawFeatures: DrawFeature[];
  currentDrawing: DrawFeature | null;

  // 轨迹状态
  activeTrack: TrackRecord | null;
  isPlaying: boolean;
  playbackSpeed: number;
  showTrackPanel: boolean;

  // 取证状态
  evidenceRecords: EvidenceRecord[];
  captureInProgress: boolean;
  showEvidencePanel: boolean;

  // 热力图状态
  showHeatmap: boolean;
  heatmapMode: 'density' | 'status';

  // 3D视图状态
  show3DView: boolean;

  // 离线状态
  offlineMode: boolean;
  syncStatus: SyncStatus | null;

  // UI状态
  showDetailsPanel: boolean;
  showLayerPanel: boolean;
  selectedItem: unknown;
}

// Action Types
type GisAction =
  | { type: 'SET_MAP_CONFIG'; payload: Partial<MapModuleConfig> }
  | { type: 'SET_MAP_TYPE'; payload: 'osm' | 'amap' }
  | { type: 'TOGGLE_LAYER'; payload: 'devices' | 'pipelines' | 'storage' }
  | {
      type: 'SET_LAYER_VISIBILITY';
      payload: { layer: 'devices' | 'pipelines' | 'storage'; visible: boolean };
    }
  | { type: 'SET_TOOL_MODE'; payload: ToolMode }
  | { type: 'SET_MEASURE_POINTS'; payload: [number, number][] }
  | { type: 'SET_MEASURE_RESULT'; payload: string }
  | { type: 'CLEAR_MEASURE' }
  | { type: 'ADD_DRAW_FEATURE'; payload: DrawFeature }
  | { type: 'SET_DRAW_FEATURES'; payload: DrawFeature[] }
  | { type: 'SET_CURRENT_DRAWING'; payload: DrawFeature | null }
  | { type: 'CLEAR_DRAWINGS' }
  | { type: 'SET_ACTIVE_TRACK'; payload: TrackRecord | null }
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'SET_PLAYBACK_SPEED'; payload: number }
  | { type: 'SET_SHOW_TRACK_PANEL'; payload: boolean }
  | { type: 'ADD_EVIDENCE'; payload: EvidenceRecord }
  | { type: 'SET_EVIDENCE_RECORDS'; payload: EvidenceRecord[] }
  | { type: 'SET_CAPTURE_IN_PROGRESS'; payload: boolean }
  | { type: 'SET_SHOW_EVIDENCE_PANEL'; payload: boolean }
  | { type: 'SET_SHOW_HEATMAP'; payload: boolean }
  | { type: 'SET_HEATMAP_MODE'; payload: 'density' | 'status' }
  | { type: 'SET_SHOW_3D_VIEW'; payload: boolean }
  | { type: 'SET_OFFLINE_MODE'; payload: boolean }
  | { type: 'SET_SYNC_STATUS'; payload: SyncStatus }
  | { type: 'SET_SHOW_DETAILS_PANEL'; payload: boolean }
  | { type: 'SET_SHOW_LAYER_PANEL'; payload: boolean }
  | { type: 'SET_SELECTED_ITEM'; payload: { item: unknown; show: boolean } };

// Initial State
const initialState: GisState = {
  mapConfig: {
    center: [31.2304, 121.4737],
    zoom: 14,
    tileSource: 'osm',
    offlineEnabled: false,
  },
  visibleLayers: {
    devices: true,
    pipelines: true,
    storage: true,
  },
  toolMode: 'select',
  mapType: 'osm',
  measurePoints: [],
  measureResult: '',
  drawFeatures: [],
  currentDrawing: null,
  activeTrack: null,
  isPlaying: false,
  playbackSpeed: 1,
  showTrackPanel: false,
  evidenceRecords: [],
  captureInProgress: false,
  showEvidencePanel: false,
  showHeatmap: false,
  heatmapMode: 'density',
  show3DView: false,
  offlineMode: false,
  syncStatus: null,
  showDetailsPanel: false,
  showLayerPanel: true,
  selectedItem: null,
};

// Reducer
export function gisReducer(state: GisState, action: GisAction): GisState {
  switch (action.type) {
    case 'SET_MAP_CONFIG':
      return { ...state, mapConfig: { ...state.mapConfig, ...action.payload } };
    case 'SET_MAP_TYPE':
      return { ...state, mapType: action.payload };
    case 'TOGGLE_LAYER':
      return {
        ...state,
        visibleLayers: {
          ...state.visibleLayers,
          [action.payload]: !state.visibleLayers[action.payload],
        },
      };
    case 'SET_LAYER_VISIBILITY':
      return {
        ...state,
        visibleLayers: {
          ...state.visibleLayers,
          [action.payload.layer]: action.payload.visible,
        },
      };
    case 'SET_TOOL_MODE':
      return { ...state, toolMode: action.payload };
    case 'SET_MEASURE_POINTS':
      return { ...state, measurePoints: action.payload };
    case 'SET_MEASURE_RESULT':
      return { ...state, measureResult: action.payload };
    case 'CLEAR_MEASURE':
      return { ...state, measurePoints: [], measureResult: '' };
    case 'ADD_DRAW_FEATURE':
      return {
        ...state,
        drawFeatures: [...state.drawFeatures, action.payload],
      };
    case 'SET_DRAW_FEATURES':
      return { ...state, drawFeatures: action.payload };
    case 'SET_CURRENT_DRAWING':
      return { ...state, currentDrawing: action.payload };
    case 'CLEAR_DRAWINGS':
      return { ...state, drawFeatures: [], currentDrawing: null };
    case 'SET_ACTIVE_TRACK':
      return { ...state, activeTrack: action.payload };
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload };
    case 'SET_PLAYBACK_SPEED':
      return { ...state, playbackSpeed: action.payload };
    case 'SET_SHOW_TRACK_PANEL':
      return { ...state, showTrackPanel: action.payload };
    case 'ADD_EVIDENCE':
      return {
        ...state,
        evidenceRecords: [...state.evidenceRecords, action.payload],
      };
    case 'SET_EVIDENCE_RECORDS':
      return { ...state, evidenceRecords: action.payload };
    case 'SET_CAPTURE_IN_PROGRESS':
      return { ...state, captureInProgress: action.payload };
    case 'SET_SHOW_EVIDENCE_PANEL':
      return { ...state, showEvidencePanel: action.payload };
    case 'SET_SHOW_HEATMAP':
      return { ...state, showHeatmap: action.payload };
    case 'SET_HEATMAP_MODE':
      return { ...state, heatmapMode: action.payload };
    case 'SET_SHOW_3D_VIEW':
      return { ...state, show3DView: action.payload };
    case 'SET_OFFLINE_MODE':
      return { ...state, offlineMode: action.payload };
    case 'SET_SYNC_STATUS':
      return { ...state, syncStatus: action.payload };
    case 'SET_SHOW_DETAILS_PANEL':
      return { ...state, showDetailsPanel: action.payload };
    case 'SET_SHOW_LAYER_PANEL':
      return { ...state, showLayerPanel: action.payload };
    case 'SET_SELECTED_ITEM':
      return {
        ...state,
        selectedItem: action.payload.item,
        showDetailsPanel: action.payload.show,
      };
    default:
      return state;
  }
}

// Context
interface GisContextValue {
  state: GisState;
  dispatch: React.Dispatch<GisAction>;
}

const GisContext = createContext<GisContextValue | null>(null);

// Provider
interface GisProviderProps {
  children: ReactNode;
  initialState?: Partial<GisState>;
}

function GisProvider({ children, initialState: customState }: GisProviderProps) {
  const [state, dispatch] = useReducer(gisReducer, {
    ...initialState,
    ...customState,
  });

  return <GisContext.Provider value={{ state, dispatch }}>{children}</GisContext.Provider>;
}

// Hook
export function useGisContext() {
  const context = useContext(GisContext);
  if (!context) {
    throw new Error('useGisContext must be used within a GisProvider');
  }
  return context;
}

export { GisContext };
