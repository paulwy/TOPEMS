import React, { useState } from 'react';
import { Paper, Tabs, Tab, useTheme, useMediaQuery } from '@mui/material';
import { FlaskConical as Flask, Eye, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CrudPage, type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { experimentSchema } from '@/schemas/rd';
import { rdApi } from '@/api/rd';
import type { Experiment } from '@/api/rd';
import { RD_PATHS } from '@/modules/rd/config';
import i18n from '@/i18n';

const experimentApiAdapter: CrudApiAdapter<Experiment> = {
  list: async (params) => {
    const queryParams: Record<string, unknown> = {
      page: params?.page,
      page_size: params?.pageSize,
    };
    if (params?.search) queryParams.search = params.search;
    if (params?.status) queryParams.status = params.status;
    const phaseTab = Number(params?.phaseTab ?? 0);
    let response;
    switch (phaseTab) {
      case 1:
        response = await rdApi.listLabExperiments(queryParams);
        break;
      case 2:
        response = await rdApi.listPilotExperiments(queryParams);
        break;
      case 3:
        response = await rdApi.listScaleupExperiments(queryParams);
        break;
      default:
        response = await rdApi.listExperiments(queryParams);
    }
    if (!response.success || !response.data) {
      throw new Error(response.message || i18n.t('rd.rs_experiment_list_page.k0'));
    }
    return {
      data: response.data.experiments || [],
      total: response.data.total || 0,
    };
  },
  create: async (data) => {
    const response = await rdApi.createExperiment(
      data as Parameters<typeof rdApi.createExperiment>[0]
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || i18n.t('rd.rs_experiment_list_page.k1'));
    }
    return response.data;
  },
  update: async (id, data) => {
    const response = await rdApi.updateExperiment(
      id,
      data as Parameters<typeof rdApi.updateExperiment>[1]
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || i18n.t('rd.rs_experiment_list_page.k2'));
    }
    return response.data;
  },
  delete: async (id) => {
    const response = await rdApi.deleteExperiment(id);
    if (!response.success) {
      throw new Error(response.message || i18n.t('rd.rs_experiment_list_page.k3'));
    }
  },
};
interface ExperimentPhaseTabsProps {
  activeTab: number;
  onChange: (value: number) => void;
}
const ExperimentPhaseTabs: React.FC<ExperimentPhaseTabsProps> = ({ activeTab, onChange }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  return (
    <Paper sx={{ mb: 3 }}>
      <Tabs
        value={activeTab}
        onChange={(_, v: number) => onChange(v)}
        variant={isMobile ? 'scrollable' : 'standard'}
        scrollButtons={isMobile}
      >
        <Tab label={i18n.t('rd.rs_experiment_list_page.k4')} />
        <Tab
          label={i18n.t('rd.rs_experiment_list_page.k5')}
          icon={<Flask size={16} />}
          iconPosition='start'
        />
        <Tab
          label={i18n.t('rd.rs_experiment_list_page.k6')}
          icon={<Flask size={16} />}
          iconPosition='start'
        />
        <Tab
          label={i18n.t('rd.rs_experiment_list_page.k7')}
          icon={<Flask size={16} />}
          iconPosition='start'
        />
      </Tabs>
    </Paper>
  );
};
const RsExperimentListPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const customRowActions: RowAction[] = [
    {
      key: 'view-detail',
      label: i18n.t('rd.rs_experiment_list_page.k8'),
      icon: <Eye size={16} />,
      onClick: (row) => navigate(`${RD_PATHS.experiment}/${row.id}`),
    },
    {
      key: 'edit-page',
      label: i18n.t('rd.rs_experiment_list_page.k9'),
      icon: <Edit size={16} />,
      onClick: (row) => navigate(`${RD_PATHS.experiment}/${row.id}/edit`),
    },
  ];
  return (
    <CrudPage
      key={activeTab}
      schema={experimentSchema}
      apiAdapter={experimentApiAdapter}
      customRowActions={customRowActions}
      extraQueryParams={{ phaseTab: activeTab }}
      headerContent={
        <ExperimentPhaseTabs
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      }
      breadcrumbs={[
        { label: i18n.t('rd.rs_experiment_list_page.k11'), href: RD_PATHS.root },
        { label: i18n.t('rd.rs_experiment_list_page.k10') },
      ]}
    />
  );
};
export default RsExperimentListPage;
