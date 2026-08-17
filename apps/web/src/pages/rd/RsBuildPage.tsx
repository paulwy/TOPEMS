import React from 'react';
import { RotateCcw } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CrudPage, type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { buildSchema } from '@/schemas/rd';
import { rdApi } from '@/api/rd';
import type { Build, CreateBuildRequest } from '@/api/rd';
import { RD_PATHS } from '@/modules/rd/config';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { useNotificationStore } from '@/store';
import { logger } from '@/utils/logger';
import i18n from '@/i18n';

const buildApiAdapter: CrudApiAdapter<Build> = {
  list: async (params) => {
    const queryParams: Record<string, unknown> = {
      page: params?.page,
      pagesize: params?.pageSize,
    };
    if (params?.search) queryParams.search = params.search;
    if (params?.status) queryParams.status = params.status;
    const response = await rdApi.listBuilds(queryParams);
    if (!response.success || !response.data) {
      throw new Error(response.message || i18n.t('rd.rs_build_page.k0'));
    }
    return {
      data: response.data.builds || [],
      total: response.data.total || 0,
    };
  },
  create: async (data) => {
    const createData: CreateBuildRequest = {
      project_id: String(data.project_id ?? ''),
      branch: String(data.branch ?? ''),
      commit_hash: String(data.commit_hash ?? ''),
      build_type: String(data.build_type ?? 'manual'),
    };
    const response = await rdApi.createBuild(createData);
    if (!response.success || !response.data) {
      throw new Error(response.message || i18n.t('rd.rs_build_page.k1'));
    }
    return response.data;
  },
  update: async () => {
    throw new Error(i18n.t('rd.rs_build_page.k2'));
  },
  delete: async () => {
    throw new Error(i18n.t('rd.rs_build_page.k3'));
  },
};
const RsBuildPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();
  const rebuildMutation = useMutation({
    mutationFn: async (build: Build) => {
      const createData: CreateBuildRequest = {
        project_id: build.project_id,
        branch: build.branch,
        commit_hash: build.commit_hash,
        build_type: 'manual',
      };
      const response = await rdApi.createBuild(createData);
      if (!response.success) {
        throw new Error(response.message || i18n.t('rd.rs_build_page.k4'));
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.RD.BUILDS,
        exact: false,
        refetchType: 'active',
      });
      addNotification({
        type: 'success',
        title: i18n.t('rd.rs_build_page.k5'),
        message: i18n.t('rd.rs_build_page.k6'),
      });
    },
    onError: (error: unknown) => {
      logger.error(i18n.t('pages.rs_build_page.k0'), error);
      addNotification({
        type: 'error',
        title: i18n.t('rd.rs_build_page.k7'),
        message: error instanceof Error ? error.message : i18n.t('rd.rs_build_page.k8'),
      });
    },
  });
  const handleRebuild = (row: Record<string, unknown>) => {
    rebuildMutation.mutate(row as unknown as Build);
  };
  const customRowActions: RowAction[] = [
    {
      key: 'rebuild',
      label: i18n.t('rd.rs_build_page.k9'),
      icon: <RotateCcw size={16} />,
      color: 'primary',
      onClick: handleRebuild,
    },
  ];
  return (
    <CrudPage
      schema={buildSchema}
      apiAdapter={buildApiAdapter}
      customRowActions={customRowActions}
      breadcrumbs={[
        { label: i18n.t('rd.rs_build_page.k11'), href: RD_PATHS.root },
        { label: i18n.t('rd.rs_build_page.k10') },
      ]}
    />
  );
};
export default RsBuildPage;
