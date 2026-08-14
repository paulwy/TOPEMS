import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, ChevronLeft, Book, Database, Users, Shield, Key, FileText } from 'lucide-react';
import { MobileHeader } from '@/components/mobile';
import { MobileNav } from '@/components/layout/MobileNav';
import { Box, Typography } from '@mui/material';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { DASHBOARD_PATHS } from '@/routes/dashboard';

const ct= designTokens.colors;

interface SystemManagementPageProps {
  onNavigate?: (page: string) => void;
}

const SystemManagementPage: React.FC<SystemManagementPageProps> = ({ onNavigate: _onNavigate }) => {
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const systemFeatures = [
    {
      id: 'users',
      title: '用户管理',
      description: '管理系统用户账户',
      icon: Users,
      path: '/iam/users',
      color: 'bg-blue-500',
    },
    {
      id: 'roles',
      title: '角色管理',
      description: '管理用户角色和权限组',
      icon: Shield,
      path: '/iam/roles',
      color: 'bg-purple-500',
    },
    {
      id: 'permissions',
      title: '权限管理',
      description: '配置系统权限',
      icon: Key,
      path: '/iam/permissions',
      color: 'bg-green-500',
    },
    {
      id: 'dictionaries',
      title: '字典管理',
      description: '管理系统字典和业务字典',
      icon: Book,
      path: '/iam/dictionaries',
      color: 'bg-amber-500',
    },
    {
      id: 'database',
      title: '数据库结构',
      description: '管理数据库表结构和字段',
      icon: Database,
      path: '/iam/database',
      color: 'bg-emerald-500',
    },
    {
      id: 'audit',
      title: '审计日志',
      description: '查看系统操作审计记录',
      icon: FileText,
      path: '/iam/audit',
      color: 'bg-slate-500',
    },
    {
      id: 'config',
      title: '系统配置',
      description: '系统参数和运行时配置',
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
          title='系统管理'
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
                  <Settings sx={{ width: 24, height: 24, color: 'common.white' }} />
                </Box>
                <Box>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 700, color: 'grey.900' }}
                  >
                    系统管理
                  </Typography>
                  <Typography
                    variant='caption'
                    sx={{ color: 'grey.500' }}
                  >
                    用户、角色、权限和系统配置
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
                        <Icon sx={{ width: 24, height: 24, color: 'common.white' }} />
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
                      进入管理 →
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
