import React, { useMemo } from 'react';
import { Box, Chip, Grid } from '@mui/material';
import { Settings, Zap, Package, Shield } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { ColumnDef } from '@/components/templates/list/types';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { pdmApi, type ProductConfig } from '@/api/pdm';
import { productConfigSchema } from '@/schemas/pdm/productConfig';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const ct = designTokens.colors;

interface FlatProductConfig {
  id: string;
  name: string;
  code: string;
  status: string;
  color: string;
  size: string;
  material: string;
  grade: string;
  options: string[];
  created_at: string;
}

function flattenConfig(config: ProductConfig): FlatProductConfig {
  return {
    id: config.id,
    name: config.name,
    code: config.code,
    status: config.status,
    color: config.attributes?.color || '',
    size: config.attributes?.size || '',
    material: config.attributes?.material || '',
    grade: config.attributes?.grade || '',
    options: config.options || [],
    created_at: config.created_at,
  };
}

function nestConfig(flat: Partial<FlatProductConfig>) {
  return {
    name: flat.name as string,
    code: flat.code as string,
    status: flat.status as string,
    attributes: {
      color: flat.color as string,
      size: flat.size as string,
      material: flat.material as string,
      grade: flat.grade as string,
    },
    options: (flat.options as string[]) || [],
  };
}

const apiAdapter: CrudApiAdapter = {
  list: async () => {
    const response = await pdmApi.listProductConfigs();
    if (response.success && response.data) {
      const data = response.data as unknown as Record<string, unknown>;
      const items = Array.isArray(data) ? data : data.configs || [];
      const flatItems = (items as ProductConfig[]).map(flattenConfig);
      return { data: flatItems as unknown as Record<string, unknown>[], total: flatItems.length };
    }
    return { data: [], total: 0 };
  },
  create: async (data) => {
    const response = await pdmApi.createProductConfig(
      nestConfig(data as unknown as Partial<FlatProductConfig>)
    );
    if (response.success && response.data) {
      return flattenConfig(response.data) as unknown as Record<string, unknown>;
    }
    throw new Error(i18n.t('pdm.pdm_product_config_page.k0'));
  },
  update: async (id, data) => {
    const response = await pdmApi.updateProductConfig(
      id,
      nestConfig(data as unknown as Partial<FlatProductConfig>)
    );
    if (response.success && response.data) {
      return flattenConfig(response.data) as unknown as Record<string, unknown>;
    }
    throw new Error(i18n.t('pdm.pdm_product_config_page.k1'));
  },
  delete: async (id) => {
    const response = await pdmApi.deleteProductConfig(id);
    if (!response.success) {
      throw new Error(i18n.t('pdm.pdm_product_config_page.k2'));
    }
  },
};

function getStatusColor(status: string): 'success' | 'warning' | 'error' | 'default' {
  switch (status) {
    case 'active':
      return 'success';
    case 'draft':
      return 'warning';
    case 'archived':
      return 'error';
    default:
      return 'default';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'active':
      return i18n.t('pdm.pdm_product_config_page.k3');
    case 'draft':
      return i18n.t('pdm.pdm_product_config_page.k4');
    case 'archived':
      return i18n.t('pdm.pdm_product_config_page.k5');
    default:
      return status;
  }
}

export const PdmProductConfigPage: React.FC = () => {
  const { t } = useTranslation('pdm');
  const { data: configs = [] } = useQuery<FlatProductConfig[]>({
    queryKey: QUERY_KEYS.PDM.PRODUCT_CONFIGS,
    queryFn: async (): Promise<FlatProductConfig[]> => {
      const response = await pdmApi.listProductConfigs();
      if (response.success && response.data) {
        const data = response.data as unknown as Record<string, unknown>;
        const items = Array.isArray(data) ? data : data.configs || [];
        return (items as ProductConfig[]).map(flattenConfig);
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const stats = useMemo(
    () => ({
      total: configs.length,
      active: configs.filter((c) => c.status === 'active').length,
      draft: configs.filter((c) => c.status === 'draft').length,
      archived: configs.filter((c) => c.status === 'archived').length,
    }),
    [configs]
  );

  const customColumns: ColumnDef[] = useMemo(
    () => [
      { id: 'name', label: i18n.t('pdm.pdm_product_config_page.k6'), minWidth: 140 },
      { id: 'code', label: i18n.t('pdm.pdm_product_config_page.k7'), minWidth: 120 },
      {
        id: 'attributes',
        label: i18n.t('pdm.pdm_product_config_page.k8'),
        minWidth: 180,
        render: (row) => (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <span style={{ fontSize: '0.875rem' }}>
              {String(row.color || '-')} / {String(row.size || '-')}
            </span>
            <span style={{ fontSize: '0.75rem', color: ct.text.muted }}>
              {String(row.material || '-')} / {String(row.grade || '-')}
            </span>
          </Box>
        ),
      },
      {
        id: 'options',
        label: i18n.t('pdm.pdm_product_config_page.k9'),
        minWidth: 160,
        render: (row) => (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {((row.options as string[]) || []).map((option, idx) => (
              <Chip
                key={idx}
                size='small'
                label={option}
                variant='outlined'
              />
            ))}
          </Box>
        ),
      },
      {
        id: 'status',
        label: i18n.t('pdm.pdm_product_config_page.k10'),
        minWidth: 100,
        align: 'center',
        render: (row) => (
          <Chip
            size='small'
            label={getStatusLabel(String(row.status ?? ''))}
            color={getStatusColor(String(row.status ?? ''))}
          />
        ),
      },
    ],
    []
  );

  const headerContent = (
    <Box>
      <Grid
        container
        spacing={3}
        sx={{ mb: 2 }}
      >
        {[
          {
            label: t('pdm.pdm_product_config_page.k11'),
            value: stats.total,
            icon: <Settings size={20} />,
            color: 'primary',
          },
          {
            label: t('pdm.pdm_product_config_page.k12'),
            value: stats.active,
            icon: <Zap size={20} />,
            color: 'success',
          },
          {
            label: t('pdm.pdm_product_config_page.k13'),
            value: stats.draft,
            icon: <Package size={20} />,
            color: 'warning',
          },
          {
            label: t('pdm.pdm_product_config_page.k14'),
            value: stats.archived,
            icon: <Shield size={20} />,
            color: 'error',
          },
        ].map((stat) => (
          <Grid
            size={{ xs: 6, sm: 3 }}
            key={stat.label}
          >
            <Box
              sx={{
                p: 2,
                borderRadius: 3,
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  mb: 1,
                  color: `${stat.color}.main`,
                }}
              >
                {stat.icon}
                <Box sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>{stat.label}</Box>
              </Box>
              <Box sx={{ fontWeight: 'bold', fontSize: '1.5rem' }}>{stat.value}</Box>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Settings style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.secondary[400]} 0%, ${ct.secondary[600]} 100%)`,
      }}
    >
      <CrudPage
        schema={productConfigSchema}
        apiAdapter={apiAdapter}
        customColumns={customColumns}
        breadcrumbs={[{ label: 'PDM' }, { label: t('pdm.pdm_product_config_page.k15') }]}
        headerContent={headerContent}
      />
    </PageContainer>
  );
};

export default PdmProductConfigPage;
