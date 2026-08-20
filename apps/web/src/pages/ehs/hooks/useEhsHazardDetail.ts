/**
 * @done V80 split
 * EHS Hazard detail page centralized state, queries, mutations, and handlers.
 *
 * Column definitions live in the consuming components (they need i18n + handlers).
 */
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiLogger } from '@/utils/logger';
import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';
import { ehsApi } from '@/api/ehs';
import type { Hazard, RiskAssessment, ControlMeasure, SafetyHazard } from '@/api/ehs';
import { useNotification } from '@/hooks/useNotification';

export interface ControlFormData {
  measure_type: 'engineering' | 'administrative' | 'ppe';
  description: string;
  responsible: string;
  deadline: string;
}

export interface HazardFormData {
  name: string;
  description: string;
  category: string;
  location: string;
  severity: 'high' | 'medium' | 'low';
  exposure: 'high' | 'medium' | 'low';
  likelihood: 'high' | 'medium' | 'low';
  status: 'active' | 'controlled' | 'eliminated' | 'archived';
}

interface UseEhsHazardDetailResult {
  // page state
  loading: boolean;
  errorMessage: string | undefined;

  // data
  hazard: Hazard | null;
  assessments: RiskAssessment[];
  controls: ControlMeasure[];

  // modal state
  showEditModal: boolean;
  setShowEditModal: (open: boolean) => void;
  showControlModal: boolean;
  setShowControlModal: (open: boolean) => void;
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (open: boolean) => void;
  deletingMeasureId: string | null;
  setDeletingMeasureId: (id: string | null) => void;

  // form state
  formData: HazardFormData;
  setFormData: React.Dispatch<React.SetStateAction<HazardFormData>>;
  controlFormData: ControlFormData;
  setControlFormData: React.Dispatch<React.SetStateAction<ControlFormData>>;

  // actions
  handleUpdateHazard: () => void;
  handleAddControl: () => void;
  handleDeleteControl: (measureId: string) => void;
  confirmDeleteControl: () => void;
}

const SEVERITY_KEY_MAP: Record<'high' | 'medium' | 'low', string> = {
  high: 'text_4296d7',
  medium: 'text_aed1df',
  low: 'text_19ac67',
};

const initialFormData: HazardFormData = {
  name: '',
  description: '',
  category: '',
  location: '',
  severity: 'medium',
  exposure: 'medium',
  likelihood: 'medium',
  status: 'active',
};

const initialControlFormData: ControlFormData = {
  measure_type: 'engineering',
  description: '',
  responsible: '',
  deadline: '',
};

