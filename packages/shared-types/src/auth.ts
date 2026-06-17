/**
 * 统一用户类型
 *
 * 设计原则：
 * - 核心字段使用 camelCase（TypeScript 惯例）
 * - web 兼容字段使用 snake_case（API 响应兼容）
 * - 部分字段互为别名（如 realName/full_name）
 */

export interface User {
  // 核心字段（camelCase）
  id: string;
  username: string;
  email: string;
  realName: string;
  status: 'active' | 'inactive' | 'locked';
  permissions: string[];
  createdAt: string;
  updatedAt: string;

  // 扩展字段（可选）
  avatar?: string;
  phone?: string;
  departmentId?: string;
  positionId?: string;

  // Web 兼容字段（snake_case）- 由 API 响应映射
  /** realName 的别名 */
  full_name?: string;
  /** 主角色（当 roles 只有一个时） */
  role?: string;
  /** 角色列表 */
  roles?: string[];
  /** 超级用户标识 */
  is_superuser?: boolean;
  /** is_active - status 的别名（用于旧 API） */
  is_active?: boolean;
  /** createdAt 的别名（用于旧 API） */
  created_at?: string;
  /** updatedAt 的别名（用于旧 API） */
  updated_at?: string;
}

/**
 * 将 snake_case API 响应映射为 User 类型
 * @param apiResponse 来自 API 的原始响应（snake_case）
 */
export const mapApiUserToUser = (apiResponse: Record<string, any>): User => {
  return {
    id: apiResponse.id,
    username: apiResponse.username,
    email: apiResponse.email,
    realName: apiResponse.real_name || apiResponse.full_name || apiResponse.username,
    status: apiResponse.is_active === false ? 'inactive' : (apiResponse.status || 'active'),
    permissions: apiResponse.permissions || [],
    createdAt: apiResponse.created_at || apiResponse.createdAt || new Date().toISOString(),
    updatedAt: apiResponse.updated_at || apiResponse.updatedAt || new Date().toISOString(),

    // 扩展字段
    avatar: apiResponse.avatar,
    phone: apiResponse.phone,
    departmentId: apiResponse.department_id || apiResponse.departmentId,
    positionId: apiResponse.position_id || apiResponse.positionId,

    // Web 兼容字段
    full_name: apiResponse.full_name,
    role: apiResponse.role,
    roles: apiResponse.roles,
    is_superuser: apiResponse.is_superuser,
    is_active: apiResponse.is_active,
    created_at: apiResponse.created_at,
    updated_at: apiResponse.updated_at,
  };
};

export interface Role {
  id: string;
  name: string;
  code: string;
  description?: string;
  permissions: string[];
  status: 'active' | 'inactive';
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  type: 'menu' | 'button' | 'api';
  resource?: string;
  action?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}
