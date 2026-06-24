import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import type {
  DevicePoint,
  Pipeline,
  StorageLocation,
  EvidenceRecord,
  FactoryMap,
  BusinessLocation,
  GisStatistics,
} from '../api/gis';
import { gisApi } from '../api/gis';
import { logger } from '@/utils/logger';

type GisState = {
  devicePoints: DevicePoint[];
  pipelines: Pipeline[];
  storageLocations: StorageLocation[];
  evidenceRecords: EvidenceRecord[];
  factoryMaps: FactoryMap[];
  businessLocations: BusinessLocation[];
  statistics: GisStatistics | null;
  loading: boolean;
  error: string | null;
  activeTab: string;
  cacheTimestamp: number | null;
};

type GisAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_STATISTICS'; payload: GisStatistics }
  | { type: 'SET_DEVICE_POINTS'; payload: DevicePoint[] }
  | { type: 'SET_PIPELINES'; payload: Pipeline[] }
  | { type: 'SET_STORAGE_LOCATIONS'; payload: StorageLocation[] }
  | { type: 'SET_EVIDENCE_RECORDS'; payload: EvidenceRecord[] }
  | { type: 'SET_FACTORY_MAPS'; payload: FactoryMap[] }
  | { type: 'SET_BUSINESS_LOCATIONS'; payload: BusinessLocation[] }
  | { type: 'ADD_DEVICE_POINT'; payload: DevicePoint }
  | { type: 'UPDATE_DEVICE_POINT'; payload: DevicePoint }
  | { type: 'DELETE_DEVICE_POINT'; payload: string }
  | { type: 'ADD_PIPELINE'; payload: Pipeline }
  | { type: 'UPDATE_PIPELINE'; payload: Pipeline }
  | { type: 'DELETE_PIPELINE'; payload: string }
  | { type: 'ADD_STORAGE_LOCATION'; payload: StorageLocation }
  | { type: 'UPDATE_STORAGE_LOCATION'; payload: StorageLocation }
  | { type: 'DELETE_STORAGE_LOCATION'; payload: string }
  | { type: 'ADD_EVIDENCE_RECORD'; payload: EvidenceRecord }
  | { type: 'DELETE_EVIDENCE_RECORD'; payload: string }
  | { type: 'ADD_FACTORY_MAP'; payload: FactoryMap }
  | { type: 'UPDATE_FACTORY_MAP'; payload: FactoryMap }
  | { type: 'DELETE_FACTORY_MAP'; payload: string }
  | { type: 'ADD_BUSINESS_LOCATION'; payload: BusinessLocation }
  | { type: 'UPDATE_BUSINESS_LOCATION'; payload: BusinessLocation }
  | { type: 'DELETE_BUSINESS_LOCATION'; payload: string }
  | { type: 'SET_ACTIVE_TAB'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_CACHE_TIMESTAMP'; payload: number }
  | { type: 'CLEAR_CACHE' };

const initialState: GisState = {
  devicePoints: [],
  pipelines: [],
  storageLocations: [],
  evidenceRecords: [],
  factoryMaps: [],
  businessLocations: [],
  statistics: null,
  loading: false,
  error: null,
  activeTab: 'devicePoints',
  cacheTimestamp: null,
};

const CACHE_KEY = 'gis_data_cache';
const CACHE_TTL = 5 * 60 * 1000;

function gisReducer(state: GisState, action: GisAction): GisState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'SET_STATISTICS':
      return { ...state, statistics: action.payload };
    case 'SET_DEVICE_POINTS':
      return { ...state, devicePoints: action.payload };
    case 'SET_PIPELINES':
      return { ...state, pipelines: action.payload };
    case 'SET_STORAGE_LOCATIONS':
      return { ...state, storageLocations: action.payload };
    case 'SET_EVIDENCE_RECORDS':
      return { ...state, evidenceRecords: action.payload };
    case 'SET_FACTORY_MAPS':
      return { ...state, factoryMaps: action.payload };
    case 'SET_BUSINESS_LOCATIONS':
      return { ...state, businessLocations: action.payload };
    case 'ADD_DEVICE_POINT':
      return {
        ...state,
        devicePoints: [action.payload, ...state.devicePoints],
      };
    case 'UPDATE_DEVICE_POINT':
      return {
        ...state,
        devicePoints: state.devicePoints.map((p) =>
          p.id === action.payload.id ? action.payload : p
        ),
      };
    case 'DELETE_DEVICE_POINT':
      return {
        ...state,
        devicePoints: state.devicePoints.filter((p) => p.id !== action.payload),
      };
    case 'ADD_PIPELINE':
      return { ...state, pipelines: [action.payload, ...state.pipelines] };
    case 'UPDATE_PIPELINE':
      return {
        ...state,
        pipelines: state.pipelines.map((p) => (p.id === action.payload.id ? action.payload : p)),
      };
    case 'DELETE_PIPELINE':
      return {
        ...state,
        pipelines: state.pipelines.filter((p) => p.id !== action.payload),
      };
    case 'ADD_STORAGE_LOCATION':
      return {
        ...state,
        storageLocations: [action.payload, ...state.storageLocations],
      };
    case 'UPDATE_STORAGE_LOCATION':
      return {
        ...state,
        storageLocations: state.storageLocations.map((s) =>
          s.id === action.payload.id ? action.payload : s
        ),
      };
    case 'DELETE_STORAGE_LOCATION':
      return {
        ...state,
        storageLocations: state.storageLocations.filter((s) => s.id !== action.payload),
      };
    case 'ADD_EVIDENCE_RECORD':
      return {
        ...state,
        evidenceRecords: [action.payload, ...state.evidenceRecords],
      };
    case 'DELETE_EVIDENCE_RECORD':
      return {
        ...state,
        evidenceRecords: state.evidenceRecords.filter((e) => e.id !== action.payload),
      };
    case 'ADD_FACTORY_MAP':
      return { ...state, factoryMaps: [action.payload, ...state.factoryMaps] };
    case 'UPDATE_FACTORY_MAP':
      return {
        ...state,
        factoryMaps: state.factoryMaps.map((m) =>
          m.id === action.payload.id ? action.payload : m
        ),
      };
    case 'DELETE_FACTORY_MAP':
      return {
        ...state,
        factoryMaps: state.factoryMaps.filter((m) => m.id !== action.payload),
      };
    case 'ADD_BUSINESS_LOCATION':
      return {
        ...state,
        businessLocations: [action.payload, ...state.businessLocations],
      };
    case 'UPDATE_BUSINESS_LOCATION':
      return {
        ...state,
        businessLocations: state.businessLocations.map((b) =>
          b.id === action.payload.id ? action.payload : b
        ),
      };
    case 'DELETE_BUSINESS_LOCATION':
      return {
        ...state,
        businessLocations: state.businessLocations.filter((b) => b.id !== action.payload),
      };
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };
    case 'SET_CACHE_TIMESTAMP':
      return { ...state, cacheTimestamp: action.payload };
    case 'CLEAR_CACHE':
      return {
        ...state,
        devicePoints: [],
        pipelines: [],
        storageLocations: [],
        evidenceRecords: [],
        factoryMaps: [],
        businessLocations: [],
        statistics: null,
        cacheTimestamp: null,
      };
    default:
      return state;
  }
}

