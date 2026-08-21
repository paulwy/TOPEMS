import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Pencil } from 'lucide-react';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import type { RowAction } from '@/components/templates/list/types';
import { projectSchema } from '@/schemas/rd';
import { rdApi } from '@/api/rd';
import { RD_PATHS } from '@/modules/rd/config';
import i18n from '@/i18n';

const projectApiAdapter = createCrudPageAdapter(
  {
    list: (params?: any) => rdApi.listProjects(params),
    create: (data: any) => rdApi.createProject(data),
    update: (id: string, data: any) => rdApi.updateProject(id, data),
    delete: (id: string) => rdApi.deleteProject(id),
  },
  { itemsField: 'projects' }
);
const RsProjectListPage: React.FC = () => {
  const navigate = useNavigate();
  const customRowActions: RowAction[] = [
    {
      key: 'view-detail',
      label: i18n.t('rd.rs_project_list_page.k4'),
      icon: <Eye size={16} />,
      onClick: (row) => navigate(`${RD_PATHS.project}/${row.id}`),
    },
    {
      key: 'edit-page',
      label: i18n.t('rd.rs_project_list_page.k5'),
      icon: <Pencil size={16} />,
      onClick: (row) => navigate(`${RD_PATHS.project}/${row.id}/edit`),
    },
  ];
  return (
    <CrudPage
      schema={projectSchema}
      apiAdapter={projectApiAdapter}
      customRowActions={customRowActions}
      breadcrumbs={[
        { label: i18n.t('rd.rs_project_list_page.k7'), href: RD_PATHS.root },
        { label: i18n.t('rd.rs_project_list_page.k6') },
      ]}
    />
  );
};
export default RsProjectListPage;