export const useEhsHazardDetail = (id: string | undefined): UseEhsHazardDetailResult => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showControlModal, setShowControlModal] = useState(false);
  const [formData, setFormData] = useState<HazardFormData>(initialFormData);
  const [controlFormData, setControlFormData] = useState<ControlFormData>(initialControlFormData);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingMeasureId, setDeletingMeasureId] = useState<string | null>(null);

  const {
    data: hazard,
    isPending: hazardLoading,
    error: hazardQueryError,
  } = useQuery({
    queryKey: QUERY_KEYS.EHS.HAZARD(id || ''),
    enabled: !!id,
    queryFn: async () => {
      const response = await ehsApi.getHazard(id!);
      if (response.success && response.data) {
        const safetyHazard = response.data as unknown as SafetyHazard;
        const hazardData: Hazard = {
          id: safetyHazard.id,
          name: safetyHazard.name,
          description: safetyHazard.description,
          category: safetyHazard.category,
          location: safetyHazard.location,
          severity: safetyHazard.level?.includes(t('ehs.ehs_hazard_detail_page.text_4296d7'))
            ? 'high'
            : safetyHazard.level?.includes(t('ehs.ehs_hazard_detail_page.text_5a558d'))
              ? 'high'
              : safetyHazard.level?.includes(t('ehs.ehs_hazard_detail_page.text_aed1df'))
                ? 'medium'
                : 'low',
          exposure: 'medium',
          likelihood: 'medium',
          status:
            safetyHazard.status === 'identified'
              ? 'active'
              : safetyHazard.status === 'controlled'
                ? 'controlled'
                : safetyHazard.status === 'eliminated'
                  ? 'eliminated'
                  : 'archived',
          created_at: safetyHazard.created_at,
          updated_at: safetyHazard.updated_at,
        };
        return hazardData;
      }
      throw new Error(response.message || t('ehs.ehs_hazard_detail_page.detail'));
    },

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const { data: assessmentsData } = useQuery({
    queryKey: QUERY_KEYS.EHS.HAZARD_RISK_ASSESSMENTS(id || ''),
    enabled: !!id,
    queryFn: async () => {
      const response = await ehsApi.listRiskAssessments(id!);
      if (response.success && response.data) {
        const data = response.data as unknown as Record<string, unknown>;
        return Array.isArray(data) ? data : data.data || data.assessments || [];
      }
      return [];
    },

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
  const assessments = (assessmentsData as RiskAssessment[]) || [];

  const { data: controlsData } = useQuery({
    queryKey: QUERY_KEYS.EHS.HAZARD_CONTROL_MEASURES(id || ''),
    enabled: !!id,
    queryFn: async () => {
      const response = await ehsApi.listControlMeasures(id!);
      if (response.success && response.data) {
        const data = response.data as unknown as Record<string, unknown>;
        return Array.isArray(data) ? data : data.data || data.measures || [];
      }
      return [];
    },

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
  const controls = (controlsData as ControlMeasure[]) || [];

  const loading = hazardLoading;
  const errorMessage = hazardQueryError ? t('ehs.ehs_hazard_detail_page.detail') : undefined;

  useEffect(() => {
    if (hazard) {
      setFormData({
        name: hazard.name || '',
        description: hazard.description || '',
        category: hazard.category || '',
        location: hazard.location || '',
        severity: hazard.severity || 'medium',
        exposure: hazard.exposure || 'medium',
        likelihood: hazard.likelihood || 'medium',
        status: hazard.status || 'active',
      });
    }
  }, [hazard]);

  const updateHazardMutation = useMutation({
    mutationFn: (variables: { id: string; data: Parameters<typeof ehsApi.updateHazard>[1] }) =>
      ehsApi.updateHazard(variables.id, variables.data),
    onSuccess: () => {
      success(t('ehs.ehs_hazard_detail_page.update'));
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.EHS.HAZARD(id || ''),
        exact: false,
        refetchType: 'active',
      });
      setShowEditModal(false);
    },
    onError: (err: unknown) => {
      apiLogger.error(t('ehs.ehs_hazard_detail_page.update_1'), err);
      error(t('ehs.ehs_hazard_detail_page.update_2'));
    },
  });

  const handleUpdateHazard = () => {
    if (!hazard) return;
    if (!formData.name.trim()) {
      error(t('ehs.ehs_hazard_detail_page.please_input'));
      return;
    }
    updateHazardMutation.mutate({
      id: hazard.id,
      data: {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        location: formData.location,
        level: t(`ehs.ehs_hazard_detail_page.${SEVERITY_KEY_MAP[formData.severity]}`),
        status: formData.status,
      },
    });
  };

  const createControlMutation = useMutation({
    mutationFn: (variables: {
      hazardId: string;
      data: Parameters<typeof ehsApi.createControlMeasure>[1];
    }) => ehsApi.createControlMeasure(variables.hazardId, variables.data),
    onSuccess: () => {
      success(t('ehs.ehs_hazard_detail_page.success'));
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.EHS.HAZARD_CONTROL_MEASURES(id || ''),
        exact: false,
        refetchType: 'active',
      });
      setShowControlModal(false);
      setControlFormData({ ...initialControlFormData });
    },
    onError: (err: unknown) => {
      apiLogger.error(t('ehs.ehs_hazard_detail_page.fail'), err);
      error(t('ehs.ehs_hazard_detail_page.fail_1'));
    },
  });

  const handleAddControl = () => {
    if (!hazard) return;
    if (!controlFormData.description.trim()) {
      error(t('ehs.ehs_hazard_detail_page.please_input_1'));
      return;
    }
    createControlMutation.mutate({
      hazardId: hazard.id,
      data: {
        measure_type: controlFormData.measure_type,
        description: controlFormData.description,
        responsible: controlFormData.responsible || null,
        deadline: controlFormData.deadline || null,
        status: 'pending',
      },
    });
  };

  const handleDeleteControl = (measureId: string) => {
    setDeletingMeasureId(measureId);
    setDeleteDialogOpen(true);
  };

  const deleteControlMutation = useMutation({
    mutationFn: (variables: { hazardId: string; measureId: string }) =>
      ehsApi.deleteControlMeasure(variables.hazardId, variables.measureId),
    onSuccess: () => {
      success(t('ehs.ehs_hazard_detail_page.delete_success'));
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.EHS.HAZARD_CONTROL_MEASURES(id || ''),
        exact: false,
        refetchType: 'active',
      });
      setDeleteDialogOpen(false);
      setDeletingMeasureId(null);
    },
    onError: (err: unknown) => {
      apiLogger.error(t('ehs.ehs_hazard_detail_page.delete'), err);
      error(t('ehs.ehs_hazard_detail_page.delete_1'));
      setDeleteDialogOpen(false);
      setDeletingMeasureId(null);
    },
  });

  const confirmDeleteControl = () => {
    if (!hazard || !deletingMeasureId) return;
    deleteControlMutation.mutate({ hazardId: hazard.id, measureId: deletingMeasureId });
  };

  return {
    loading,
    errorMessage,
    hazard: hazard ?? null,
    assessments,
    controls,
    showEditModal,
    setShowEditModal,
    showControlModal,
    setShowControlModal,
    deleteDialogOpen,
    setDeleteDialogOpen,
    deletingMeasureId,
    setDeletingMeasureId,
    formData,
    setFormData,
    controlFormData,
    setControlFormData,
    handleUpdateHazard,
    handleAddControl,
    handleDeleteControl,
    confirmDeleteControl,
  };
};
