import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box } from '@mui/material';
import { ModuleCard, type ModuleItem, ModuleNavigationSection } from '@/components/dashboard';

interface DashboardModuleNavProps {
  coreModules: ModuleItem[];
  businessModules: ModuleItem[];
  systemServicesModules: ModuleItem[];
  navigate: (path: string) => void;
}

const DashboardModuleNav: React.FC<DashboardModuleNavProps> = ({
  coreModules,
  businessModules,
  systemServicesModules,
  navigate,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <ModuleNavigationSection title={t('shared.dashboard.section_core')}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, 1fr)',
              lg: 'repeat(3, 1fr)',
            },
            gap: 3,
          }}
        >
          {coreModules.map((item) => (
            <ModuleCard
              key={item.title}
              item={item}
              onClick={() => navigate(item.path)}
              size='large'
            />
          ))}
        </Box>
      </ModuleNavigationSection>

      <ModuleNavigationSection title={t('shared.dashboard.section_business')}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
            gap: 3,
          }}
        >
          {businessModules.map((item) => (
            <ModuleCard
              key={item.title}
              item={item}
              onClick={() => navigate(item.path)}
              size='small'
            />
          ))}
        </Box>
      </ModuleNavigationSection>

      {systemServicesModules.length > 0 && (
        <ModuleNavigationSection title={t('shared.dashboard.section_system')}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(2, 1fr)',
                lg: 'repeat(4, 1fr)',
              },
              gap: 3,
            }}
          >
            {systemServicesModules.map((item) => (
              <ModuleCard
                key={item.title}
                item={item}
                onClick={() => navigate(item.path)}
                size='medium'
              />
            ))}
          </Box>
        </ModuleNavigationSection>
      )}
    </>
  );
};

export default DashboardModuleNav;