interface GisContextType {
  state: GisState;
  loadAllData: (forceRefresh?: boolean) => Promise<void>;
  createDevicePoint: (data: any) => Promise<void>;
  updateDevicePoint: (id: string, data: any) => Promise<void>;
  deleteDevicePoint: (id: string) => Promise<void>;
  createPipeline: (data: any) => Promise<void>;
  updatePipeline: (id: string, data: any) => Promise<void>;
  deletePipeline: (id: string) => Promise<void>;
  createStorageLocation: (data: any) => Promise<void>;
  updateStorageLocation: (id: string, data: any) => Promise<void>;
  deleteStorageLocation: (id: string) => Promise<void>;
  createEvidenceRecord: (data: any) => Promise<void>;
  deleteEvidenceRecord: (id: string) => Promise<void>;
  createFactoryMap: (data: any) => Promise<void>;
  updateFactoryMap: (id: string, data: any) => Promise<void>;
  deleteFactoryMap: (id: string) => Promise<void>;
  createBusinessLocation: (data: any) => Promise<void>;
  updateBusinessLocation: (id: string, data: any) => Promise<void>;
  deleteBusinessLocation: (id: string) => Promise<void>;
  setActiveTab: (tab: string) => void;
  clearError: () => void;
  clearCache: () => void;
}

