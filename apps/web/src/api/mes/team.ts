import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  PaginationParams,
  Team,
  TeamMember,
  CreateTeamRequest,
  UpdateTeamRequest,
} from './types';

export const teamApi = {
  async list(params?: PaginationParams): Promise<
    ApiResponse<{
      teams: Team[];
      total: number;
      page: number;
      pagesize: number;
    }>
  > {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.mes.get(`/teams${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<Team>> {
    return apiClient.mes.get(`/teams/${id}`);
  },

  async create(data: CreateTeamRequest): Promise<ApiResponse<Team>> {
    return apiClient.mes.post('/teams', data);
  },

  async update(id: string, data: UpdateTeamRequest): Promise<ApiResponse<Team>> {
    return apiClient.mes.put(`/teams/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.mes.delete(`/teams/${id}`);
  },

  async getMembers(teamId: string): Promise<ApiResponse<{ members: TeamMember[] }>> {
    return apiClient.mes.get(`/teams/${teamId}/members`);
  },

  async addMember(
    teamId: string,
    data: { employee_id: string; employee_name: string; position?: string }
  ): Promise<ApiResponse<TeamMember>> {
    return apiClient.mes.post(`/teams/${teamId}/members`, data);
  },

  async removeMember(teamId: string, memberId: string): Promise<ApiResponse<string>> {
    return apiClient.mes.delete(`/teams/${teamId}/members/${memberId}`);
  },
};
