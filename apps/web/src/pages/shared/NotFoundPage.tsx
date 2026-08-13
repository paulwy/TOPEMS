import React, { useMemo } from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import { Home, Search, FileQuestion } from 'lucide-react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { navigationRegistryV2 } from '@/lib/navigation';
import type { ModuleCardConfig } from '@/lib/navigation/types';
import { lucideIcons } from '@/lib/iconMapping';
import { DASHBOARD_PATHS } from '@/routes/dashboard';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  const suggestedModules = useMemo<ModuleCardConfig[]>(() => {
    try {
      const cards = navigationRegistryV2.getModuleCards?.() ?? [];
      return cards.slice(0, 6);
    } catch {
      return [];
    }
  }, []);

  return (
    <Box
      className='not-found-page'
      sx={{
        minHeight: '100vh',
        bgcolor: 'grey.100',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 4,
      }}
    >
      <Box
        sx={{
          maxWidth: 640,
          width: '100%',
          textAlign: 'center',
        }}
      >
        {/* 404 数字展示 */}
        <Typography
          component='div'
          sx={{
            fontSize: { xs: 96, sm: 144 },
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: '-0.05em',
            background: 'linear-gradient(135deg, primary.main 0%, secondary.main 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 2,
            userSelect: 'none',
          }}
        >
          404
        </Typography>

        <Box
          sx={{
            width: 72,
            height: 72,
            bgcolor: 'primary.100',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
          }}
        >
          <FileQuestion sx={{ width: 36, height: 36, color: 'primary.main' }} />
        </Box>

        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'grey.900', mb: 1 }}
        >
          页面未找到
        </Typography>
        <Typography
          variant='body1'
          sx={{ color: 'grey.600', mb: 4 }}
        >
          抱歉，您访问的页面不存在，可能链接已失效或已被移除
        </Typography>

        {/* 操作按钮组 */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: 1.5,
            mb: 6,
          }}
        >
          <Button
            variant='contained'
            size='large'
            startIcon={<Home />}
            onClick={() => navigate(DASHBOARD_PATHS.dashboard)}
            sx={{ borderRadius: 2, px: 3, py: 1.25 }}
          >
            返回首页
          </Button>
          <Button
            variant='outlined'
            size='large'
            startIcon={<Search />}
            onClick={() => navigate(DASHBOARD_PATHS.modules)}
            sx={{ borderRadius: 2, px: 3, py: 1.25 }}
          >
            浏览模块
          </Button>
          <Button
            variant='text'
            size='large'
            onClick={() => navigate(-1)}
            sx={{ borderRadius: 2, px: 3, py: 1.25 }}
          >
            返回上一页
          </Button>
        </Box>

        {/* 推荐模块入口 */}
        {suggestedModules.length > 0 && (
          <Box sx={{ textAlign: 'left' }}>
            <Typography
              variant='subtitle2'
              sx={{ color: 'text.secondary', mb: 2, fontWeight: 500 }}
            >
              也许您想访问：
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, 1fr)',
                  sm: 'repeat(3, 1fr)',
                },
                gap: 1.5,
              }}
            >
              {suggestedModules.map((mod) => {
                const targetPath = mod.path || '/modules';
                const IconComp = mod.icon
                  ? (lucideIcons as Record<string, React.ComponentType<{ size?: number }>>)[
                      mod.icon
                    ]
                  : undefined;
                return (
                  <Paper
                    key={mod.code}
                    component={RouterLink}
                    to={targetPath}
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: 1,
                      borderColor: 'divider',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.25,
                      textDecoration: 'none',
                      color: 'inherit',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'action.hover',
                        transform: 'translateY(-1px)',
                        boxShadow: 2,
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 1.5,
                        bgcolor: 'primary.50',
                        color: 'primary.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {IconComp ? <IconComp size={18} /> : <Search size={18} />}
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        sx={{
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: 'text.primary',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {mod.name}
                      </Typography>
                      {mod.description && (
                        <Typography
                          sx={{
                            fontSize: '0.75rem',
                            color: 'text.secondary',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {mod.description}
                        </Typography>
                      )}
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default NotFoundPage;
