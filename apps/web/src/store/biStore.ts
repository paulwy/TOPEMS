import { create } from 'zustand';
import { logger } from '@/utils/logger';
import {
  fetchSummaryDashboard,
  fetchDevelopmentAnalytics,
  fetchQualityAnalytics,
  fetchProductionAnalytics,
  fetchLaboratoryAnalytics,
  fetchRsProjectTimeline,
  fetchRsExperimentSuccessRate,
  fetchQmsQualityTrend,
  fetchPdmProductionTrend,
  type SummaryDashboard,
  type DevelopmentAnalytics,
  type QualityAnalytics,
  type ProductionAnalytics,
  type LaboratoryAnalytics,
} from '../api/bi';
import i18n from '@/i18n';

interface BIStore {
  // 数据状态
  summary: SummaryDashboard | null;
  development: DevelopmentAnalytics | null;
  quality: QualityAnalytics | null;
  production: ProductionAnalytics | null;
  laboratory: LaboratoryAnalytics | null;
  rsTimeline: unknown;
  rsSuccessRate: unknown;
  qmsTrend: unknown;
  pdmTrend: unknown;

  // 加载状态
  loading: boolean;
  refreshing: boolean;
  lastUpdated: Date | null;

  // 错误状态
  error: string | null;

  // 操作
  loadAllData: () => Promise<void>;
  refreshData: () => Promise<void>;
  clearError: () => void;
}

export const useBIStore = create<BIStore>((set, get) => ({
  summary: null,
  development: null,
  quality: null,
  production: null,
  laboratory: null,
  rsTimeline: null,
  rsSuccessRate: null,
  qmsTrend: null,
  pdmTrend: null,
  loading: true,
  refreshing: false,
  lastUpdated: null,
  error: null,

  loadAllData: async () => {
    set({ loading: true, error: null });
    try {
      const [
        summaryRes,
        devRes,
        qualityRes,
        prodRes,
        labRes,
        rsTimelineRes,
        rsSuccessRateRes,
        qmsTrendRes,
        pdmTrendRes,
      ] = await Promise.all([
        fetchSummaryDashboard(),
        fetchDevelopmentAnalytics(),
        fetchQualityAnalytics(),
        fetchProductionAnalytics(),
        fetchLaboratoryAnalytics(),
        fetchRsProjectTimeline(),
        fetchRsExperimentSuccessRate(),
        fetchQmsQualityTrend(),
        fetchPdmProductionTrend(),
      ]);

      const updates: Partial<BIStore> = {};

      if (summaryRes.success && summaryRes.data) {
        updates.summary = summaryRes.data;
      }
      if (devRes.success && devRes.data) {
        updates.development = devRes.data;
      }
      if (qualityRes.success && qualityRes.data) {
        updates.quality = qualityRes.data;
      }
      if (prodRes.success && prodRes.data) {
        updates.production = prodRes.data;
      }
      if (labRes.success && labRes.data) {
        updates.laboratory = labRes.data;
      }
      if (rsTimelineRes.success && rsTimelineRes.data) {
        updates.rsTimeline = rsTimelineRes.data;
      }
      if (rsSuccessRateRes.success && rsSuccessRateRes.data) {
        updates.rsSuccessRate = rsSuccessRateRes.data;
      }
      if (qmsTrendRes.success && qmsTrendRes.data) {
        updates.qmsTrend = qmsTrendRes.data;
      }
      if (pdmTrendRes.success && pdmTrendRes.data) {
        updates.pdmTrend = pdmTrendRes.data;
      }

      set({
        ...updates,
        loading: false,
        refreshing: false,
        lastUpdated: new Date(),
        error: null,
      });
    } catch (err: unknown) {
      logger.error('Failed to load BI data:', err);
      set({
        loading: false,
        refreshing: false,
        error: err instanceof Error ? err.message : i18n.t('store.bi_store.k0'),
      });
    }
  },

  refreshData: async () => {
    set({ refreshing: true, error: null });
    await get().loadAllData();
  },

  clearError: () => {
    set({ error: null });
  },
}));

const useBISummary = () => useBIStore((state) => state.summary);
const useBIDevelopment = () => useBIStore((state) => state.development);
const useBIQuality = () => useBIStore((state) => state.quality);
const useBIProduction = () => useBIStore((state) => state.production);
const useBILaboratory = () => useBIStore((state) => state.laboratory);
const useBILoading = () => useBIStore((state) => state.loading);
const useBIError = () => useBIStore((state) => state.error);
