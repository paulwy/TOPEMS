import { apiClient } from './client';

export interface Project {
  id: string;
  name: string;
  code: string;
  description?: string;
  project_type: string;
  status: string;
  leader?: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  progress: number;
  project_config?: Record<string, unknown>;
  benefit_target?: Record<string, unknown>;
  risk_level?: string;
  priority?: number;
  tags?: string[];
  parent_id?: string;
  workspace_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectRequest {
  name: string;
  code: string;
  description?: string;
  project_type: string;
  leader?: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  project_config?: Record<string, unknown>;
  benefit_target?: Record<string, unknown>;
  risk_level?: string;
  priority?: number;
  tags?: string[];
  parent_id?: string;
  workspace_id?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: string;
  leader?: string;
  end_date?: string;
  budget?: number;
  progress?: number;
  project_config?: Record<string, unknown>;
  benefit_target?: Record<string, unknown>;
  risk_level?: string;
  priority?: number;
  tags?: string[];
  parent_id?: string;
  workspace_id?: string;
}

export interface ProjectPhase {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  sequence_number: number;
  start_date?: string;
  end_date?: string;
  progress: number;
  status: string;
  predecessor_ids?: string[];
  created_at: string;
  updated_at: string;
}

export interface ProjectMilestone {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  date: string;
  status: string;
  phase_id?: string;
  acceptance_criteria?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  responsibilities?: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectResource {
  id: string;
  project_id: string;
  resource_type: string;
  resource_id: string;
  resource_service?: string;
  role?: string;
  start_date?: string;
  end_date?: string;
  allocation_percent?: number;
  actual_hours?: number;
  actual_cost?: number;
  status?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectExpense {
  id: string;
  project_id: string;
  phase_id?: string;
  expense_type: string;
  category?: string;
  subcategory?: string;
  description?: string;
  amount: number;
  currency?: string;
  incurred_date: string;
  reported_date?: string;
  paid_date?: string;
  budget_item_id?: string;
  resource_id?: string;
  expense_ref_id?: string;
  status?: string;
  approval_workflow_id?: string;
  attachment_ids?: string[];
  created_by?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectBenefit {
  id: string;
  project_id: string;
  period_type: string;
  period_date: string;
  planned_cost: number;
  actual_cost: number;
  planned_progress: number;
  actual_progress: number;
  planned_value: number;
  earned_value: number;
  actual_cost_eva: number;
  cpi: number;
  spi: number;
  cv: number;
  sv: number;
  eac: number;
  etc: number;
  roi: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectApproval {
  id: string;
  project_id: string;
  status: string;
  current_step: number;
  total_steps: number;
  approvals: Record<string, unknown>;
  comments?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectProgress {
  planned: number;
  actual: number;
  trend: 'ahead' | 'behind' | 'normal';
  completed_phases: number;
  total_phases: number;
}

export interface ProjectBenefits {
  spi: number;
  milestones_achieved: number;
  total_milestones: number;
}



export interface ProjectDashboardResponse {
  project: Project;
  progress: ProjectProgress;
  budget: Record<string, unknown>;
  members: Record<string, unknown>[];
  equipment: Record<string, unknown>[];
  benefits: ProjectBenefits;
  risks: ProjectRisk[];
}

export interface GanttPhase {
  id: string;
  name: string;
  project_id: string;
  start_date?: string;
  end_date?: string;
  progress: number;
  status: string;
  predecessor_ids: string[];
}

export interface GanttMilestone {
  id: string;
  name: string;
  project_id: string;
  date: string;
  status: string;
}

export interface GanttResource {
  id: string;
  resource_type: string;
  name: string;
  assignments: Record<string, unknown>[];
}

export interface ProjectGanttResponse {
  phases: GanttPhase[];
  milestones: GanttMilestone[];
  resources: GanttResource[];
}

export interface BenefitAnalysis {
  summary: {
    total_planned_cost: number;
    total_actual_cost: number;
    total_planned_value: number;
    total_earned_value: number;
    period_count: number;
  };
  eva: {
    cpi: number;
    spi: number;
    cv: number;
    sv: number;
    eac: number;
    etc: number;
    roi: number;
  };
  trend: {
    cpi_status: string;
    spi_status: string;
    cost_status: string;
  };
  details: Array<{
    period_type: string;
    period_date: string;
    cpi: number;
    spi: number;
    cv: number;
    sv: number;
  }>;
}

export interface ApprovalRequest {
  action: 'approve' | 'reject' | 'cancel';
  comment?: string;
  approver_id: string;
}

export interface Contract {
  id: string;
  project_id?: string;
  contract_code: string;
  contract_name: string;
  contract_type: string;
  contract_category?: string;
  party_a_name?: string;
  party_a_id?: string;
  party_b_name?: string;
  party_b_id?: string;
  amount: number;
  currency?: string;
  tax_rate?: number;
  signing_date?: string;
  effective_date?: string;
  end_date?: string;
  status?: string;
  template_id?: string;
  workflow_instance_id?: string;
  description?: string;
  attachment_ids?: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ContractMilestone {
  id: string;
  contract_id: string;
  project_milestone_id?: string;
  name: string;
  description?: string;
  target_date: string;
  payment_amount?: number;
  payment_percent?: number;
  status?: string;
  actual_date?: string;
  payment_status?: string;
  created_at: string;
  updated_at: string;
}

export interface ContractPaymentSchedule {
  id: string;
  contract_id: string;
  payment_number: number;
  payment_name?: string;
  payment_percent?: number;
  payment_amount: number;
  due_date: string;
  actual_payment_date?: string;
  actual_payment_amount?: number;
  status?: string;
  invoice_number?: string;
  expense_ref_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ContractTemplate {
  id: string;
  name: string;
  contract_type: string;
  description?: string;
  content: Record<string, unknown>;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  project_id: string;
  budget_code: string;
  budget_name: string;
  budget_type?: string;
  total_amount: number;
  allocated_amount: number;
  spent_amount: number;
  status?: string;
  version: number;
  created_by?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
}

export interface BudgetItem {
  id: string;
  budget_id: string;
  item_code?: string;
  item_name: string;
  category?: string;
  subcategory?: string;
  budget_amount: number;
  allocated_amount: number;
  spent_amount: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectRisk {
  id: string;
  project_id: string;
  risk_code?: string;
  risk_name: string;
  risk_description?: string;
  risk_category?: string;
  risk_subcategory?: string;
  likelihood: string;
  impact: string;
  risk_score: number;
  status?: string;
  mitigation_strategy?: string;
  contingency_plan?: string;
  trigger_condition?: string;
  warning_threshold: number;
  owner?: string;
  response_due_date?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface RiskEvent {
  id: string;
  risk_id: string;
  event_type: string;
  event_description?: string;
  occurred_at: string;
  reported_by?: string;
  created_at: string;
}

export interface QualityCheck {
  id: string;
  project_id: string;
  check_code?: string;
  check_name: string;
  check_type?: string;
  phase_id?: string;
  milestone_id?: string;
  check_criteria?: string;
  acceptance_standard?: string;
  status?: string;
  check_date?: string;
  checked_by?: string;
  result_details?: Record<string, any>;
  nonconformities?: Record<string, any>;
  corrective_actions?: Record<string, any>;
  follow_up_date?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Defect {
  id: string;
  project_id: string;
  check_id?: string;
  defect_code?: string;
  defect_name: string;
  defect_description?: string;
  severity: string;
  priority: string;
  status?: string;
  assignee?: string;
  due_date?: string;
  resolution?: string;
  resolved_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AcceptancePlan {
  id: string;
  project_id: string;
  plan_code?: string;
  plan_name: string;
  acceptance_type: string;
  milestone_id?: string;
  phase_id?: string;
  acceptance_criteria?: string;
  expected_date?: string;
  status?: string;
  participants?: Record<string, any>;
  documents_required?: Record<string, any>;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AcceptanceItem {
  id: string;
  plan_id: string;
  item_code?: string;
  item_name: string;
  item_description?: string;
  required_standard?: string;
  actual_result?: string;
  is_passed?: boolean;
  comments?: string;
  created_at: string;
  updated_at: string;
}

export interface AcceptanceRecord {
  id: string;
  project_id: string;
  plan_id: string;
  acceptance_date: string;
  status: string;
  conclusion?: string;
  score?: number;
  accepted_by?: string;
  attendees?: Record<string, any>;
  findings?: Record<string, any>;
  recommendations?: Record<string, any>;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Settlement {
  id: string;
  project_id: string;
  settlement_code?: string;
  settlement_name: string;
  settlement_type: string;
  status?: string;
  budget_amount?: number;
  actual_amount?: number;
  variance_amount?: number;
  variance_percent?: number;
  settlement_period_start?: string;
  settlement_period_end?: string;
  description?: string;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SettlementItem {
  id: string;
  settlement_id: string;
  item_code?: string;
  item_name: string;
  category?: string;
  budget_amount: number;
  actual_amount: number;
  variance_amount: number;
  variance_percent?: number;
  description?: string;
  expense_ref_id?: string;
  contract_ref_id?: string;
  created_at: string;
  updated_at: string;
}

export interface SettlementAdjustment {
  id: string;
  settlement_id: string;
  adjustment_type: string;
  adjustment_code?: string;
  description?: string;
  amount: number;
  reason?: string;
  supporting_documents?: Record<string, any>;
  created_by?: string;
  created_at: string;
}

export interface ProjectDocument {
  id: string;
  project_id: string;
  document_code?: string;
  document_name: string;
  document_type: string;
  file_path: string;
  file_size: number;
  file_hash?: string;
  version: number;
  status?: string;
  description?: string;
  tags?: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version: number;
  file_path: string;
  file_hash?: string;
  change_note?: string;
  created_by?: string;
  created_at: string;
}

export interface DocumentFolder {
  id: string;
  project_id: string;
  parent_id?: string;
  folder_name: string;
  description?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectReport {
  id: string;
  project_id: string;
  report_code?: string;
  report_name: string;
  report_type: string;
  report_period?: string;
  status?: string;
  generated_at?: string;
  data?: Record<string, any>;
  summary?: string;
  generated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ReportTemplate {
  id: string;
  template_code: string;
  template_name: string;
  report_type: string;
  content: Record<string, any>;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  project_id: string;
  user_id?: string;
  notification_type: string;
  title: string;
  message: string;
  status?: string;
  priority?: string;
  metadata?: Record<string, any>;
  due_date?: string;
  delivered_at?: string;
  read_at?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationSetting {
  id: string;
  project_id: string;
  user_id: string;
  notification_type: string;
  enabled: boolean;
  notify_before_days?: number;
  preferred_channel?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationType {
  code: string;
  name: string;
  description: string;
  default_enabled: boolean;
  default_priority: string;
}

export const pmApi = {
  projects: {
    list: async (params?: { project_type?: string; status?: string; page?: number; page_size?: number }) => {
      const query = new URLSearchParams();
      if (params?.project_type) query.set('project_type', params.project_type);
      if (params?.status) query.set('status', params.status);
      if (params?.page) query.set('page', params.page.toString());
      if (params?.page_size) query.set('page_size', params.page_size.toString());
      return apiClient.pm.get(`/api/v1/projects?${query.toString()}`);
    },

    create: async (data: CreateProjectRequest) => {
      return apiClient.pm.post('/api/v1/projects', data);
    },

    get: async (id: string) => {
      return apiClient.pm.get(`/api/v1/projects/${id}`);
    },

    update: async (id: string, data: UpdateProjectRequest) => {
      return apiClient.pm.put(`/api/v1/projects/${id}`, data);
    },

    delete: async (id: string) => {
      return apiClient.pm.delete(`/api/v1/projects/${id}`);
    },

    dashboard: async (id: string) => {
      return apiClient.pm.get(`/api/v1/projects/${id}/dashboard`);
    },

    gantt: async (id: string) => {
      return apiClient.pm.get(`/api/v1/projects/${id}/gantt`);
    },
  },

  phases: {
    list: async (projectId: string) => {
      return apiClient.pm.get(`/api/v1/projects/${projectId}/phases`);
    },

    create: async (
      projectId: string,
      data: {
        name: string;
        description?: string;
        start_date?: string;
        end_date?: string;
        predecessor_ids?: string[];
      }
    ) => {
      return apiClient.pm.post(`/api/v1/projects/${projectId}/phases`, data);
    },

    get: async (projectId: string, id: string) => {
      return apiClient.pm.get(`/api/v1/projects/${projectId}/phases/${id}`);
    },

    update: async (
      projectId: string,
      id: string,
      data: {
        name?: string;
        description?: string;
        sequence_number?: number;
        start_date?: string;
        end_date?: string;
        progress?: number;
        status?: string;
        predecessor_ids?: string[];
      }
    ) => {
      return apiClient.pm.put(`/api/v1/projects/${projectId}/phases/${id}`, data);
    },

    delete: async (projectId: string, id: string) => {
      return apiClient.pm.delete(`/api/v1/projects/${projectId}/phases/${id}`);
    },
  },

  milestones: {
    list: async (projectId: string) => {
      return apiClient.pm.get(`/api/v1/projects/${projectId}/milestones`);
    },

    create: async (
      projectId: string,
      data: {
        name: string;
        description?: string;
        date: string;
        phase_id?: string;
        acceptance_criteria?: string;
      }
    ) => {
      return apiClient.pm.post(`/api/v1/projects/${projectId}/milestones`, data);
    },

    get: async (projectId: string, id: string) => {
      return apiClient.pm.get(`/api/v1/projects/${projectId}/milestones/${id}`);
    },

    update: async (
      projectId: string,
      id: string,
      data: {
        name?: string;
        description?: string;
        date?: string;
        status?: string;
        phase_id?: string;
        acceptance_criteria?: string;
      }
    ) => {
      return apiClient.pm.put(`/api/v1/projects/${projectId}/milestones/${id}`, data);
    },

    delete: async (projectId: string, id: string) => {
      return apiClient.pm.delete(`/api/v1/projects/${projectId}/milestones/${id}`);
    },
  },

  members: {
    list: async (projectId: string) => {
      return apiClient.pm.get(`/api/v1/projects/${projectId}/members`);
    },

    create: async (
      projectId: string,
      data: {
        user_id: string;
        role: string;
        responsibilities?: string;
        start_date?: string;
        end_date?: string;
      }
    ) => {
      return apiClient.pm.post(`/api/v1/projects/${projectId}/members`, data);
    },

    get: async (projectId: string, id: string) => {
      return apiClient.pm.get(`/api/v1/projects/${projectId}/members/${id}`);
    },

    update: async (
      projectId: string,
      id: string,
      data: {
        role?: string;
        responsibilities?: string;
        start_date?: string;
        end_date?: string;
      }
    ) => {
      return apiClient.pm.put(`/api/v1/projects/${projectId}/members/${id}`, data);
    },

    delete: async (projectId: string, id: string) => {
      return apiClient.pm.delete(`/api/v1/projects/${projectId}/members/${id}`);
    },
  },

  resources: {
    list: async (projectId: string) => {
      return apiClient.pm.get(`/api/v1/projects/${projectId}/resources`);
    },

    create: async (
      projectId: string,
      data: {
        resource_type: string;
        resource_id: string;
        resource_service?: string;
        role?: string;
        start_date?: string;
        end_date?: string;
        allocation_percent?: number;
        created_by?: string;
      }
    ) => {
      return apiClient.pm.post(`/api/v1/projects/${projectId}/resources`, data);
    },

    get: async (projectId: string, id: string) => {
      return apiClient.pm.get(`/api/v1/projects/${projectId}/resources/${id}`);
    },

    update: async (
      projectId: string,
      id: string,
      data: {
        role?: string;
        start_date?: string;
        end_date?: string;
        allocation_percent?: number;
        actual_hours?: number;
        actual_cost?: number;
        status?: string;
      }
    ) => {
      return apiClient.pm.put(`/api/v1/projects/${projectId}/resources/${id}`, data);
    },

    delete: async (projectId: string, id: string) => {
      return apiClient.pm.delete(`/api/v1/projects/${projectId}/resources/${id}`);
    },
  },

  expenses: {
    list: async (projectId: string) => {
      return apiClient.pm.get(`/api/v1/projects/${projectId}/expenses`);
    },

    create: async (
      projectId: string,
      data: {
        phase_id?: string;
        expense_type: string;
        category?: string;
        subcategory?: string;
        description?: string;
        amount: number;
        currency?: string;
        incurred_date: string;
        budget_item_id?: string;
        resource_id?: string;
        expense_ref_id?: string;
        approval_workflow_id?: string;
        attachment_ids?: string[];
        created_by?: string;
      }
    ) => {
      return apiClient.pm.post(`/api/v1/projects/${projectId}/expenses`, data);
    },

    get: async (projectId: string, id: string) => {
      return apiClient.pm.get(`/api/v1/projects/${projectId}/expenses/${id}`);
    },

    update: async (
      projectId: string,
      id: string,
      data: {
        expense_type?: string;
        category?: string;
        subcategory?: string;
        description?: string;
        amount?: number;
        paid_date?: string;
        status?: string;
        approved_by?: string;
      }
    ) => {
      return apiClient.pm.put(`/api/v1/projects/${projectId}/expenses/${id}`, data);
    },

    delete: async (projectId: string, id: string) => {
      return apiClient.pm.delete(`/api/v1/projects/${projectId}/expenses/${id}`);
    },
  },

  benefits: {
    list: async (projectId: string) => {
      return apiClient.pm.get(`/api/v1/projects/${projectId}/benefits`);
    },

    analysis: async (projectId: string) => {
      return apiClient.pm.get(`/api/v1/projects/${projectId}/benefits/analysis`);
    },

    calculate: async (
      projectId: string,
      data: {
        period_type: string;
        period_date: string;
        planned_cost: number;
        actual_cost: number;
        planned_progress: number;
        actual_progress: number;
        planned_value: number;
        earned_value: number;
        actual_cost_eva: number;
        notes?: string;
        created_by?: string;
      }
    ) => {
      return apiClient.pm.post(`/api/v1/projects/${projectId}/benefits`, data);
    },
  },

  approval: {
    get: async (projectId: string) => {
      return apiClient.pm.get(`/api/v1/projects/${projectId}/approval`);
    },

    submit: async (
      projectId: string,
      data: {
        comment?: string;
        approver_id: string;
      }
    ) => {
      return apiClient.pm.post(`/api/v1/projects/${projectId}/approval`, data);
    },

    action: async (projectId: string, data: ApprovalRequest) => {
      return apiClient.pm.post(`/api/v1/projects/${projectId}/approval/action`, data);
    },
  },

  contracts: {
    list: async () => {
      return apiClient.pm.get('/api/v1/contracts');
    },

    get: async (id: string) => {
      return apiClient.pm.get(`/api/v1/contracts/${id}`);
    },

    create: async (data: {
      project_id?: string;
      contract_code: string;
      contract_name: string;
      contract_type: string;
      contract_category?: string;
      party_a_name?: string;
      party_a_id?: string;
      party_b_name?: string;
      party_b_id?: string;
      amount: number;
      currency?: string;
      tax_rate?: number;
      signing_date?: string;
      effective_date?: string;
      end_date?: string;
      template_id?: string;
      description?: string;
      created_by?: string;
    }) => {
      return apiClient.pm.post('/api/v1/contracts', data);
    },

    update: async (
      id: string,
      data: {
        contract_name?: string;
        contract_category?: string;
        party_a_name?: string;
        party_a_id?: string;
        party_b_name?: string;
        party_b_id?: string;
        amount?: number;
        currency?: string;
        tax_rate?: number;
        signing_date?: string;
        effective_date?: string;
        end_date?: string;
        status?: string;
        description?: string;
      }
    ) => {
      return apiClient.pm.put(`/api/v1/contracts/${id}`, data);
    },

    delete: async (id: string) => {
      return apiClient.pm.delete(`/api/v1/contracts/${id}`);
    },

    submit: async (id: string) => {
      return apiClient.pm.post(`/api/v1/contracts/${id}/submit`);
    },

    approve: async (id: string) => {
      return apiClient.pm.post(`/api/v1/contracts/${id}/approve`);
    },

    reject: async (id: string) => {
      return apiClient.pm.post(`/api/v1/contracts/${id}/reject`);
    },

    milestones: {
      list: async (contractId: string) => {
        return apiClient.pm.get(`/api/v1/contracts/${contractId}/milestones`);
      },

      create: async (
        contractId: string,
        data: {
          name: string;
          description?: string;
          target_date: string;
          payment_amount?: number;
          payment_percent?: number;
          project_milestone_id?: string;
        }
      ) => {
        return apiClient.pm.post(`/api/v1/contracts/${contractId}/milestones`, data);
      },

      update: async (
        contractId: string,
        milestoneId: string,
        data: {
          name?: string;
          description?: string;
          target_date?: string;
          payment_amount?: number;
          payment_percent?: number;
        }
      ) => {
        return apiClient.pm.put(`/api/v1/contracts/${contractId}/milestones/${milestoneId}`, data);
      },

      delete: async (contractId: string, milestoneId: string) => {
        return apiClient.pm.delete(`/api/v1/contracts/${contractId}/milestones/${milestoneId}`);
      },
    },

    payments: {
      list: async (contractId: string) => {
        return apiClient.pm.get(`/api/v1/contracts/${contractId}/payments`);
      },

      create: async (
        contractId: string,
        data: {
          payment_number: number;
          payment_name?: string;
          payment_percent?: number;
          payment_amount: number;
          due_date: string;
        }
      ) => {
        return apiClient.pm.post(`/api/v1/contracts/${contractId}/payments`, data);
      },

      update: async (
        contractId: string,
        paymentId: string,
        data: {
          payment_name?: string;
          payment_percent?: number;
          payment_amount?: number;
          due_date?: string;
        }
      ) => {
        return apiClient.pm.put(`/api/v1/contracts/${contractId}/payments/${paymentId}`, data);
      },

      delete: async (contractId: string, paymentId: string) => {
        return apiClient.pm.delete(`/api/v1/contracts/${contractId}/payments/${paymentId}`);
      },
    },

    projectContracts: {
      list: async (projectId: string) => {
        return apiClient.pm.get(`/api/v1/projects/${projectId}/contracts`);
      },

      create: async (
        projectId: string,
        data: {
          contract_code: string;
          contract_name: string;
          contract_type: string;
          contract_category?: string;
          party_a_name?: string;
          party_a_id?: string;
          party_b_name?: string;
          party_b_id?: string;
          amount: number;
          currency?: string;
          tax_rate?: number;
          signing_date?: string;
          effective_date?: string;
          end_date?: string;
          template_id?: string;
          description?: string;
          created_by?: string;
        }
      ) => {
        return apiClient.pm.post(`/api/v1/projects/${projectId}/contracts`, data);
      },
    },
  },

  contractTemplates: {
    list: async () => {
      return apiClient.pm.get('/api/v1/contract-templates');
    },

    get: async (id: string) => {
      return apiClient.pm.get(`/api/v1/contract-templates/${id}`);
    },

    create: async (data: {
      name: string;
      contract_type: string;
      description?: string;
      content: Record<string, unknown>;
      created_by?: string;
    }) => {
      return apiClient.pm.post('/api/v1/contract-templates', data);
    },

    update: async (
      id: string,
      data: {
        name?: string;
        contract_type?: string;
        description?: string;
        content?: Record<string, unknown>;
      }
    ) => {
      return apiClient.pm.put(`/api/v1/contract-templates/${id}`, data);
    },

    delete: async (id: string) => {
      return apiClient.pm.delete(`/api/v1/contract-templates/${id}`);
    },
  },

  budgets: {
    list: async (projectId: string) => {
      return apiClient.pm.get(`/api/v1/projects/${projectId}/budgets`);
    },

    get: async (id: string) => {
      return apiClient.pm.get(`/api/v1/budgets/${id}`);
    },

    create: async (projectId: string, data: {
      budget_code: string;
      budget_name: string;
      budget_type?: string;
      total_amount: number;
      created_by?: string;
    }) => {
      return apiClient.pm.post(`/api/v1/projects/${projectId}/budgets`, data);
    },

    update: async (
      id: string,
      data: {
        budget_name?: string;
        budget_type?: string;
        total_amount?: number;
        status?: string;
      }
    ) => {
      return apiClient.pm.put(`/api/v1/budgets/${id}`, data);
    },

    submit: async (id: string) => {
      return apiClient.pm.post(`/api/v1/budgets/${id}/submit`);
    },

    approve: async (id: string) => {
      return apiClient.pm.post(`/api/v1/budgets/${id}/approve`);
    },

    items: {
      list: async (budgetId: string) => {
        return apiClient.pm.get(`/api/v1/budgets/${budgetId}/items`);
      },

      create: async (
        budgetId: string,
        data: {
          item_code?: string;
          item_name: string;
          category?: string;
          subcategory?: string;
          budget_amount: number;
          description?: string;
        }
      ) => {
        return apiClient.pm.post(`/api/v1/budgets/${budgetId}/items`, data);
      },

      update: async (
        budgetId: string,
        itemId: string,
        data: {
          item_name?: string;
          category?: string;
          subcategory?: string;
          budget_amount?: number;
          description?: string;
        }
      ) => {
        return apiClient.pm.put(`/api/v1/budgets/${budgetId}/items/${itemId}`, data);
      },

      delete: async (budgetId: string, itemId: string) => {
        return apiClient.pm.delete(`/api/v1/budgets/${budgetId}/items/${itemId}`);
      },
    },
  },

  risks: {
    list: async (projectId: string) => {
      return apiClient.pm.get(`/api/v1/projects/${projectId}/risks`);
    },

    get: async (id: string) => {
      return apiClient.pm.get(`/api/v1/risks/${id}`);
    },

    create: async (
      projectId: string,
      data: {
        risk_code?: string;
        risk_name: string;
        risk_description?: string;
        risk_category?: string;
        risk_subcategory?: string;
        likelihood: string;
        impact: string;
        risk_score: number;
        mitigation_strategy?: string;
        contingency_plan?: string;
        trigger_condition?: string;
        warning_threshold?: number;
        owner?: string;
        response_due_date?: string;
        created_by?: string;
      }
    ) => {
      return apiClient.pm.post(`/api/v1/projects/${projectId}/risks`, data);
    },

    update: async (
      id: string,
      data: {
        risk_name?: string;
        risk_description?: string;
        risk_category?: string;
        risk_subcategory?: string;
        likelihood?: string;
        impact?: string;
        risk_score?: number;
        status?: string;
        mitigation_strategy?: string;
        contingency_plan?: string;
        trigger_condition?: string;
        warning_threshold?: number;
        owner?: string;
        response_due_date?: string;
      }
    ) => {
      return apiClient.pm.put(`/api/v1/risks/${id}`, data);
    },

    events: {
      list: async (riskId: string) => {
        return apiClient.pm.get(`/api/v1/risks/${riskId}/events`);
      },

      create: async (
        riskId: string,
        data: {
          event_type: string;
          event_description?: string;
          reported_by?: string;
        }
      ) => {
        return apiClient.pm.post(`/api/v1/risks/${riskId}/events`, data);
      },
    },
  },

  quality: {
    checks: {
      list: async (projectId: string) => {
        return apiClient.pm.get(`/api/v1/projects/${projectId}/quality-checks`);
      },

      get: async (id: string) => {
        return apiClient.pm.get(`/api/v1/quality-checks/${id}`);
      },

      create: async (
        projectId: string,
        data: {
          check_code?: string;
          check_name: string;
          check_type?: string;
          phase_id?: string;
          milestone_id?: string;
          check_criteria?: string;
          acceptance_standard?: string;
          created_by?: string;
        }
      ) => {
        return apiClient.pm.post(`/api/v1/projects/${projectId}/quality-checks`, data);
      },

      update: async (
        id: string,
        data: {
          check_name?: string;
          check_type?: string;
          check_criteria?: string;
          acceptance_standard?: string;
          status?: string;
          check_date?: string;
          checked_by?: string;
          result_details?: Record<string, any>;
          nonconformities?: Record<string, any>;
          corrective_actions?: Record<string, any>;
          follow_up_date?: string;
        }
      ) => {
        return apiClient.pm.put(`/api/v1/quality-checks/${id}`, data);
      },
    },

    defects: {
      list: async (projectId: string) => {
        return apiClient.pm.get(`/api/v1/projects/${projectId}/defects`);
      },

      get: async (id: string) => {
        return apiClient.pm.get(`/api/v1/defects/${id}`);
      },

      create: async (
        projectId: string,
        data: {
          defect_code?: string;
          defect_name: string;
          defect_description?: string;
          severity: string;
          priority: string;
          check_id?: string;
          assignee?: string;
          due_date?: string;
          created_by?: string;
        }
      ) => {
        return apiClient.pm.post(`/api/v1/projects/${projectId}/defects`, data);
      },

      update: async (
        id: string,
        data: {
          defect_name?: string;
          defect_description?: string;
          severity?: string;
          priority?: string;
          status?: string;
          assignee?: string;
          due_date?: string;
          resolution?: string;
        }
      ) => {
        return apiClient.pm.put(`/api/v1/defects/${id}`, data);
      },

      delete: async (id: string) => {
        return apiClient.pm.delete(`/api/v1/defects/${id}`);
      },
    },
  },

  acceptance: {
    plans: {
      list: async (projectId: string) => {
        return apiClient.pm.get(`/api/v1/projects/${projectId}/acceptance-plans`);
      },

      get: async (id: string) => {
        return apiClient.pm.get(`/api/v1/acceptance-plans/${id}`);
      },

      create: async (
        projectId: string,
        data: {
          plan_code?: string;
          plan_name: string;
          acceptance_type: string;
          milestone_id?: string;
          phase_id?: string;
          acceptance_criteria?: string;
          expected_date?: string;
          participants?: Record<string, any>;
          documents_required?: Record<string, any>;
          created_by?: string;
        }
      ) => {
        return apiClient.pm.post(`/api/v1/projects/${projectId}/acceptance-plans`, data);
      },

      update: async (
        id: string,
        data: {
          plan_name?: string;
          acceptance_type?: string;
          acceptance_criteria?: string;
          expected_date?: string;
          status?: string;
          participants?: Record<string, any>;
          documents_required?: Record<string, any>;
        }
      ) => {
        return apiClient.pm.put(`/api/v1/acceptance-plans/${id}`, data);
      },
    },

    items: {
      list: async (planId: string) => {
        return apiClient.pm.get(`/api/v1/acceptance-plans/${planId}/items`);
      },

      create: async (
        planId: string,
        data: {
          item_code?: string;
          item_name: string;
          item_description?: string;
          required_standard?: string;
        }
      ) => {
        return apiClient.pm.post(`/api/v1/acceptance-plans/${planId}/items`, data);
      },

      update: async (
        id: string,
        data: {
          actual_result?: string;
          is_passed?: boolean;
          comments?: string;
        }
      ) => {
        return apiClient.pm.put(`/api/v1/acceptance-items/${id}`, data);
      },

      delete: async (id: string) => {
        return apiClient.pm.delete(`/api/v1/acceptance-items/${id}`);
      },
    },

    records: {
      list: async (projectId: string) => {
        return apiClient.pm.get(`/api/v1/projects/${projectId}/acceptance-records`);
      },

      get: async (id: string) => {
        return apiClient.pm.get(`/api/v1/acceptance-records/${id}`);
      },

      create: async (
        planId: string,
        data: {
          acceptance_date: string;
          status: string;
          conclusion?: string;
          score?: number;
          accepted_by?: string;
          attendees?: Record<string, any>;
          findings?: Record<string, any>;
          recommendations?: Record<string, any>;
          created_by?: string;
        }
      ) => {
        return apiClient.pm.post(`/api/v1/acceptance-plans/${planId}/records`, data);
      },

      update: async (
        id: string,
        data: {
          status?: string;
          conclusion?: string;
          score?: number;
          attendees?: Record<string, any>;
          findings?: Record<string, any>;
          recommendations?: Record<string, any>;
        }
      ) => {
        return apiClient.pm.put(`/api/v1/acceptance-records/${id}`, data);
      },
    },
  },

  settlement: {
    list: async (projectId: string) => {
      return apiClient.pm.get(`/api/v1/projects/${projectId}/settlements`);
    },

    get: async (id: string) => {
      return apiClient.pm.get(`/api/v1/settlements/${id}`);
    },

    create: async (
      projectId: string,
      data: {
        settlement_code?: string;
        settlement_name: string;
        settlement_type: string;
        settlement_period_start?: string;
        settlement_period_end?: string;
        description?: string;
        created_by?: string;
      }
    ) => {
      return apiClient.pm.post(`/api/v1/projects/${projectId}/settlements`, data);
    },

    update: async (
      id: string,
      data: {
        settlement_name?: string;
        status?: string;
        actual_amount?: number;
        description?: string;
      }
    ) => {
      return apiClient.pm.put(`/api/v1/settlements/${id}`, data);
    },

    approve: async (id: string) => {
      return apiClient.pm.post(`/api/v1/settlements/${id}/approve`);
    },

    items: {
      list: async (settlementId: string) => {
        return apiClient.pm.get(`/api/v1/settlements/${settlementId}/items`);
      },

      create: async (
        settlementId: string,
        data: {
          item_code?: string;
          item_name: string;
          category?: string;
          budget_amount: number;
          actual_amount: number;
          description?: string;
          expense_ref_id?: string;
          contract_ref_id?: string;
        }
      ) => {
        return apiClient.pm.post(`/api/v1/settlements/${settlementId}/items`, data);
      },

      update: async (
        id: string,
        data: {
          item_name?: string;
          category?: string;
          actual_amount?: number;
          description?: string;
        }
      ) => {
        return apiClient.pm.put(`/api/v1/settlement-items/${id}`, data);
      },

      delete: async (id: string) => {
        return apiClient.pm.delete(`/api/v1/settlement-items/${id}`);
      },
    },

    adjustments: {
      list: async (settlementId: string) => {
        return apiClient.pm.get(`/api/v1/settlements/${settlementId}/adjustments`);
      },

      create: async (
        settlementId: string,
        data: {
          adjustment_type: string;
          adjustment_code?: string;
          description?: string;
          amount: number;
          reason?: string;
          supporting_documents?: Record<string, any>;
          created_by?: string;
        }
      ) => {
        return apiClient.pm.post(`/api/v1/settlements/${settlementId}/adjustments`, data);
      },
    },
  },

  document: {
    list: async (projectId: string) => {
      return apiClient.pm.get(`/api/v1/projects/${projectId}/documents`);
    },

    get: async (id: string) => {
      return apiClient.pm.get(`/api/v1/documents/${id}`);
    },

    create: async (
      projectId: string,
      data: {
        document_code?: string;
        document_name: string;
        document_type: string;
        file_path: string;
        file_size: number;
        file_hash?: string;
        description?: string;
        tags?: string[];
        created_by?: string;
      }
    ) => {
      return apiClient.pm.post(`/api/v1/projects/${projectId}/documents`, data);
    },

    update: async (
      id: string,
      data: {
        document_name?: string;
        document_type?: string;
        status?: string;
        description?: string;
        tags?: string[];
      }
    ) => {
      return apiClient.pm.put(`/api/v1/documents/${id}`, data);
    },

    delete: async (id: string) => {
      return apiClient.pm.delete(`/api/v1/documents/${id}`);
    },

    versions: {
      list: async (documentId: string) => {
        return apiClient.pm.get(`/api/v1/documents/${documentId}/versions`);
      },

      create: async (
        documentId: string,
        data: {
          file_path: string;
          file_hash?: string;
          change_note?: string;
          created_by?: string;
        }
      ) => {
        return apiClient.pm.post(`/api/v1/documents/${documentId}/versions`, data);
      },
    },

    folders: {
      list: async (projectId: string) => {
        return apiClient.pm.get(`/api/v1/projects/${projectId}/folders`);
      },

      get: async (id: string) => {
        return apiClient.pm.get(`/api/v1/folders/${id}`);
      },

      create: async (
        projectId: string,
        data: {
          parent_id?: string;
          folder_name: string;
          description?: string;
          created_by?: string;
        }
      ) => {
        return apiClient.pm.post(`/api/v1/projects/${projectId}/folders`, data);
      },

      update: async (
        id: string,
        data: {
          folder_name?: string;
          description?: string;
        }
      ) => {
        return apiClient.pm.put(`/api/v1/folders/${id}`, data);
      },

      delete: async (id: string) => {
        return apiClient.pm.delete(`/api/v1/folders/${id}`);
      },
    },
  },

  report: {
    list: async (projectId: string) => {
      return apiClient.pm.get(`/api/v1/projects/${projectId}/reports`);
    },

    get: async (id: string) => {
      return apiClient.pm.get(`/api/v1/reports/${id}`);
    },

    create: async (
      projectId: string,
      data: {
        report_code?: string;
        report_name: string;
        report_type: string;
        report_period?: string;
        generated_by?: string;
      }
    ) => {
      return apiClient.pm.post(`/api/v1/projects/${projectId}/reports`, data);
    },

    generate: async (
      projectId: string,
      data: {
        report_code?: string;
        report_name: string;
        report_type: string;
        report_period?: string;
        generated_by?: string;
      }
    ) => {
      return apiClient.pm.post(`/api/v1/projects/${projectId}/reports/generate`, data);
    },

    templates: {
      list: async () => {
        return apiClient.pm.get('/api/v1/report-templates');
      },

      get: async (id: string) => {
        return apiClient.pm.get(`/api/v1/report-templates/${id}`);
      },

      create: async (data: {
        template_code: string;
        template_name: string;
        report_type: string;
        content: Record<string, any>;
        created_by?: string;
      }) => {
        return apiClient.pm.post('/api/v1/report-templates', data);
      },

      update: async (
        id: string,
        data: {
          template_name?: string;
          content?: Record<string, any>;
        }
      ) => {
        return apiClient.pm.put(`/api/v1/report-templates/${id}`, data);
      },

      delete: async (id: string) => {
        return apiClient.pm.delete(`/api/v1/report-templates/${id}`);
      },
    },
  },

  notification: {
    list: async (projectId: string) => {
      return apiClient.pm.get(`/api/v1/projects/${projectId}/notifications`);
    },

    get: async (id: string) => {
      return apiClient.pm.get(`/api/v1/notifications/${id}`);
    },

    create: async (data: {
      project_id: string;
      user_id?: string;
      notification_type: string;
      title: string;
      message: string;
      priority?: string;
      metadata?: Record<string, any>;
      due_date?: string;
    }) => {
      return apiClient.pm.post('/api/v1/notifications', data);
    },

    update: async (
      id: string,
      data: {
        status?: string;
        read_at?: string;
      }
    ) => {
      return apiClient.pm.put(`/api/v1/notifications/${id}`, data);
    },

    markAsRead: async (id: string) => {
      return apiClient.pm.post(`/api/v1/notifications/${id}/read`);
    },

    settings: {
      list: async (projectId: string) => {
        return apiClient.pm.get(`/api/v1/projects/${projectId}/notification-settings`);
      },

      create: async (
        projectId: string,
        data: {
          notification_type: string;
          enabled: boolean;
          notify_before_days?: number;
          preferred_channel?: string;
        }
      ) => {
        return apiClient.pm.post(`/api/v1/projects/${projectId}/notification-settings`, data);
      },

      update: async (
        id: string,
        data: {
          enabled?: boolean;
          notify_before_days?: number;
          preferred_channel?: string;
        }
      ) => {
        return apiClient.pm.put(`/api/v1/notification-settings/${id}`, data);
      },
    },

    types: {
      list: async () => {
        return apiClient.pm.get('/api/v1/notification-types');
      },
    },
  },
};
