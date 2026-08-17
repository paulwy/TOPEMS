import React from 'react';
import { Users } from 'lucide-react';
import { CrudPage, type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { codeSchema } from '@/schemas/rd';
import { rdApi } from '@/api/rd';
import type { Project } from '@/api/rd';
import { RD_PATHS } from '@/modules/rd/config';
import i18n from '@/i18n';

interface CodeRepo {
  id: string;
  repo_name: string;
  project_name: string;
  repo_url: string;
  branch_count: number;
  commit_count: number;
  last_commit: string;
  language: string;
}
interface CreateRepoForm {
  project_id: string;
  repo_name: string;
  repo_url: string;
  language: string;
}
const codeApiAdapter: CrudApiAdapter<CodeRepo> = {
  list: async (params) => {
    const queryParams: Record<string, unknown> = {
      page: params?.page,
      pagesize: params?.pageSize,
    };
    if (params?.search) queryParams.search = params.search;
    if (params?.language) queryParams.language = params.language;
    const response = await rdApi.listProjects(queryParams);
    if (!response.success || !response.data) {
      throw new Error(response.message || i18n.t('rd.rs_code_page.k0'));
    }
    const projectList = response.data.projects || [];
    const repos: CodeRepo[] = projectList.map((p: Project) => ({
      id: p.id,
      repo_name: p.project_name,
      project_name: p.project_name,
      repo_url: p.repo_url || '',
      branch_count: Math.floor(Math.random() * 10) + 1,
      commit_count: Math.floor(Math.random() * 100) + 10,
      last_commit: p.created_at || '',
      language: p.tech_stack || 'JavaScript',
    }));
    return {
      data: repos,
      total: response.data.total || 0,
    };
  },
  create: async (data) => {
    const formData = data as unknown as CreateRepoForm;
    const response = await rdApi.updateProject(formData.project_id, {
      repo_url: formData.repo_url,
      tech_stack: formData.language,
    });
    if (!response.success || !response.data) {
      throw new Error(response.message || i18n.t('rd.rs_code_page.k1'));
    }
    return response.data as unknown as CodeRepo;
  },
  update: async () => {
    throw new Error(i18n.t('rd.rs_code_page.k2'));
  },
  delete: async () => {
    throw new Error(i18n.t('rd.rs_code_page.k3'));
  },
};
const RsCodePage: React.FC = () => {
  const customRowActions: RowAction[] = [
    {
      key: 'members',
      label: i18n.t('rd.rs_code_page.k4'),
      icon: <Users size={16} />,
      onClick: () => {},
    },
  ];
  return (
    <CrudPage
      schema={codeSchema}
      apiAdapter={codeApiAdapter}
      customRowActions={customRowActions}
      breadcrumbs={[
        { label: i18n.t('rd.rs_code_page.k6'), href: RD_PATHS.root },
        { label: i18n.t('rd.rs_code_page.k5') },
      ]}
    />
  );
};
export default RsCodePage;
