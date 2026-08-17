import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Settings, ChevronLeft, Book, Database, Users, Shield, Key, FileText } from 'lucide-react';
import { MobileHeader } from '@/components/mobile';
import { MobileNav } from '@/components/layout/MobileNav';
import { Box, Typography } from '@mui/material';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import i18n from '@/i18n';
import { adminApi } from '@/api/admin';

const ct = designTokens.colors;
interface SystemManagementPageProps {
  onNavigate?: (page: string) => void;
}
const SystemManagementPage: React.FC<SystemManagementPageProps> = ({ onNavigate: _onNavigate }) => {
  const navigate = useNavigate();
  const { data: backendData, isLoading: isBackendLoading } = useQuery({
    queryKey: ['admin-system-management'],
    queryFn: async () => {
      try {
        // TODO: adminApi 暂无 system management 对应方法
        return {};
      } catch {
        return {};
      }
    },
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const systemFeatures = [
    {
      id: 'users',
      title: i18n.t('admin.system_management_page.k0'),
      description: i18n.t('admin.system_management_page.k1'),
      icon: Users,
      path: '/iam/users',
      color: 'bg-blue-500',
    },
    {
      id: 'roles',
      title: i18n.t('admin.system_management_page.k2'),
      description: i18n.t('admin.system_management_page.k3'),
      icon: Shield,
      path: '/iam/roles',
      color: 'bg-purple-500',
    },
    {
      id: 'permissions',
      title: i18n.t('admin.system_management_page.k4'),
      description: i18n.t('admin.system_management_page.k5'),
      icon: Key,
      path: '/iam/permissions',
      color: 'bg-green-500',
    },
    {
      id: 'dictionaries',
      title: i18n.t('admin.system_management_page.k6'),
      description: i18n.t('admin.system_management_page.k7'),
      icon: Book,
      path: '/iam/dictionaries',
      color: 'bg-amber-500',
    },
    {
      id: 'database',
      title: i18n.t('admin.system_management_page.k8'),
      description: i18n.t('admin.system_management_page.k9'),
      icon: Database,
      path: '/iam/database',
      color: 'bg-emerald-500',
    },
    {
      id: 'audit',
      title: i18n.t('admin.system_management_page.k10'),
      description: i18n.t('admin.system_management_page.k11'),
      icon: FileText,
      path: '/iam/audit',
      color: 'bg-slate-500',
    },
    {
      id: 'config',
      title: i18n.t('admin.system_management_page.k12'),
      description: i18n.t('admin.system_management_page.k13'),
      icon: Settings,
      path: '/iam/debug',
      color: 'bg-indigo-500',
    },
  ];
  return (
    <PageContainer
      padding={false}
      sx={{ minHeight: '100vh' }}
      bgcolor='transparent'
    >
      <Box
        sx={{
          minHeight: '100vh',
          background: `linear-gradient(to bottom right, grey.100, ${ct.background.default})`,
        }}
      >
        <MobileHeader
          title={i18n.t('admin.system_management_page.k14')}
          onMenuClick={() => setMobileNavOpen(true)}
        />
        <Box sx={{ '& > .MuiIconButton-root': { display: 'none' } }}>
          <MobileNav
            open={mobileNavOpen}
            onClose={() => setMobileNavOpen(false)}
            onOpen={() => setMobileNavOpen(true)}
          />
        </Box>
        <Box
          sx={{
            bgcolor: 'background.paper',
            boxShadow: 1,
            borderBottom: 1,
            borderColor: 'divider',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
          className='desktop-only'
        >
          <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', height: 64 }}>
              <Box
                component='button'
                onClick={() => navigate(DASHBOARD_PATHS.dashboard)}
                sx={{
                  p: 1,
                  borderRadius: 1,
                  '&:hover': { bgcolor: 'grey.100' },
                  border: 'none',
                  bgcolor: 'transparent',
                  cursor: 'pointer',
                  mr: 1,
                }}
              >
                <ChevronLeft sx={{ width: 20, height: 20 }} />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    background: `linear-gradient(to bottom right, ${ct.grey[600]}, ${ct.grey[600]})`,
                    borderRadius: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 2,
                  }}
                >
                  <Settings
                    sx={{
                      width: 24,
                      height: 24,
                      color: 'common.white',
                    }}
                  />
                </Box>
                <Box>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 700, color: 'grey.900' }}
                  >
                    {i18n.t('pages.system_management_page.k0')}
                  </Typography>
                  <Typography
                    variant='caption'
                    sx={{ color: 'grey.500' }}
                  >
                    {i18n.t('pages.system_management_page.k1')}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
        <Box
          sx={{ maxWidth: 1200, mx: 'auto', px: 3, py: 4 }}
          className='desktop-only'
        >
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
            {systemFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <Box
                  key={feature.id}
                  onClick={() => navigate(feature.path)}
                  sx={{
                    bgcolor: 'background.paper',
                    borderRadius: 3,
                    boxShadow: 1,
                    '&:hover': { boxShadow: 3 },
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <Box sx={{ p: 3 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        mb: 2,
                      }}
                    >
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          bgcolor: feature.color.replace('bg-', ''),
                          borderRadius: 3,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: 2,
                          '&:hover': { transform: 'scale(1.1)' },
                          transition: 'transform 0.2s',
                        }}
                      >
                        <Icon
                          sx={{
                            width: 24,
                            height: 24,
                            color: 'common.white',
                          }}
                        />
                      </Box>
                    </Box>
                    <Typography
                      variant='h6'
                      sx={{ fontWeight: 600, color: 'grey.900', mb: 0.5 }}
                    >
                      {feature.title}
                    </Typography>
                    <Typography
                      variant='body2'
                      sx={{ color: 'grey.600', mb: 2 }}
                    >
                      {feature.description}
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        color: 'primary.main',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                      }}
                    >
                      {i18n.t('pages.system_management_page.k2')}
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>
    </PageContainer>
  );
};
export default SystemManagementPage;
