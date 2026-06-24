import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Chip,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
} from '@mui/material';
import { Button } from '@/components/ui/Button';
import { Play, Rocket, RotateCcw, Eye, Server } from 'lucide-react';
import {
  ListPageTemplate,
  type ColumnDef,
  type FilterConfig,
  type RowAction,
} from '@/components/templates';

interface Deploy {
  id: string;
  deploy_no: string;
  environment: string;
  app_name: string;
  version: string;
  status: string;
  deploy_time: string;
  operator: string;
}

const RsDeployPage: React.FC = () => {
  const [deploys, setDeploys] = useState<Deploy[]>([]);
  const [loading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [envFilter, setEnvFilter] = useState<string | null>(null);
  const [appFilter, setAppFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedDeploy, setSelectedDeploy] = useState<Deploy | null>(null);

  useEffect(() => {
    const mockDeploys: Deploy[] = [
      {
        id: '1',
        deploy_no: 'DEPLOY-20240615-001',
        environment: 'production',
        app_name: 'frontend-app',
        version: 'v2.3.1',
        status: 'success',
        deploy_time: '2024-06-15 14:30:00',
        operator: '张三',
      },
      {
        id: '2',
        deploy_no: 'DEPLOY-20240615-002',
        environment: 'staging',
        app_name: 'backend-api',
        version: 'v1.5.0',
        status: 'running',
        deploy_time: '2024-06-15 14:25:00',
        operator: '李四',
      },
      {
        id: '3',
        deploy_no: 'DEPLOY-20240614-003',
        environment: 'production',
        app_name: 'mobile-app',
        version: 'v3.0.0',
        status: 'failed',
        deploy_time: '2024-06-14 16:20:00',
        operator: '王五',
      },
      {
        id: '4',
        deploy_no: 'DEPLOY-20240614-002',
        environment: 'development',
        app_name: 'data-service',
        version: 'v0.9.5',
        status: 'success',
        deploy_time: '2024-06-14 10:15:00',
        operator: '赵六',
      },
      {
        id: '5',
        deploy_no: 'DEPLOY-20240614-001',
        environment: 'staging',
        app_name: 'shared-utils',
        version: 'v1.2.0',
        status: 'success',
        deploy_time: '2024-06-14 02:00:00',
        operator: '孙七',
      },
    ];
    setDeploys(mockDeploys);
  }, []);

  const getEnvColor = (env: string): 'error' | 'warning' | 'success' | 'default' => {
    switch (env) {
      case 'production':
        return 'error';
      case 'staging':
        return 'warning';
      case 'development':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string): 'success' | 'error' | 'primary' | 'default' => {
    switch (status) {
      case 'success':
        return 'success';
      case 'failed':
        return 'error';
      case 'running':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getEnvLabel = (env: string): string => {
    switch (env) {
      case 'production':
        return '生产环境';
      case 'staging':
        return '预发布环境';
      case 'development':
        return '开发环境';
      default:
        return env;
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'success':
        return '成功';
      case 'failed':
        return '失败';
      case 'running':
        return '部署中';
      case 'pending':
        return '等待中';
      default:
        return status;
    }
  };

  const uniqueApps = useMemo(() => [...new Set(deploys.map((d) => d.app_name))], [deploys]);

  const filteredDeploys = useMemo(() => {
    return deploys.filter((deploy) => {
      const matchesSearch =
        deploy.deploy_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deploy.app_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEnv = !envFilter || deploy.environment === envFilter;
      const matchesApp = !appFilter || deploy.app_name === appFilter;
      const matchesStatus = !statusFilter || deploy.status === statusFilter;
      return matchesSearch && matchesEnv && matchesApp && matchesStatus;
    });
  }, [deploys, searchTerm, envFilter, appFilter, statusFilter]);

  const handleViewDetail = (deploy: Deploy) => {
    setSelectedDeploy(deploy);
    setDetailDialogOpen(true);
  };

  const handleRollback = (deployData: Deploy) => {
    const deploy = deploys.find((d) => d.id === deployData.id);
    if (deploy) {
      const rollbackDeploy: Deploy = {
        id: String(Date.now()),
        deploy_no: `DEPLOY-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(deploys.length + 1).padStart(3, '0')}`,
        environment: deploy.environment,
        app_name: deploy.app_name,
        version: '上一版本',
        status: 'running',
        deploy_time: new Date().toLocaleString(),
        operator: '当前用户',
      };
      setDeploys([rollbackDeploy, ...deploys]);
    }
  };

  const handleNewDeploy = () => {
    const newDeploy: Deploy = {
      id: String(Date.now()),
      deploy_no: `DEPLOY-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(deploys.length + 1).padStart(3, '0')}`,
      environment: 'staging',
      app_name: 'new-app',
      version: 'v1.0.0',
      status: 'running',
      deploy_time: new Date().toLocaleString(),
      operator: '当前用户',
    };
    setDeploys([newDeploy, ...deploys]);
  };

  // 表格列定义
  const columns: ColumnDef<Deploy>[] = [
    {
      id: 'deploy_no',
      label: '部署编号',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Rocket
            size={16}
            color='#3b82f6'
          />
          {row.deploy_no}
        </Box>
      ),
    },
    {
      id: 'environment',
      label: '环境',
      render: (row) => (
        <Chip
          label={getEnvLabel(row.environment)}
          size='small'
          color={getEnvColor(row.environment)}
        />
      ),
    },
    {
      id: 'app_name',
      label: '应用名称',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Server size={14} />
          {row.app_name}
        </Box>
      ),
    },
    { id: 'version', label: '版本' },
    {
      id: 'status',
      label: '状态',
      render: (row) => (
        <Chip
          label={getStatusLabel(row.status)}
          size='small'
          color={getStatusColor(row.status)}
        />
      ),
    },
    { id: 'deploy_time', label: '部署时间' },
    { id: 'operator', label: '操作人' },
  ];

  // 筛选器定义
  const filters: FilterConfig[] = [
    {
      id: 'env',
      label: '环境',
      type: 'select',
      options: [
        { label: '全部', value: '' },
        { label: '生产环境', value: 'production' },
        { label: '预发布环境', value: 'staging' },
        { label: '开发环境', value: 'development' },
      ],
      value: envFilter || '',
      onChange: (value) => setEnvFilter(value || null),
    },
    {
      id: 'app',
      label: '应用',
      type: 'select',
      options: [
        { label: '全部', value: '' },
        ...uniqueApps.map((app) => ({ label: app, value: app })),
      ],
      value: appFilter || '',
      onChange: (value) => setAppFilter(value || null),
    },
    {
      id: 'status',
      label: '状态',
      type: 'select',
      options: [
        { label: '全部', value: '' },
        { label: '成功', value: 'success' },
        { label: '失败', value: 'failed' },
        { label: '部署中', value: 'running' },
        { label: '等待中', value: 'pending' },
      ],
      value: statusFilter || '',
      onChange: (value) => setStatusFilter(value || null),
    },
  ];

  // 行操作定义
  const rowActions: RowAction<Deploy>[] = [
    {
      label: '查看详情',
      icon: <Eye size={16} />,
      onClick: handleViewDetail,
    },
    {
      label: '回滚',
      icon: <RotateCcw size={16} />,
      onClick: handleRollback,
    },
  ];

  // 分页配置
  const pagination = {
    page,
    pageSize: rowsPerPage,
    total: filteredDeploys.length,
    onPageChange: setPage,
    onPageSizeChange: setRowsPerPage,
  };

  // 操作按钮
  const actions = [
    {
      label: '发起部署',
      icon: <Play size={18} />,
      onClick: handleNewDeploy,
    },
  ];

  return (
    <Box sx={{ bgcolor: '#f5f5f5', minHeight: '100vh', py: 3 }}>
      <ListPageTemplate
        title='部署管理'
        columns={columns}
        data={filteredDeploys}
        loading={loading}
        filters={filters}
        globalSearch={{
          fields: ['deploy_no', 'app_name'],
          placeholder: '搜索部署编号、应用...',
        }}
        pagination={pagination}
        actions={actions}
        rowActions={rowActions}
        onSearch={setSearchTerm}
      />

      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>部署详情</DialogTitle>
        <DialogContent>
          {selectedDeploy && (
            <Box sx={{ py: 2 }}>
              <Typography
                variant='h6'
                sx={{ fontWeight: 'bold' }}
              >
                {selectedDeploy.deploy_no}
              </Typography>
              <Stack
                direction='row'
                spacing={2}
                sx={{ mt: 2 }}
              >
                <Chip
                  label={getEnvLabel(selectedDeploy.environment)}
                  color={getEnvColor(selectedDeploy.environment)}
                />
                <Chip
                  label={getStatusLabel(selectedDeploy.status)}
                  color={getStatusColor(selectedDeploy.status)}
                />
              </Stack>
              <Stack
                direction='row'
                spacing={4}
                sx={{ mt: 3 }}
              >
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    应用名称
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 'bold' }}
                  >
                    {selectedDeploy.app_name}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    版本
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 'bold' }}
                  >
                    {selectedDeploy.version}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    操作人
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 'bold' }}
                  >
                    {selectedDeploy.operator}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RsDeployPage;
