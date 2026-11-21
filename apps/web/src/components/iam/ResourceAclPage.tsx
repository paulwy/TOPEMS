import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Search, ShieldCheck } from 'lucide-react';

import {
  Badge,
  Button,
  FilterChip,
  Input,
  ListPageTemplate,
  Pagination,
  Select,
  Tabs,
} from '@/components/redesign';
import type { DataTableColumn } from '@/components/redesign';
import { authApi, resourceAclApi } from '@/api/iam';
import type {
  ResourceAclEffect,
  ResourceAclItem,
  ResourceAclListQuery,
  ResourceAclScope,
  ResourceAclSubjectType,
} from '@/api/iam';
import { IAM_PATHS } from '@/module-configs/iam/config';
import i18n from '@/i18n';

import '@/theme/redesign-tokens.css';
import '@/theme/redesign-global.css';

type Dimension = 'role' | 'user' | 'resource';

interface AclFilters {
  dimension: Dimension;
  roleId: string;
  userId: string;
  resourceType: string;
  resourceId: string;
  permission: string;
  effect: ResourceAclEffect | '';
  scope: ResourceAclScope | '';
  tenantId: string;
  subjectType: ResourceAclSubjectType | '';
}

const EMPTY_FILTERS: AclFilters = {
  dimension: 'role',
  roleId: '',
  userId: '',
  resourceType: '',
  resourceId: '',
  permission: '',
  effect: '',
  scope: '',
  tenantId: '',
  subjectType: '',
};

const styles: Record<string, React.CSSProperties> = {
  filterRow: { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 'var(--space-3)' },
  filterField: { minWidth: 'var(--space-12)', display: 'flex', flexDirection: 'column' },
  actions: { display: 'flex', alignItems: 'center', gap: 'var(--space-2)' },
  subjectCell: { display: 'flex', alignItems: 'center', gap: 'var(--space-2)' },
  muted: { color: 'var(--text-secondary)' },
  pagination: { display: 'flex', justifyContent: 'flex-end', paddingTop: 'var(--space-4)' },
};

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const toListQuery = (filters: AclFilters, page: number, pageSize: number): ResourceAclListQuery => {
  const query: ResourceAclListQuery = { page, page_size: pageSize };
  if (filters.resourceType) query.resource_type = filters.resourceType;
  if (filters.resourceId) query.resource_id = filters.resourceId;
  if (filters.permission) query.permission = filters.permission;
  if (filters.effect) query.effect = filters.effect;
  if (filters.scope) query.scope = filters.scope;
  if (filters.subjectType) query.subject_type = filters.subjectType;
  // tenant_id 仅平台作用域生效，租户作用域下后端会忽略，前端也不发送
  if (filters.scope === 'platform' && filters.tenantId) query.tenant_id = filters.tenantId;
  return query;
};

