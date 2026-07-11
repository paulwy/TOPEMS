import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Card, CardContent, Stack, Chip, Button } from '@mui/material';
import { Settings, Database, Cloud, Zap, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useErpConnections } from '@/hooks/useExternalErp';
import { PageContainer } from '@/components/common';
import { INTEGRATION_PATHS } from '@/modules/integration/config';

interface ErpConnection {
  id: string;
  type: string;
  name: string;
  api_url: string;
  sync_direction: string;
  sync_mode: string;
  status?: string;
  isactive?: boolean;
  last_sync_at?: string;
}

const ERP_TYPE_CONFIG: Record<string, { name: string; logo: string; color: string }> = {
  kingdee: {
    name: '金蝶K/3',
    logo: 'K',
    color: 'primary.main',
  },
  yonyou: {
    name: '用友U8',
    logo: 'Y',
    color: 'warning.main',
  },
  sap: {
    name: 'SAP S/4',
    logo: 'S',
    color: 'success.dark',
  },
};

const STATUS_CONFIG: Record<
  string,
  { label: string; color: 'success' | 'default' | 'error' | 'warning' }
> = {
  connected: {
    label: '已连接',
    color: 'success',
  },
  disconnected: {
    label: '未连接',
    color: 'default',
  },
  error: {
    label: '连接错误',
    color: 'error',
  },
  syncing: {
    label: '同步中',
    color: 'warning',
  },
};

const IntegrationExternalErpOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: connectionsData, isLoading } = useErpConnections();

  const connections = useMemo(() => {
    return connectionsData?.data?.items || [];
  }, [connectionsData]);

  const connectionStats = useMemo(() => {
    const stats = {
      total: connections.length,
      connected: connections.filter((c: ErpConnection) => c.status === 'connected').length,
      active: connections.filter((c: ErpConnection) => c.isactive).length,
      disconnected: connections.filter((c: ErpConnection) => c.status !== 'connected').length,
    };
    return stats;
  }, [connections]);

  const groupedByType = useMemo(() => {
    const groups: Record<string, ErpConnection[]> = {};
    connections.forEach((conn: ErpConnection) => {
      if (!groups[conn.type]) {
        groups[conn.type] = [];
      }
      groups[conn.type].push(conn);
    });
    return groups;
  }, [connections]);

  return (
    <PageContainer maxWidth='xl'>
      <Box>
        <Stack
          direction='row'
          sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 3 }}
        >
          <Box>
            <Typography
              variant='h5'
              sx={{ fontWeight: 700, color: 'text.primary' }}
            >
              🔗 外部ERP连接管理
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              管理和配置与外部ERP系统的连接，包括金蝶、用友、SAP等
            </Typography>
          </Box>
          <Button
            variant='contained'
            startIcon={<Settings size={18} />}
            onClick={() => navigate(INTEGRATION_PATHS.externalErp)}
            sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
          >
            管理连接
          </Button>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
            gap: 2,
            mb: 3,
          }}
        >
          <Card>
            <CardContent sx={{ pt: 3 }}>
              <Stack
                direction='row'
                sx={{ alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'grey.500' }}
                  >
                    总连接数
                  </Typography>
                  <Typography
                    variant='h4'
                    sx={{ fontWeight: 700, mt: 0.5 }}
                  >
                    {connectionStats.total}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 1,
                    bgcolor: 'primary.light',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Database
                    size={24}
                    color='primary.main'
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ pt: 3 }}>
              <Stack
                direction='row'
                sx={{ alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'grey.500' }}
                  >
                    已连接
                  </Typography>
                  <Typography
                    variant='h4'
                    sx={{ fontWeight: 700, mt: 0.5, color: 'success.main' }}
                  >
                    {connectionStats.connected}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 1,
                    bgcolor: 'success.light',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircle
                    size={24}
                    color='success.main'
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ pt: 3 }}>
              <Stack
                direction='row'
                sx={{ alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'grey.500' }}
                  >
                    已启用
                  </Typography>
                  <Typography
                    variant='h4'
                    sx={{ fontWeight: 700, mt: 0.5, color: 'secondary.main' }}
                  >
                    {connectionStats.active}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 1,
                    bgcolor: 'secondary.light',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Zap
                    size={24}
                    color='secondary.main'
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ pt: 3 }}>
              <Stack
                direction='row'
                sx={{ alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'grey.500' }}
                  >
                    未连接
                  </Typography>
                  <Typography
                    variant='h4'
                    sx={{ fontWeight: 700, mt: 0.5, color: 'error.main' }}
                  >
                    {connectionStats.disconnected}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 1,
                    bgcolor: 'error.light',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AlertCircle
                    size={24}
                    color='error.main'
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 3,
            mb: 3,
          }}
        >
          {Object.entries(groupedByType).map(([type, conns]) => {
            const config = ERP_TYPE_CONFIG[type] || {
              name: type,
              logo: '?',
              color: 'text.disabled',
            };
            return (
              <Card
                key={type}
                sx={{
                  borderColor: config.color,
                  borderWidth: 2,
                  borderStyle: 'solid',
                }}
              >
                <CardContent>
                  <Stack
                    direction='row'
                    sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
                  >
                    <Typography
                      variant='h6'
                      sx={{
                        fontWeight: 600,
                        color: 'text.primary',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <Cloud size={20} /> {config.name}
                    </Typography>
                    <Chip
                      label={`${conns.length} 个连接`}
                      size='small'
                    />
                  </Stack>

                  <Stack spacing={2}>
                    {conns.map((conn: ErpConnection) => {
                      const statusConfig = STATUS_CONFIG[conn.status || 'disconnected'];
                      return (
                        <Stack
                          key={conn.id}
                          direction='row'
                          sx={{
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            p: 2,
                            borderRadius: 1,
                            bgcolor: 'grey.50',
                          }}
                        >
                          <Box>
                            <Typography
                              variant='body2'
                              sx={{ fontWeight: 500 }}
                            >
                              {conn.name}
                            </Typography>
                            <Typography
                              variant='caption'
                              color='text.secondary'
                            >
                              {conn.sync_direction === 'bidirectional'
                                ? '双向同步'
                                : conn.sync_direction === 'import'
                                  ? '导入'
                                  : '导出'}
                              {' / '}
                              {conn.sync_mode === 'realtime'
                                ? '实时'
                                : conn.sync_mode === 'scheduled'
                                  ? '定时'
                                  : '手动'}
                            </Typography>
                          </Box>
                          <Chip
                            label={statusConfig.label}
                            color={statusConfig.color}
                            size='small'
                          />
                        </Stack>
                      );
                    })}
                  </Stack>

                  <Button
                    size='small'
                    variant='outlined'
                    startIcon={<Settings size={14} />}
                    onClick={() => navigate(INTEGRATION_PATHS.externalErp)}
                    sx={{ mt: 2 }}
                  >
                    管理连接
                  </Button>
                </CardContent>
              </Card>
            );
          })}

          {Object.keys(groupedByType).length === 0 && (
            <>
              <Card
                sx={{
                  borderColor: 'primary.main',
                  borderWidth: 2,
                  borderStyle: 'solid',
                  cursor: 'pointer',
                  '&:hover': { opacity: 0.8 },
                }}
                onClick={() => navigate(INTEGRATION_PATHS.externalErp)}
              >
                <CardContent>
                  <Stack
                    direction='row'
                    sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
                  >
                    <Typography
                      variant='h6'
                      sx={{
                        fontWeight: 600,
                        color: 'text.primary',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <Cloud size={20} /> 金蝶K/3
                    </Typography>
                  </Stack>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    连接金蝶K/3 WMS Cloud系统，实现数据同步
                  </Typography>
                  <Button
                    size='small'
                    variant='contained'
                    startIcon={<Settings size={14} />}
                    sx={{ mt: 2, bgcolor: 'primary.dark' }}
                  >
                    管理连接
                  </Button>
                </CardContent>
              </Card>

              <Card
                sx={{
                  borderColor: 'warning.main',
                  borderWidth: 2,
                  borderStyle: 'solid',
                  cursor: 'pointer',
                  '&:hover': { opacity: 0.8 },
                }}
                onClick={() => navigate(INTEGRATION_PATHS.externalErp)}
              >
                <CardContent>
                  <Stack
                    direction='row'
                    sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
                  >
                    <Typography
                      variant='h6'
                      sx={{
                        fontWeight: 600,
                        color: 'text.primary',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <Cloud size={20} /> 用友U8/NC
                    </Typography>
                  </Stack>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    连接用友U8或NC系统，实现财务数据同步
                  </Typography>
                  <Button
                    size='small'
                    variant='contained'
                    startIcon={<Settings size={14} />}
                    sx={{ mt: 2, bgcolor: 'warning.600' }}
                  >
                    管理连接
                  </Button>
                </CardContent>
              </Card>

              <Card
                sx={{
                  borderColor: 'success.main',
                  borderWidth: 2,
                  borderStyle: 'solid',
                  cursor: 'pointer',
                  '&:hover': { opacity: 0.8 },
                }}
                onClick={() => navigate(INTEGRATION_PATHS.externalErp)}
              >
                <CardContent>
                  <Stack
                    direction='row'
                    sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
                  >
                    <Typography
                      variant='h6'
                      sx={{
                        fontWeight: 600,
                        color: 'text.primary',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <Cloud size={20} /> SAP S/4HANA
                    </Typography>
                  </Stack>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    连接SAP S/4HANA系统，实现业务数据集成
                  </Typography>
                  <Button
                    size='small'
                    variant='contained'
                    startIcon={<Settings size={14} />}
                    sx={{ mt: 2, bgcolor: 'success.dark' }}
                  >
                    管理连接
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </Box>

        <Card>
          <CardContent>
            <Typography
              variant='h6'
              sx={{ fontWeight: 600, color: 'text.primary', mb: 2 }}
            >
              🔗 外部ERP连接说明
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              管理和配置与外部ERP系统的连接，包括金蝶、用友、SAP等。支持数据映射、同步配置和实时监控。
              详细信息请访问外部ERP连接页面。
            </Typography>

            <Stack
              direction='row'
              sx={{ mt: 3, gap: 4 }}
            >
              <Stack spacing={1}>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500 }}
                >
                  支持的ERP系统
                </Typography>
                <Stack
                  direction='row'
                  spacing={1}
                >
                  <Chip
                    label='金蝶K/3'
                    size='small'
                  />
                  <Chip
                    label='用友U8'
                    size='small'
                  />
                  <Chip
                    label='SAP S/4'
                    size='small'
                  />
                </Stack>
              </Stack>
              <Stack spacing={1}>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500 }}
                >
                  同步方式
                </Typography>
                <Stack
                  direction='row'
                  spacing={1}
                >
                  <Chip
                    label='实时同步'
                    size='small'
                  />
                  <Chip
                    label='定时同步'
                    size='small'
                  />
                  <Chip
                    label='手动同步'
                    size='small'
                  />
                </Stack>
              </Stack>
              <Stack spacing={1}>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500 }}
                >
                  同步方向
                </Typography>
                <Stack
                  direction='row'
                  spacing={1}
                >
                  <Chip
                    label='双向同步'
                    size='small'
                  />
                  <Chip
                    label='仅导入'
                    size='small'
                  />
                  <Chip
                    label='仅导出'
                    size='small'
                  />
                </Stack>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </PageContainer>
  );
};

export default IntegrationExternalErpOverviewPage;
