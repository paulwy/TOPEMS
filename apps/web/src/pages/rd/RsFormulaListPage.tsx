import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit, Trash2, Plus } from 'lucide-react';
import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { formulaSchema } from '@/schemas/rd';
import { formulaApi } from '@/api/rd';
import type { Formula, CreateFormulaRequest, UpdateFormulaRequest } from '@/api/rd';
import { PageContainer } from '@/components/common/PageContainer';
import { RD_PATHS } from '@/modules/rd/config';

const baseAdapter = createCrudPageAdapter<Formula, CreateFormulaRequest, UpdateFormulaRequest>(
  formulaApi
);

const formulaAdapter: CrudApiAdapter<Formula> = {
  list: baseAdapter.list,
  create: baseAdapter.create,
  update: baseAdapter.update,
  delete: baseAdapter.delete,
};

const RsFormulaListPage: React.FC = () => {
  const navigate = useNavigate();

  const customRowActions: RowAction<Record<string, unknown>>[] = [
    {
      label: '查看',
      icon: <Eye size={16} />,
      onClick: (row) => navigate(`${RD_PATHS.formula}/${row.id}`),
    },
    {
      label: '编辑',
      icon: <Edit size={16} />,
      onClick: (row) => navigate(`${RD_PATHS.formula}/${row.id}/edit`),
    },
    {
      label: '删除',
      icon: <Trash2 size={16} />,
      color: 'error',
      onClick: () => {},
    },
  ];

  return (
    <PageContainer
      title='配方管理'
      subtitle='管理研发配方、版本控制、配方发布'
      maxWidth='xl'
    >
      <CrudPage
        schema={formulaSchema}
        apiAdapter={formulaAdapter}
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: '研发', href: '/rs' },
          { label: '配方管理' },
        ]}
        customRowActions={customRowActions}
      />
    </PageContainer>
  );
};

export default RsFormulaListPage;
