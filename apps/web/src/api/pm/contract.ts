import { apiClient } from '../client';
import type {
  Contract,
  ContractMilestone,
  ContractPaymentSchedule,
  ContractTemplate,
} from './types';

export const contractApi = {
  list: async () => {
    return apiClient.pm.get('/api/pm/contracts');
  },

  get: async (id: string) => {
    return apiClient.pm.get(`/api/pm/contracts/${id}`);
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
    return apiClient.pm.post('/api/pm/contracts', data);
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
    return apiClient.pm.put(`/api/pm/contracts/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.pm.delete(`/api/pm/contracts/${id}`);
  },

  submit: async (id: string) => {
    return apiClient.pm.post(`/api/pm/contracts/${id}/submit`);
  },

  approve: async (id: string) => {
    return apiClient.pm.post(`/api/pm/contracts/${id}/approve`);
  },

  reject: async (id: string) => {
    return apiClient.pm.post(`/api/pm/contracts/${id}/reject`);
  },
};

export const contractMilestoneApi = {
  list: async (contractId: string) => {
    return apiClient.pm.get(`/api/pm/contracts/${contractId}/milestones`);
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
    return apiClient.pm.post(`/api/pm/contracts/${contractId}/milestones`, data);
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
    return apiClient.pm.put(`/api/pm/contracts/${contractId}/milestones/${milestoneId}`, data);
  },

  delete: async (contractId: string, milestoneId: string) => {
    return apiClient.pm.delete(`/api/pm/contracts/${contractId}/milestones/${milestoneId}`);
  },
};

export const contractPaymentApi = {
  list: async (contractId: string) => {
    return apiClient.pm.get(`/api/pm/contracts/${contractId}/payments`);
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
    return apiClient.pm.post(`/api/pm/contracts/${contractId}/payments`, data);
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
    return apiClient.pm.put(`/api/pm/contracts/${contractId}/payments/${paymentId}`, data);
  },

  delete: async (contractId: string, paymentId: string) => {
    return apiClient.pm.delete(`/api/pm/contracts/${contractId}/payments/${paymentId}`);
  },
};

export const projectContractApi = {
  list: async (projectId: string) => {
    return apiClient.pm.get(`/api/pm/projects/${projectId}/contracts`);
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
    return apiClient.pm.post(`/api/pm/projects/${projectId}/contracts`, data);
  },
};

export const contractTemplateApi = {
  list: async () => {
    return apiClient.pm.get('/api/pm/contract-templates');
  },

  get: async (id: string) => {
    return apiClient.pm.get(`/api/pm/contract-templates/${id}`);
  },

  create: async (data: {
    name: string;
    contract_type: string;
    description?: string;
    content: Record<string, unknown>;
    created_by?: string;
  }) => {
    return apiClient.pm.post('/api/pm/contract-templates', data);
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
    return apiClient.pm.put(`/api/pm/contract-templates/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.pm.delete(`/api/pm/contract-templates/${id}`);
  },
};

export default contractApi;
