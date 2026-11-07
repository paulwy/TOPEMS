/**
 * Mobile · 移动端 HRM 员工组织 API 绑定
 *
 * 后端: svc/mobile/src/main.rs (通过 HRM 服务客户端)
 * 路由:
 *   GET    /mobile/employees
 *   GET    /mobile/employees/{id}
 *   GET    /mobile/departments
 *   GET    /mobile/departments/{id}
 *   GET    /mobile/departments/{id}/members
 *   GET    /mobile/announcements
 *   GET    /mobile/announcements/{id}
 *   GET    /mobile/my-info
 *   GET    /mobile/company-info
 *   GET    /mobile/employees/search
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type EmployeeStatus = 'active' | 'on_leave' | 'resigned' | 'probation';
export type AnnouncementType = 'notice' | 'policy' | 'event' | 'recognition';

export interface Employee {
  id: string;
  name: string;
  employee_no: string;
  avatar?: string;
  email?: string;
  phone?: string;
  department_id?: string;
  department_name?: string;
  position?: string;
  level?: string;
  status: EmployeeStatus;
  join_date?: string;
  manager_id?: string;
  manager_name?: string;
}

export interface Department {
  id: string;
  name: string;
  code?: string;
  parent_id?: string;
  manager_id?: string;
  manager_name?: string;
  member_count: number;
  children?: Department[];
}

export interface Announcement {
  id: string;
  title: string;
  type: AnnouncementType;
  content: string;
  publisher: string;
  published_at: string;
  target_roles?: string[];
  is_pinned: boolean;
}

export interface EmployeeInfo {
  id: string;
  name: string;
  employee_no: string;
  avatar?: string;
  email: string;
  phone?: string;
  department_id: string;
  department_name: string;
  position: string;
  level?: string;
  status: EmployeeStatus;
  join_date: string;
  manager?: {
    id: string;
    name: string;
  };
  emergency_contact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}

export interface CompanyInfo {
  id: string;
  name: string;
  logo?: string;
  slogan?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  employee_count: number;
  department_count: number;
}

export const employeeApi = {
  // ==================== 员工/部门（批 37 g3：/employees*、/departments*、/my-info、/company-info 为占位，死封装已删除）====================

  // ==================== 公告通知 ====================

  listAnnouncements: async (params?: {
    type?: AnnouncementType;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<Announcement>>> => {
    return apiClient.mobile.get('announcements', { params });
  },

  getAnnouncement: async (id: string): Promise<ApiResponse<Announcement>> => {
    return apiClient.mobile.get(`announcements/${id}`);
  },
};

export default employeeApi;
