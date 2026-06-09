import axios from 'axios';
import type {
  ApiResponse,
  SafetyHazard,
  SafetyCheck,
  EmergencyPlan,
  DrillRecord,
  MonitoringPoint,
  EnvironmentalData,
  EnvironmentalAlert,
  HealthRecord,
  HealthCheckup,
  VaccinationRecord,
  SafetyIncident,
  RiskAssessment,
  RiskControl,
  TrainingProgram,
  TrainingRecord,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8051/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const safetyHazardApi = {
  list: async (): Promise<SafetyHazard[]> => {
    const response = await apiClient.get<ApiResponse<SafetyHazard[]>>('/safety-hazards');
    return response.data.data || [];
  },
  get: async (id: string): Promise<SafetyHazard> => {
    const response = await apiClient.get<ApiResponse<SafetyHazard>>(`/safety-hazards/${id}`);
    return response.data.data!;
  },
  create: async (data: Partial<SafetyHazard>): Promise<SafetyHazard> => {
    const response = await apiClient.post<ApiResponse<SafetyHazard>>('/safety-hazards', data);
    return response.data.data!;
  },
  update: async (id: string, data: Partial<SafetyHazard>): Promise<SafetyHazard> => {
    const response = await apiClient.put<ApiResponse<SafetyHazard>>(`/safety-hazards/${id}`, data);
    return response.data.data!;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/safety-hazards/${id}`);
  },
};

export const safetyCheckApi = {
  list: async (): Promise<SafetyCheck[]> => {
    const response = await apiClient.get<ApiResponse<SafetyCheck[]>>('/safety-checks');
    return response.data.data || [];
  },
  get: async (id: string): Promise<SafetyCheck> => {
    const response = await apiClient.get<ApiResponse<SafetyCheck>>(`/safety-checks/${id}`);
    return response.data.data!;
  },
  create: async (data: Partial<SafetyCheck>): Promise<SafetyCheck> => {
    const response = await apiClient.post<ApiResponse<SafetyCheck>>('/safety-checks', data);
    return response.data.data!;
  },
  update: async (id: string, data: Partial<SafetyCheck>): Promise<SafetyCheck> => {
    const response = await apiClient.put<ApiResponse<SafetyCheck>>(`/safety-checks/${id}`, data);
    return response.data.data!;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/safety-checks/${id}`);
  },
};

export const emergencyPlanApi = {
  list: async (): Promise<EmergencyPlan[]> => {
    const response = await apiClient.get<ApiResponse<EmergencyPlan[]>>('/emergency-plans');
    return response.data.data || [];
  },
  get: async (id: string): Promise<EmergencyPlan> => {
    const response = await apiClient.get<ApiResponse<EmergencyPlan>>(`/emergency-plans/${id}`);
    return response.data.data!;
  },
  create: async (data: Partial<EmergencyPlan>): Promise<EmergencyPlan> => {
    const response = await apiClient.post<ApiResponse<EmergencyPlan>>('/emergency-plans', data);
    return response.data.data!;
  },
  update: async (id: string, data: Partial<EmergencyPlan>): Promise<EmergencyPlan> => {
    const response = await apiClient.put<ApiResponse<EmergencyPlan>>(`/emergency-plans/${id}`, data);
    return response.data.data!;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/emergency-plans/${id}`);
  },
};

export const drillRecordApi = {
  list: async (): Promise<DrillRecord[]> => {
    const response = await apiClient.get<ApiResponse<DrillRecord[]>>('/drill-records');
    return response.data.data || [];
  },
  get: async (id: string): Promise<DrillRecord> => {
    const response = await apiClient.get<ApiResponse<DrillRecord>>(`/drill-records/${id}`);
    return response.data.data!;
  },
  create: async (data: Partial<DrillRecord>): Promise<DrillRecord> => {
    const response = await apiClient.post<ApiResponse<DrillRecord>>('/drill-records', data);
    return response.data.data!;
  },
  update: async (id: string, data: Partial<DrillRecord>): Promise<DrillRecord> => {
    const response = await apiClient.put<ApiResponse<DrillRecord>>(`/drill-records/${id}`, data);
    return response.data.data!;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/drill-records/${id}`);
  },
};

export const monitoringPointApi = {
  list: async (): Promise<MonitoringPoint[]> => {
    const response = await apiClient.get<ApiResponse<MonitoringPoint[]>>('/monitoring-points');
    return response.data.data || [];
  },
  get: async (id: string): Promise<MonitoringPoint> => {
    const response = await apiClient.get<ApiResponse<MonitoringPoint>>(`/monitoring-points/${id}`);
    return response.data.data!;
  },
  create: async (data: Partial<MonitoringPoint>): Promise<MonitoringPoint> => {
    const response = await apiClient.post<ApiResponse<MonitoringPoint>>('/monitoring-points', data);
    return response.data.data!;
  },
  update: async (id: string, data: Partial<MonitoringPoint>): Promise<MonitoringPoint> => {
    const response = await apiClient.put<ApiResponse<MonitoringPoint>>(`/monitoring-points/${id}`, data);
    return response.data.data!;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/monitoring-points/${id}`);
  },
};

export const healthRecordApi = {
  list: async (): Promise<HealthRecord[]> => {
    const response = await apiClient.get<ApiResponse<HealthRecord[]>>('/health-records');
    return response.data.data || [];
  },
  get: async (id: string): Promise<HealthRecord> => {
    const response = await apiClient.get<ApiResponse<HealthRecord>>(`/health-records/${id}`);
    return response.data.data!;
  },
  create: async (data: Partial<HealthRecord>): Promise<HealthRecord> => {
    const response = await apiClient.post<ApiResponse<HealthRecord>>('/health-records', data);
    return response.data.data!;
  },
  update: async (id: string, data: Partial<HealthRecord>): Promise<HealthRecord> => {
    const response = await apiClient.put<ApiResponse<HealthRecord>>(`/health-records/${id}`, data);
    return response.data.data!;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/health-records/${id}`);
  },
};

