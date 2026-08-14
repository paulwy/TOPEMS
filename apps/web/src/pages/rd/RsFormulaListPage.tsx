import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit, Trash2 } from 'lucide-react';
import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { formulaSchema } from '@/schemas/rd';
import { formulaApi } from '@/api/rd';
import type { Formula, CreateFormulaRequest, UpdateFormulaRequest } from '@/api/rd';
import { PageContainer } from '@/components/common';
import { RD_PATHS } from '@/modules/rd/config';
import i18n from '@/i18n';
const baseAdapter = createCrudPageAdapter<Formula, CreateFormulaRequest, UpdateFormulaRequest>({
  list: formulaApi.listFormulas,
  create: formulaApi.createFormula,
  update: formulaApi.updateFormula,
  delete: formulaApi.deleteFormula,
});
const formulaAdapter = baseAdapter as unknown as CrudApiAdapter<Formula>;
const RsFormulaListPage: React.FC = () => {
  const navigate = useNavigate();
  const customRowActions: RowAction<Record<string, unknown>>[] = [
    {
      label: i18n.t('rd.rs_formula_list_page.k0'),
      icon: <Eye size={16} />,
      onClick: (row) => navigate(`${RD_PATHS.formula}/${row.id}`),
    },
    {
      label: i18n.t('rd.rs_formula_list_page.k1'),
      icon: <Edit size={16} />,
      onClick: (row) => navigate(`${RD_PATHS.formula}/${row.id}/edit`),
    },
    {
      label: i18n.t('rd.rs_formula_list_page.k2'),
      icon: <Trash2 size={16} />,
      color: 'error',
      onClick: () => {},
    },
  ];
  return (
    <PageContainer
      title={i18n.t('rd.rs_formula_list_page.k3')}
      subtitle={i18n.t('rd.rs_formula_list_page.k4')}
      maxWidth='xl'
    >
      <CrudPage
        schema={formulaSchema}
        apiAdapter={formulaAdapter}
        breadcrumbs={[
          { label: i18n.t('rd.rs_formula_list_page.k5'), href: '/dashboard' },
          { label: i18n.t('rd.rs_formula_list_page.k6'), href: '/rs' },
          { label: i18n.t('rd.rs_formula_list_page.k7') },
        ]}
        customRowActions={customRowActions}
      />
    </PageContainer>
  );
};
export default RsFormulaListPage;