const GisContext = createContext<GisContextType | undefined>(undefined);

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    if (error.message.includes('Network Error') || error.message.includes('Failed to fetch')) {
      return '网络连接失败，请检查网络设置';
    }
    if (error.message.includes('timeout')) {
      return '请求超时，请稍后重试';
    }
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return '未知错误，请稍后重试';
};

const saveCache = (state: GisState) => {
  try {
    const cacheData = {
      devicePoints: state.devicePoints,
      pipelines: state.pipelines,
      storageLocations: state.storageLocations,
      evidenceRecords: state.evidenceRecords,
      factoryMaps: state.factoryMaps,
      businessLocations: state.businessLocations,
      statistics: state.statistics,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (e) {
    logger.warn('Failed to save cache:', e);
  }
};

const loadCache = (): Partial<GisState> | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const cacheData = JSON.parse(cached);
    if (!cacheData.timestamp) return null;
    if (Date.now() - cacheData.timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return {
      devicePoints: cacheData.devicePoints || [],
      pipelines: cacheData.pipelines || [],
      storageLocations: cacheData.storageLocations || [],
      evidenceRecords: cacheData.evidenceRecords || [],
      factoryMaps: cacheData.factoryMaps || [],
      businessLocations: cacheData.businessLocations || [],
      statistics: cacheData.statistics || null,
      cacheTimestamp: cacheData.timestamp,
    };
  } catch (e) {
    logger.warn('Failed to load cache:', e);
    return null;
  }
};

export const GisProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gisReducer, initialState);
  const loadingRef = useRef(false);

  const setLoading = useCallback((loading: boolean) => {
    loadingRef.current = loading;
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const loadAllData = useCallback(
    async (forceRefresh = false) => {
      if (loadingRef.current) return;

      setLoading(true);
      setError(null);

      try {
        if (!forceRefresh) {
          const cachedData = loadCache();
          if (cachedData) {
            dispatch({
              type: 'SET_DEVICE_POINTS',
              payload: cachedData.devicePoints || [],
            });
            dispatch({
              type: 'SET_PIPELINES',
              payload: cachedData.pipelines || [],
            });
            dispatch({
              type: 'SET_STORAGE_LOCATIONS',
              payload: cachedData.storageLocations || [],
            });
            dispatch({
              type: 'SET_EVIDENCE_RECORDS',
              payload: cachedData.evidenceRecords || [],
            });
            dispatch({
              type: 'SET_FACTORY_MAPS',
              payload: cachedData.factoryMaps || [],
            });
            dispatch({
              type: 'SET_BUSINESS_LOCATIONS',
              payload: cachedData.businessLocations || [],
            });
            if (cachedData.statistics) {
              dispatch({
                type: 'SET_STATISTICS',
                payload: cachedData.statistics,
              });
            }
            if (cachedData.cacheTimestamp) {
              dispatch({
                type: 'SET_CACHE_TIMESTAMP',
                payload: cachedData.cacheTimestamp,
              });
            }
          }
        }

        const [statsRes, devicesRes, pipelinesRes, storageRes, evidenceRes, mapsRes, businessRes] =
          await Promise.all([
            gisApi.getStatistics(),
            gisApi.listDevicePoints(),
            gisApi.listPipelines(),
            gisApi.listStorageLocations(),
            gisApi.listEvidenceRecords(),
            gisApi.listFactoryMaps(),
            gisApi.listBusinessLocations(),
          ]);

        const extractData = (res: any) => {
          if (!res.success || !res.data) return [];
          if (Array.isArray(res.data)) return res.data;
          if (res.data.data && Array.isArray(res.data.data)) return res.data.data;
          const keys = Object.keys(res.data);
          for (const key of keys) {
            if (Array.isArray(res.data[key])) return res.data[key];
          }
          return [];
        };

        const newData = {
          devicePoints: extractData(devicesRes),
          pipelines: extractData(pipelinesRes),
          storageLocations: extractData(storageRes),
          evidenceRecords: extractData(evidenceRes),
          factoryMaps: extractData(mapsRes),
          businessLocations: extractData(businessRes),
          statistics: statsRes.success ? statsRes.data : null,
          timestamp: Date.now(),
        };

        if (newData.statistics) {
          dispatch({ type: 'SET_STATISTICS', payload: newData.statistics });
        }

        dispatch({ type: 'SET_DEVICE_POINTS', payload: newData.devicePoints });
        dispatch({ type: 'SET_PIPELINES', payload: newData.pipelines });
        dispatch({
          type: 'SET_STORAGE_LOCATIONS',
          payload: newData.storageLocations,
        });
        dispatch({
          type: 'SET_EVIDENCE_RECORDS',
          payload: newData.evidenceRecords,
        });
        dispatch({ type: 'SET_FACTORY_MAPS', payload: newData.factoryMaps });
        dispatch({
          type: 'SET_BUSINESS_LOCATIONS',
          payload: newData.businessLocations,
        });
        dispatch({ type: 'SET_CACHE_TIMESTAMP', payload: newData.timestamp });

        setTimeout(() => {
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(newData));
          } catch (e) {
            logger.warn('Failed to save cache:', e);
          }
        }, 100);
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        setError(errorMessage);
        logger.error('加载GIS数据失败:', err);
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError]
  );

  const createDevicePoint = useCallback(
    async (data: any) => {
      try {
        const res = await gisApi.createDevicePoint(data);
        if (res.success && res.data) {
          dispatch({ type: 'ADD_DEVICE_POINT', payload: res.data });
          await loadAllData();
        } else {
          throw new Error(res.message || '创建失败');
        }
      } catch (err) {
        setError(`创建设备点位失败: ${getErrorMessage(err)}`);
        throw err;
      }
    },
    [setError, loadAllData]
  );

  const updateDevicePoint = useCallback(
    async (id: string, data: any) => {
      try {
        const res = await gisApi.updateDevicePoint(id, data);
        if (res.success && res.data) {
          dispatch({ type: 'UPDATE_DEVICE_POINT', payload: res.data });
          await loadAllData();
        } else {
          throw new Error(res.message || '更新失败');
        }
      } catch (err) {
        setError(`更新设备点位失败: ${getErrorMessage(err)}`);
        throw err;
      }
    },
    [setError, loadAllData]
  );

  const deleteDevicePoint = useCallback(
    async (id: string) => {
      try {
        const res = await gisApi.deleteDevicePoint(id);
        if (res.success) {
          dispatch({ type: 'DELETE_DEVICE_POINT', payload: id });
          await loadAllData();
        } else {
          throw new Error(res.message || '删除失败');
        }
      } catch (err) {
        setError(`删除设备点位失败: ${getErrorMessage(err)}`);
        throw err;
      }
    },
    [setError, loadAllData]
  );

  const createPipeline = useCallback(
    async (data: any) => {
      try {
        const res = await gisApi.createPipeline(data);
        if (res.success && res.data) {
          dispatch({ type: 'ADD_PIPELINE', payload: res.data });
          await loadAllData();
        } else {
          throw new Error(res.message || '创建失败');
        }
      } catch (err) {
        setError(`创建管线失败: ${getErrorMessage(err)}`);
        throw err;
      }
    },
    [setError, loadAllData]
  );

  const updatePipeline = useCallback(
    async (id: string, data: any) => {
      try {
        const res = await gisApi.updatePipeline(id, data);
        if (res.success && res.data) {
          dispatch({ type: 'UPDATE_PIPELINE', payload: res.data });
          await loadAllData();
        } else {
          throw new Error(res.message || '更新失败');
        }
      } catch (err) {
        setError(`更新管线失败: ${getErrorMessage(err)}`);
        throw err;
      }
    },
    [setError, loadAllData]
  );

  const deletePipeline = useCallback(
    async (id: string) => {
      try {
        const res = await gisApi.deletePipeline(id);
        if (res.success) {
          dispatch({ type: 'DELETE_PIPELINE', payload: id });
          await loadAllData();
        } else {
          throw new Error(res.message || '删除失败');
        }
      } catch (err) {
        setError(`删除管线失败: ${getErrorMessage(err)}`);
        throw err;
      }
    },
    [setError, loadAllData]
  );

  const createStorageLocation = useCallback(
    async (data: any) => {
      try {
        const res = await gisApi.createStorageLocation(data);
        if (res.success && res.data) {
          dispatch({ type: 'ADD_STORAGE_LOCATION', payload: res.data });
          await loadAllData();
        } else {
          throw new Error(res.message || '创建失败');
        }
      } catch (err) {
        setError(`创建仓储位置失败: ${getErrorMessage(err)}`);
        throw err;
      }
    },
    [setError, loadAllData]
  );

  const updateStorageLocation = useCallback(
    async (id: string, data: any) => {
      try {
        const res = await gisApi.updateStorageLocation(id, data);
        if (res.success && res.data) {
          dispatch({ type: 'UPDATE_STORAGE_LOCATION', payload: res.data });
          await loadAllData();
        } else {
          throw new Error(res.message || '更新失败');
        }
      } catch (err) {
        setError(`更新仓储位置失败: ${getErrorMessage(err)}`);
        throw err;
      }
    },
    [setError, loadAllData]
  );

  const deleteStorageLocation = useCallback(
    async (id: string) => {
      try {
        const res = await gisApi.deleteStorageLocation(id);
        if (res.success) {
          dispatch({ type: 'DELETE_STORAGE_LOCATION', payload: id });
          await loadAllData();
        } else {
          throw new Error(res.message || '删除失败');
        }
      } catch (err) {
        setError(`删除仓储位置失败: ${getErrorMessage(err)}`);
        throw err;
      }
    },
    [setError, loadAllData]
  );

  const createEvidenceRecord = useCallback(
    async (data: any) => {
      try {
        const res = await gisApi.createEvidenceRecord(data);
        if (res.success && res.data) {
          dispatch({ type: 'ADD_EVIDENCE_RECORD', payload: res.data });
          await loadAllData();
        } else {
          throw new Error(res.message || '创建失败');
        }
      } catch (err) {
        setError(`创建现场取证失败: ${getErrorMessage(err)}`);
        throw err;
      }
    },
    [setError, loadAllData]
  );

  const deleteEvidenceRecord = useCallback(
    async (id: string) => {
      try {
        const res = await gisApi.deleteEvidenceRecord(id);
        if (res.success) {
          dispatch({ type: 'DELETE_EVIDENCE_RECORD', payload: id });
          await loadAllData();
        } else {
          throw new Error(res.message || '删除失败');
        }
      } catch (err) {
        setError(`删除现场取证失败: ${getErrorMessage(err)}`);
        throw err;
      }
    },
    [setError, loadAllData]
  );

  const createFactoryMap = useCallback(
    async (data: any) => {
      try {
        const res = await gisApi.createFactoryMap(data);
        if (res.success && res.data) {
          dispatch({ type: 'ADD_FACTORY_MAP', payload: res.data });
          await loadAllData();
        } else {
          throw new Error(res.message || '创建失败');
        }
      } catch (err) {
        setError(`创建厂区地图失败: ${getErrorMessage(err)}`);
        throw err;
      }
    },
    [setError, loadAllData]
  );

  const updateFactoryMap = useCallback(
    async (id: string, data: any) => {
      try {
        const res = await gisApi.updateFactoryMap(id, data);
        if (res.success && res.data) {
          dispatch({ type: 'UPDATE_FACTORY_MAP', payload: res.data });
          await loadAllData();
        } else {
          throw new Error(res.message || '更新失败');
        }
      } catch (err) {
        setError(`更新厂区地图失败: ${getErrorMessage(err)}`);
        throw err;
      }
    },
    [setError, loadAllData]
  );

  const deleteFactoryMap = useCallback(
    async (id: string) => {
      try {
        const res = await gisApi.deleteFactoryMap(id);
        if (res.success) {
          dispatch({ type: 'DELETE_FACTORY_MAP', payload: id });
          await loadAllData();
        } else {
          throw new Error(res.message || '删除失败');
        }
      } catch (err) {
        setError(`删除厂区地图失败: ${getErrorMessage(err)}`);
        throw err;
      }
    },
    [setError, loadAllData]
  );

  const createBusinessLocation = useCallback(
    async (data: any) => {
      try {
        const res = await gisApi.createBusinessLocation(data);
        if (res.success && res.data) {
          dispatch({ type: 'ADD_BUSINESS_LOCATION', payload: res.data });
          await loadAllData();
        } else {
          throw new Error(res.message || '创建失败');
        }
      } catch (err) {
        setError(`创建业务位置失败: ${getErrorMessage(err)}`);
        throw err;
      }
    },
    [setError, loadAllData]
  );

  const updateBusinessLocation = useCallback(
    async (id: string, data: any) => {
      try {
        const res = await gisApi.updateBusinessLocation(id, data);
        if (res.success && res.data) {
          dispatch({ type: 'UPDATE_BUSINESS_LOCATION', payload: res.data });
          await loadAllData();
        } else {
          throw new Error(res.message || '更新失败');
        }
      } catch (err) {
        setError(`更新业务位置失败: ${getErrorMessage(err)}`);
        throw err;
      }
    },
    [setError, loadAllData]
  );

  const deleteBusinessLocation = useCallback(
    async (id: string) => {
      try {
        const res = await gisApi.deleteBusinessLocation(id);
        if (res.success) {
          dispatch({ type: 'DELETE_BUSINESS_LOCATION', payload: id });
          await loadAllData();
        } else {
          throw new Error(res.message || '删除失败');
        }
      } catch (err) {
        setError(`删除业务位置失败: ${getErrorMessage(err)}`);
        throw err;
      }
    },
    [setError, loadAllData]
  );

  const setActiveTab = useCallback((tab: string) => {
    dispatch({ type: 'SET_ACTIVE_TAB', payload: tab });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const clearCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    dispatch({ type: 'CLEAR_CACHE' });
    loadAllData(true);
  }, [loadAllData]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  return (
    <GisContext.Provider
      value={{
        state,
        loadAllData,
        createDevicePoint,
        updateDevicePoint,
        deleteDevicePoint,
        createPipeline,
        updatePipeline,
        deletePipeline,
        createStorageLocation,
        updateStorageLocation,
        deleteStorageLocation,
        createEvidenceRecord,
        deleteEvidenceRecord,
        createFactoryMap,
        updateFactoryMap,
        deleteFactoryMap,
        createBusinessLocation,
        updateBusinessLocation,
        deleteBusinessLocation,
        setActiveTab,
        clearError,
        clearCache,
      }}
    >
      {children}
    </GisContext.Provider>
  );
};

export const useGis = () => {
  const context = useContext(GisContext);
  if (context === undefined) {
    throw new Error('useGis must be used within a GisProvider');
  }
  return context;
};