export const healthCheckupApi = {
  list: async (): Promise<HealthCheckup[]> => {
    const response = await apiClient.get<ApiResponse<HealthCheckup[]>>('/health-checkups');
    return response.data.data || [];
  },
  get: async (id: string): Promise<HealthCheckup> => {
    const response = await apiClient.get<ApiResponse<HealthCheckup>>(`/health-checkups/${id}`);
    return response.data.data!;
  },
  create: async (data: Partial<HealthCheckup>): Promise<HealthCheckup> => {
    const response = await apiClient.post<ApiResponse<HealthCheckup>>('/health-checkups', data);
    return response.data.data!;
  },
  update: async (id: string, data: Partial<HealthCheckup>): Promise<HealthCheckup> => {
    const response = await apiClient.put<ApiResponse<HealthCheckup>>(`/health-checkups/${id}`, data);
    return response.data.data!;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/health-checkups/${id}`);
  },
};

export const safetyIncidentApi = {
  list: async (): Promise<SafetyIncident[]> => {
    const response = await apiClient.get<ApiResponse<SafetyIncident[]>>('/safety-incidents');
    return response.data.data || [];
  },
  get: async (id: string): Promise<SafetyIncident> => {
    const response = await apiClient.get<ApiResponse<SafetyIncident>>(`/safety-incidents/${id}`);
    return response.data.data!;
  },
  create: async (data: Partial<SafetyIncident>): Promise<SafetyIncident> => {
    const response = await apiClient.post<ApiResponse<SafetyIncident>>('/safety-incidents', data);
    return response.data.data!;
  },
  update: async (id: string, data: Partial<SafetyIncident>): Promise<SafetyIncident> => {
    const response = await apiClient.put<ApiResponse<SafetyIncident>>(`/safety-incidents/${id}`, data);
    return response.data.data!;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/safety-incidents/${id}`);
  },
};

export const riskAssessmentApi = {
  list: async (): Promise<RiskAssessment[]> => {
    const response = await apiClient.get<ApiResponse<RiskAssessment[]>>('/risk-assessments');
    return response.data.data || [];
  },
  get: async (id: string): Promise<RiskAssessment> => {
    const response = await apiClient.get<ApiResponse<RiskAssessment>>(`/risk-assessments/${id}`);
    return response.data.data!;
  },
  create: async (data: Partial<RiskAssessment>): Promise<RiskAssessment> => {
    const response = await apiClient.post<ApiResponse<RiskAssessment>>('/risk-assessments', data);
    return response.data.data!;
  },
  update: async (id: string, data: Partial<RiskAssessment>): Promise<RiskAssessment> => {
    const response = await apiClient.put<ApiResponse<RiskAssessment>>(`/risk-assessments/${id}`, data);
    return response.data.data!;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/risk-assessments/${id}`);
  },
};

export const trainingProgramApi = {
  list: async (): Promise<TrainingProgram[]> => {
    const response = await apiClient.get<ApiResponse<TrainingProgram[]>>('/training-programs');
    return response.data.data || [];
  },
  get: async (id: string): Promise<TrainingProgram> => {
    const response = await apiClient.get<ApiResponse<TrainingProgram>>(`/training-programs/${id}`);
    return response.data.data!;
  },
  create: async (data: Partial<TrainingProgram>): Promise<TrainingProgram> => {
    const response = await apiClient.post<ApiResponse<TrainingProgram>>('/training-programs', data);
    return response.data.data!;
  },
  update: async (id: string, data: Partial<TrainingProgram>): Promise<TrainingProgram> => {
    const response = await apiClient.put<ApiResponse<TrainingProgram>>(`/training-programs/${id}`, data);
    return response.data.data!;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/training-programs/${id}`);
  },
};

export const trainingRecordApi = {
  list: async (): Promise<TrainingRecord[]> => {
    const response = await apiClient.get<ApiResponse<TrainingRecord[]>>('/training-records');
    return response.data.data || [];
  },
  get: async (id: string): Promise<TrainingRecord> => {
    const response = await apiClient.get<ApiResponse<TrainingRecord>>(`/training-records/${id}`);
    return response.data.data!;
  },
  create: async (data: Partial<TrainingRecord>): Promise<TrainingRecord> => {
    const response = await apiClient.post<ApiResponse<TrainingRecord>>('/training-records', data);
    return response.data.data!;
  },
  update: async (id: string, data: Partial<TrainingRecord>): Promise<TrainingRecord> => {
    const response = await apiClient.put<ApiResponse<TrainingRecord>>(`/training-records/${id}`, data);
    return response.data.data!;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/training-records/${id}`);
  },
};

export default apiClient;
