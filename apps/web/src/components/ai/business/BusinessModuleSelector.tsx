import React from 'react';
import type { Theme } from '@mui/material/styles';
import { Box, Chip, Paper, Typography, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Grid } from '@/components/common';
import { Building2, Wallet, Users, Warehouse, Briefcase, FileText, LayoutGrid } from 'lucide-react';

export type BusinessModuleType = 'erp' | 'finance' | 'crm' | 'wms' | 'hr' | 'oa' | 'general';

type ModuleColorKey = 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' | 'grey';

interface BusinessModuleItem {
  id: BusinessModuleType;
  nameKey: string;
  descKey: string;
  icon: React.ReactNode;
  colorKey: ModuleColorKey;
}

const resolveModuleColor = (colorKey: ModuleColorKey, theme: Theme): string => {
  const p = theme.palette;
  switch (colorKey) {
    case 'primary':
      return p.primary.main;
    case 'secondary':
      return p.secondary.main;
    case 'success':
      return p.success.main;
    case 'error':
      return p.error.main;
    case 'warning':
      return p.warning.main;
    case 'info':
      return p.info.main;
    case 'grey':
      return p.grey[700];
    default:
      return p.primary.main;
  }
};

const BUSINESS_MODULES: BusinessModuleItem[] = [
  {
    id: 'erp',
    nameKey: 'ai.business_module_selector.erp.name',
    descKey: 'ai.business_module_selector.erp.description',
    icon: <Building2 size={24} />,
    colorKey: 'primary',
  },
  {
    id: 'finance',
    nameKey: 'ai.business_module_selector.finance.name',
    descKey: 'ai.business_module_selector.finance.description',
    icon: <Wallet size={24} />,
    colorKey: 'success',
  },
  {
    id: 'crm',
    nameKey: 'ai.business_module_selector.crm.name',
    descKey: 'ai.business_module_selector.crm.description',
    icon: <Users size={24} />,
    colorKey: 'error',
  },
  {
    id: 'wms',
    nameKey: 'ai.business_module_selector.wms.name',
    descKey: 'ai.business_module_selector.wms.description',
    icon: <Warehouse size={24} />,
    colorKey: 'warning',
  },
  {
    id: 'hr',
    nameKey: 'ai.business_module_selector.hr.name',
    descKey: 'ai.business_module_selector.hr.description',
    icon: <Briefcase size={24} />,
    colorKey: 'secondary',
  },
  {
    id: 'oa',
    nameKey: 'ai.business_module_selector.oa.name',
    descKey: 'ai.business_module_selector.oa.description',
    icon: <FileText size={24} />,
    colorKey: 'info',
  },
  {
    id: 'general',
    nameKey: 'ai.business_module_selector.general.name',
    descKey: 'ai.business_module_selector.general.description',
    icon: <LayoutGrid size={24} />,
    colorKey: 'grey', // eslint-disable-line topems-design/no-hardcoded-colors -- palette 键名非颜色字面量
  },
];

interface BusinessModuleSelectorProps {
  selectedModule?: BusinessModuleType;
  onSelect?: (module: BusinessModuleType) => void;
  compact?: boolean;
}

export const BusinessModuleSelector: React.FC<BusinessModuleSelectorProps> = ({
  selectedModule,
  onSelect,
  compact = false,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();

  if (compact) {
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        {BUSINESS_MODULES.map((mod) => (
          <Chip
            key={mod.id}
            label={t(mod.nameKey)}
            size='small'
            color={selectedModule === mod.id ? 'primary' : 'default'}
            variant={selectedModule === mod.id ? 'filled' : 'outlined'}
            onClick={() => onSelect?.(mod.id)}
            sx={{ cursor: 'pointer' }}
          />
        ))}
      </Box>
    );
  }

  return (
    <Box>
      <Typography
        variant='subtitle2'
        color='text.secondary'
        sx={{ mb: 1.5 }}
      >
        {t('ai.business_module_selector.title')}
      </Typography>
      <Grid
        container
        spacing={1.5}
      >
        {BUSINESS_MODULES.map((mod) => (
          <Grid
            xs={6}
            sm={4}
            md={3}
            key={mod.id}
          >
            <Paper
              elevation={selectedModule === mod.id ? 3 : 1}
              onClick={() => onSelect?.(mod.id)}
              sx={{
                p: 1.5,
                cursor: 'pointer',
                border: 2,
                borderColor:
                  selectedModule === mod.id
                    ? resolveModuleColor(mod.colorKey, theme)
                    : 'transparent',
                bgcolor:
                  selectedModule === mod.id
                    ? `${resolveModuleColor(mod.colorKey, theme)}08`
                    : 'background.paper',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: resolveModuleColor(mod.colorKey, theme),
                  bgcolor: `${resolveModuleColor(mod.colorKey, theme)}05`,
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Box sx={{ color: resolveModuleColor(mod.colorKey, theme) }}>{mod.icon}</Box>
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600 }}
                >
                  {t(mod.nameKey)}
                </Typography>
              </Box>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {t(mod.descKey)}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export const getBusinessModuleInfo = (
  moduleId: BusinessModuleType
): BusinessModuleItem | undefined => {
  return BUSINESS_MODULES.find((m) => m.id === moduleId);
};

export default BusinessModuleSelector;
