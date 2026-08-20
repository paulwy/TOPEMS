/**
 * @related-pages
 * - admin/UserManagementPage: reuses createUserApiAdapter + userSchema import from this file
 * - iam/UserManagementPage: reuses createUserApiAdapter from this file
 *
 * @todo Phase 2 - full merge:
 *   When admin/UserManagementPage role management needs to be exposed under iam,
 *   move UserRoleDialog + customRowActions up to SharedUserManagementPage,
 *   and control whether to render the role management entry via variant props.
 */

import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import type { User } from '@/api/iam';
import { authApi } from '@/api/iam';

export interface CreateUserApiAdapterOptions {
  /** i18n namespace prefix for differentiated error messages */
  i18nPrefix?: 'admin.usermanagementpage' | 'iam.usermanagementpage';
  /** Translation function (from useTranslation) for localized error messages */
  t: (key: string) => string;
}

/**
 * Shared: User management CRUD API adapter
 *
 * The two UserManagementPage implementations share 95% of user CRUD API call logic,
 * Extracted here to avoid duplicate maintenance of list/create/update/delete logic.
 * Differences (e.g., breadcrumbs, role management) are handled separately in each page.
 */
function createUserApiAdapter(options: CreateUserApiAdapterOptions): CrudApiAdapter<User> {
  const prefix = options.i18nPrefix || 'admin.usermanagementpage';
  const { t } = options;

  return {
    list: async (params) => {
      const res = await authApi.listUsers({
        page: params?.page ?? 1,
        pagesize: params?.pageSize ?? 20,
        search: params?.search || undefined,
      });
      if (res.success && res.data) {
        return {
          data: (res.data.users || []) as unknown as User[],
          total: res.data.total || 0,
        };
      }
      return { data: [], total: 0 };
    },

    create: async (data) => {
      const res = await authApi.createUser({
        username: String((data as Record<string, unknown>).username || ''),
        email: String((data as Record<string, unknown>).email || ''),
        password: String((data as Record<string, unknown>).password || ''),
        full_name: data.full_name ? String(data.full_name) : undefined,
      });
      if (!res.success) {
        throw new Error(res.message || t(`${prefix}.create_user_failed`));
      }
      return res.data as unknown as User;
    },

    update: async (id, data) => {
      const res = await authApi.updateUser(id, {
        full_name: data.full_name ? String(data.full_name) : undefined,
        email: String(data.email || ''),
        isactive: Boolean(data.isactive),
      });
      if (!res.success) {
        throw new Error(res.message || t(`${prefix}.update_user_failed`));
      }
      return res.data as unknown as User;
    },

    delete: async (id) => {
      const res = await authApi.deleteUser(id);
      if (!res.success) {
        throw new Error(res.message || t(`${prefix}.delete_user_failed`));
      }
    },
  };
}

export default createUserApiAdapter;