const ResourceAclPage: React.FC = () => {
  const [draft, setDraft] = useState<AclFilters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<AclFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: roles } = useQuery({
    queryKey: ['iam', 'roles', 'acl-options'],
    queryFn: async () => {
      const response = await authApi.listRoles();
      return response.success ? (response.data ?? []) : [];
    },
  });

  const { data: users } = useQuery({
    queryKey: ['iam', 'users', 'acl-options'],
    queryFn: async () => {
      const response = await authApi.listUsers({ page: 1, page_size: 100 });
      return response.success ? (response.data?.users ?? []) : [];
    },
  });

  const ready =
    (applied.dimension === 'role' && !!applied.roleId) ||
    (applied.dimension === 'user' && !!applied.userId) ||
    (applied.dimension === 'resource' && !!applied.resourceType && !!applied.resourceId);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['iam', 'resource-acl', applied, page, pageSize],
    enabled: ready,
    queryFn: async () => {
      const query = toListQuery(applied, page, pageSize);
      const response =
        applied.dimension === 'role'
          ? await resourceAclApi.listRoleResourcePermissions(applied.roleId, query)
          : applied.dimension === 'user'
            ? await resourceAclApi.listUserResourcePermissions(applied.userId, query)
            : await resourceAclApi.listResourcePermissions({
                ...query,
                resource_type: applied.resourceType,
                resource_id: applied.resourceId,
              });
      if (!response.success) {
        throw new Error(response.message || i18n.t('iam.resource_acl_page.error_load'));
      }
      return response.data;
    },
  });

  const roleOptions = useMemo(
    () => [
      { value: '', label: i18n.t('iam.resource_acl_page.all') },
      ...(roles ?? []).map((role) => ({ value: role.id, label: role.name })),
    ],
    [roles]
  );

  const userOptions = useMemo(
    () => [
      { value: '', label: i18n.t('iam.resource_acl_page.all') },
      ...(users ?? []).map((user) => ({
        value: user.id,
        label: user.full_name || user.username,
      })),
    ],
    [users]
  );

  const effectOptions = useMemo(
    () => [
      { value: '', label: i18n.t('iam.resource_acl_page.all') },
      { value: 'allow', label: i18n.t('iam.resource_acl_page.effect_allow') },
      { value: 'deny', label: i18n.t('iam.resource_acl_page.effect_deny') },
    ],
    []
  );

  const scopeOptions = useMemo(
    () => [
      { value: '', label: i18n.t('iam.resource_acl_page.all') },
      { value: 'platform', label: i18n.t('iam.resource_acl_page.scope_platform') },
      { value: 'tenant', label: i18n.t('iam.resource_acl_page.scope_tenant') },
    ],
    []
  );

  const subjectTypeOptions = useMemo(
    () => [
      { value: '', label: i18n.t('iam.resource_acl_page.all') },
      { value: 'role', label: i18n.t('iam.resource_acl_page.subject_role') },
      { value: 'user', label: i18n.t('iam.resource_acl_page.subject_user') },
    ],
    []
  );

  const tabs = useMemo(
    () => [
      { id: 'role', label: i18n.t('iam.resource_acl_page.tab_role') },
      { id: 'user', label: i18n.t('iam.resource_acl_page.tab_user') },
      { id: 'resource', label: i18n.t('iam.resource_acl_page.tab_resource') },
    ],
    []
  );

  const columns: DataTableColumn<ResourceAclItem>[] = useMemo(
    () => [
      {
        key: 'subject',
        header: i18n.t('iam.resource_acl_page.col_subject'),
        render: (row) => (
          <div style={styles.subjectCell}>
            <ShieldCheck size={16} />
            <span>{row.subject_name || row.subject_id}</span>
            <Badge variant='default'>
              {row.subject_type === 'role'
                ? i18n.t('iam.resource_acl_page.subject_role')
                : i18n.t('iam.resource_acl_page.subject_user')}
            </Badge>
          </div>
        ),
      },
      {
        key: 'resource',
        header: i18n.t('iam.resource_acl_page.col_resource'),
        render: (row) => (
          <div>
            <div>{row.resource_type}</div>
            <div style={styles.muted}>{row.resource_id || '-'}</div>
          </div>
        ),
      },
      {
        key: 'permission',
        header: i18n.t('iam.resource_acl_page.col_permission'),
        render: (row) => <span>{row.permission}</span>,
      },
      {
        key: 'effect',
        header: i18n.t('iam.resource_acl_page.col_effect'),
        render: (row) => (
          <Badge variant={row.effect === 'deny' ? 'error' : 'success'}>
            {row.effect === 'deny'
              ? i18n.t('iam.resource_acl_page.effect_deny')
              : i18n.t('iam.resource_acl_page.effect_allow')}
          </Badge>
        ),
      },
      {
        key: 'scope',
        header: i18n.t('iam.resource_acl_page.col_scope'),
        render: (row) => (
          <div>
            <Badge variant={row.scope === 'platform' ? 'info' : 'cyan'}>
              {row.scope === 'platform'
                ? i18n.t('iam.resource_acl_page.scope_platform')
                : i18n.t('iam.resource_acl_page.scope_tenant')}
            </Badge>
            {row.tenant_name && <div style={styles.muted}>{row.tenant_name}</div>}
          </div>
        ),
      },
      {
        key: 'created_at',
        header: i18n.t('iam.resource_acl_page.col_created_at'),
        render: (row) => <span style={styles.muted}>{formatDateTime(row.created_at)}</span>,
      },
    ],
    []
  );

  const applyFilters = () => {
    setPage(1);
    setApplied(draft);
  };

  const resetFilters = () => {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setPage(1);
  };

  const hint = !ready
    ? i18n.t('iam.resource_acl_page.hint_required')
    : i18n.t('iam.resource_acl_page.empty_description');

  const toolbar = (
    <div style={styles.filterRow}>
      <div style={styles.filterField}>
        <Tabs
          tabs={tabs}
          activeTab={draft.dimension}
          onChange={(id) => setDraft((prev) => ({ ...prev, dimension: id as Dimension }))}
        />
      </div>

      {draft.dimension === 'role' && (
        <Select
          label={i18n.t('iam.resource_acl_page.field_role')}
          options={roleOptions}
          value={draft.roleId}
          onChange={(e) => setDraft((prev) => ({ ...prev, roleId: e.target.value }))}
        />
      )}

      {draft.dimension === 'user' && (
        <Select
          label={i18n.t('iam.resource_acl_page.field_user')}
          options={userOptions}
          value={draft.userId}
          onChange={(e) => setDraft((prev) => ({ ...prev, userId: e.target.value }))}
        />
      )}

      {draft.dimension === 'resource' && (
        <>
          <Input
            label={i18n.t('iam.resource_acl_page.field_resource_type')}
            placeholder={i18n.t('iam.resource_acl_page.placeholder_resource_type')}
            value={draft.resourceType}
            onChange={(e) => setDraft((prev) => ({ ...prev, resourceType: e.target.value }))}
          />
          <Input
            label={i18n.t('iam.resource_acl_page.field_resource_id')}
            placeholder={i18n.t('iam.resource_acl_page.placeholder_resource_id')}
            value={draft.resourceId}
            onChange={(e) => setDraft((prev) => ({ ...prev, resourceId: e.target.value }))}
          />
        </>
      )}

      <Input
        label={i18n.t('iam.resource_acl_page.field_permission')}
        placeholder={i18n.t('iam.resource_acl_page.placeholder_permission')}
        value={draft.permission}
        onChange={(e) => setDraft((prev) => ({ ...prev, permission: e.target.value }))}
        leftIcon={<Search size={16} />}
      />

      {draft.dimension !== 'resource' && (
        <Select
          label={i18n.t('iam.resource_acl_page.field_effect')}
          options={effectOptions}
          value={draft.effect}
          onChange={(e) =>
            setDraft((prev) => ({ ...prev, effect: e.target.value as AclFilters['effect'] }))
          }
        />
      )}

      {draft.dimension === 'resource' && (
        <Select
          label={i18n.t('iam.resource_acl_page.field_subject_type')}
          options={subjectTypeOptions}
          value={draft.subjectType}
          onChange={(e) =>
            setDraft((prev) => ({
              ...prev,
              subjectType: e.target.value as AclFilters['subjectType'],
            }))
          }
        />
      )}

      <Select
        label={i18n.t('iam.resource_acl_page.field_scope')}
        options={scopeOptions}
        value={draft.scope}
        onChange={(e) =>
          setDraft((prev) => ({ ...prev, scope: e.target.value as AclFilters['scope'] }))
        }
      />

      {draft.scope === 'platform' && (
        <Input
          label={i18n.t('iam.resource_acl_page.field_tenant_id')}
          placeholder={i18n.t('iam.resource_acl_page.placeholder_tenant_id')}
          value={draft.tenantId}
          onChange={(e) => setDraft((prev) => ({ ...prev, tenantId: e.target.value }))}
        />
      )}

      <div style={styles.actions}>
        <Button
          variant='primary'
          leftIcon={<Search size={16} />}
          onClick={applyFilters}
        >
          {i18n.t('iam.resource_acl_page.action_query')}
        </Button>
        <Button
          variant='secondary'
          onClick={resetFilters}
        >
          {i18n.t('iam.resource_acl_page.action_reset')}
        </Button>
        <Button
          variant='ghost'
          leftIcon={<RefreshCw size={16} />}
          onClick={() => refetch()}
        >
          {i18n.t('iam.resource_acl_page.action_refresh')}
        </Button>
      </div>

      <FilterChip
        label={i18n.t('iam.resource_acl_page.total_chip', { count: data?.total ?? 0 })}
        active
        onClick={() => {}}
      />
    </div>
  );

  return (
    <>
      <ListPageTemplate<ResourceAclItem>
        header={{
          title: i18n.t('iam.resource_acl_page.title'),
          subtitle: i18n.t('iam.resource_acl_page.subtitle'),
          breadcrumbs: [
            { label: i18n.t('iam.resource_acl_page.breadcrumb_home'), href: '/dashboard' },
            { label: i18n.t('iam.resource_acl_page.breadcrumb_module'), href: IAM_PATHS.root },
            { label: i18n.t('iam.resource_acl_page.title') },
          ],
        }}
        toolbar={toolbar}
        columns={columns}
        data={data?.items || []}
        rowKey='id'
        loading={isLoading}
        error={error instanceof Error ? error.message : null}
        emptyTitle={i18n.t('iam.resource_acl_page.empty_title')}
        emptyDescription={hint}
      />

      {(data?.total ?? 0) > 0 && (
        <div style={styles.pagination}>
          <Pagination
            current={data?.page ?? page}
            total={Math.max(1, data?.total_pages ?? 1)}
            pageSize={pageSize}
            totalItems={data?.total ?? 0}
            onChange={setPage}
            showSizeChanger
            pageSizeOptions={[20, 50, 100, 200]}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </div>
      )}
    </>
  );
};

export default ResourceAclPage;
