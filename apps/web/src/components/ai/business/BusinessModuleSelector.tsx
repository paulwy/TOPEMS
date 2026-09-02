import React from 'react';
import {
  Box,
  Chip,
  Paper,
  Typography,
  useTheme,
} from '@mui/material';
import { Grid } from '@/components/common';
import {
  Building2,
  Wallet,
  Users,
  Warehouse,
  Briefcase,
  FileText,
  LayoutGrid,
} from 'lucide-react';

export type BusinessModuleType = 'erp' | 'finance' | 'crm' | 'wms' | 'hr' | 'oa' | 'general';

interface BusinessModuleItem {
  id: BusinessModuleType;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const BUSINESS_MODULES: BusinessModuleItem[] = [
  {
    id: 'erp',
    name: 'ERP',
    description: '企业资源规划',
    icon: <Building2 size={24} />,
    color: '#1976d2',
  },
  {
    id: 'finance',
    name: '财务',
    description: '财务管理',
    icon: <Wallet size={24} />,
    color: '#388e3c',
  },
  {
    id: 'crm',
    name: 'CRM',
    description: '客户关系管理',
    icon: <Users size={24} />,
    color: '#d32f2f',
  },
  {
    id: 'wms',
    name: 'WMS',
    description: '仓库管理',
    icon: <Warehouse size={24} />,
    color: '#f57c00',
  },
  {
    id: 'hr',
    name: 'HR',
    description: '人力资源',
    icon: <Briefcase size={24} />,
    color: '#7b1fa2',
  },
  {
    id: 'oa',
    name: 'OA',
    description: '办公自动化',
    icon: <FileText size={24} />,
    color: '#0097a7',
  },
  {
    id: 'general',
    name: '通用',
    description: '通用助手',
    icon: <LayoutGrid size={24} />,
    color: '#616161',
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

  if (compact) {
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        {BUSINESS_MODULES.map((mod) => (
          <Chip
            key={mod.id}
            label={mod.name}
            size="small"
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
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
        选择业务模块
      </Typography>
      <Grid container spacing={1.5}>
        {BUSINESS_MODULES.map((mod) => (
          <Grid xs={6} sm={4} md={3} key={mod.id}>
            <Paper
              elevation={selectedModule === mod.id ? 3 : 1}
              onClick={() => onSelect?.(mod.id)}
              sx={{
                p: 1.5,
                cursor: 'pointer',
                border: 2,
                borderColor: selectedModule === mod.id ? mod.color : 'transparent',
                bgcolor: selectedModule === mod.id ? `${mod.color}08` : 'background.paper',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: mod.color,
                  bgcolor: `${mod.color}05`,
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Box sx={{ color: mod.color }}>{mod.icon}</Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {mod.name}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {mod.description}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export const getBusinessModuleInfo = (moduleId: BusinessModuleType): BusinessModuleItem | undefined => {
  return BUSINESS_MODULES.find((m) => m.id === moduleId);
};

export default BusinessModuleSelector;
