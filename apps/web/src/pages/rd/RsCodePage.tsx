import React from 'react';
import { Alert } from '@mui/material';
import { CrudPage, type CrudApiAdapter } from '@/components/templates/CrudPage';
import { codeSchema } from '@/schemas/rd';
import { rdApi } from '@/api/rd';
import type { Project } from '@/api/rd';
import { RD_PATHS } from '@/modules/rd/config';
import i18n from '@/i18n';

interface CodeRepo {
  id: string;
  project_name: string;
  code: string;
  leader: string;
  status: string;
  progress: number;
  start_date: string;
  risklevel?: string;
  created_at: string;
}

// 批33：本页复用 rs.projects 展示，无真实 Git 集成。
// 移除 branch_count/commit_count/repo_url/tech_stack 等假指标，
// create/update/delete 一律拒绝（后端无对应字段）。
const codeApiAdapter: CrudApiAdapter<CodeRepo> = {
  list: async (params) => {
    const queryParams: Record<string, unknown> = {
      page: params?.page,
      page_size: params?.pageSize,
    };
    if (params?.search) queryParams.search = params.search;
    const response = await rdApi.listProjects(queryParams);
    if (!response.success || !response.data) {
      throw new Error(response.message || i18n.t('rd.rs_code_page.k0'));
    }
    const projectList = response.data.projects || [];
    const repos: CodeRepo[] = projectList.map((p: Project) => ({
      id: p.id,
      project_name: p.project_name || p.name || '',
      code: p.code || '',
      leader: p.leader || '',
      status: p.status || '',
      progress: p.progress,
      start_date: p.start_date || '',
      risklevel: p.risklevel,
      created_at: p.created_at || '',
    }));
    return {
      data: repos,
      total: response.data.total || 0,
    };
  },
  create: async () => {
    throw new Error(i18n.t('rd.rs_code_page.k1'));
  },
  update: async () => {
    throw new Error(i18n.t('rd.rs_code_page.k2'));
  },
  delete: async () => {
    throw new Error(i18n.t('rd.rs_code_page.k3'));
  },
};

const RsCodePage: React.FC = () => {
  return (
    <CrudPage
      schema={codeSchema}
      apiAdapter={codeApiAdapter}
      breadcrumbs={[
        { label: i18n.t('rd.rs_code_page.k6'), href: RD_PATHS.root },
        { label: i18n.t('rd.rs_code_page.k5') },
      ]}
      headerContent={
        <Alert
          severity='info'
          sx={{ mb: 2 }}
        >
          {i18n.t('rd.rs_code_page.k7')}
        </Alert>
      }
    />
  );
};

export default RsCodePage;
