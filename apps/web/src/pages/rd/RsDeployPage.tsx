import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Button,
} from '@mui/material';
import { Rocket, FileText, RotateCcw, Globe, CheckCircle, XCircle, Clock } from 'lucide-react';
import { ListPageTemplate } from '@/components/templates';

import type { RowAction, FilterConfig, ColumnDef } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { rdApi } from '@/api/rd';
import { useNotificationStore } from '@/store';
import type { Deploy, CreateDeployRequest } from '@/api/rd';
import { logger } from '@/utils/logger';

const RsDeployPage: React.FC = () => {
  const { addNotification } = useNotificationStore();
  const [deploys, setDeploys] = useState<Deploy[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [envFilter, setEnvFilter] = useState<string>('');
  const [newDeployDialogOpen, setNewDeployDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedDeploy, setSelectedDeploy] = useState<Deploy | null>(null);
  const [newDeployForm, setNewDeployForm] = useState({
    project_id: '',
    build_id: '',
    env: 'prod',
    deploy_type: 'full',
  });

  useEffect(() => {
    loadDeploys();
  }, [searchTerm, statusFilter, envFilter, page, rowsPerPage]);

  const loadDeploys = async () => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = {
        page: page + 1,
        pagesize: rowsPerPage,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      if (envFilter) params.env = envFilter;

      const response = await rdApi.listDeploys(params);
      if (response.success && response.data) {
        setDeploys(response.data.deploys || []);
        setTotal(response.data.total || 0);
      }
    } catch (error: unknown) {
      logger.error('加载部署记录失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载部署记录',
      });
    } finally {
      setLoading(false);
    }
  };

  const uniqueEnvs = useMemo(() => [...new Set(deploys.map((d) => d.env))], [deploys]);

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'success':
        return '成功';
      case 'failed':
        return '失败';
      case 'running':
        return '进行中';
      case 'pending':
        return '待部署';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'default' => {
    switch (status) {
      case 'success':
        return 'success';
      case 'failed':
        return 'error';
      case 'running':
        return 'warning';
      case 'pending':
        return 'default';
      default:
        return 'default';
    }
  };

  const getEnvLabel = (env: string): string => {
    switch (env) {
      case 'prod':
        return '生产环境';
      case 'staging':
        return '预发布环境';
      case 'test':
        return '测试环境';
      case 'dev':
        return '开发环境';
      default:
        return env;
    }
  };

  const getEnvColor = (env: string): 'success' | 'error' | 'warning' | 'default' => {
    switch (env) {
      case 'prod':
        return 'error';
      case 'staging':
        return 'warning';
      case 'test':
        return 'default';
      case 'dev':
        return 'success';
      default:
        return 'default';
    }
  };

  const getDeployTypeLabel = (type: string): string => {
    switch (type) {
      case 'full':
        return '全量部署';
      case 'rolling':
        return '滚动部署';
      case 'blue-green':
        return '蓝绿部署';
      case 'canary':
        return '灰度发布';
      default:
        return type;
    }
  };

  const handleViewDetail = (deploy: Deploy) => {
    setSelectedDeploy(deploy);
    setDetailDialogOpen(true);
  };

  const handleRedeploy = async (deploy: Deploy) => {
    try {
      const createData: CreateDeployRequest = {
        project_id: deploy.project_id,
        build_id: deploy.build_id,
        env: deploy.env,
        deploy_type: deploy.deploy_type,
        environment: deploy.environment,
        app_name: deploy.app_name,
        version: deploy.version,
      };
      await rdApi.createDeploy(createData);
      addNotification({
        type: 'success',
        title: '操作成功',
        message: '部署任务已提交',
      });
      loadDeploys();
    } catch (error: unknown) {
      logger.error('重新部署失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: '重新部署失败',
      });
    }
  };

  const handleCreateDeploy = async () => {
    try {
      const createData: CreateDeployRequest = {
        project_id: newDeployForm.project_id,
        build_id: newDeployForm.build_id,
        env: newDeployForm.env,
        deploy_type: newDeployForm.deploy_type,
        environment: newDeployForm.env,
        app_name: '',
        version: '',
      };
      await rdApi.createDeploy(createData);
      addNotification({
        type: 'success',
        title: '创建成功',
        message: '部署任务已创建',
      });
      setNewDeployDialogOpen(false);
      setNewDeployForm({
        project_id: '',
        build_id: '',
        env: 'prod',
        deploy_type: 'full',
      });
      loadDeploys();
    } catch (error: unknown) {
      logger.error('创建部署失败:', error);
      addNotification({
        type: 'error',
        title: '创建失败',
        message: '无法创建部署任务',
      });
    }
  };

  const columns = useMemo<ColumnDef<Deploy>[]>(
    () => [
      {
        id: 'deploy_no',
        label: '部署编号',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Rocket
              size={16}
              color='primary.main'
            />
            <Typography
              variant='body2'
              sx={{ fontWeight: 500 }}
            >
              {row.deploy_no}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'project_name',
        label: '项目',
        render: (row) => row.project_name,
      },
      {
        id: 'env',
        label: '环境',
        render: (row) => (
          <Chip
            label={getEnvLabel(row.env)}
            size='small'
            color={getEnvColor(row.env)}
          />
        ),
      },
      {
        id: 'deploy_type',
        label: '部署方式',
        render: (row) => (
          <Chip
            label={getDeployTypeLabel(row.deploy_type)}
            size='small'
            variant='outlined'
          />
        ),
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {row.status === 'success' ? (
              <CheckCircle
                size={14}
                color='green'
              />
            ) : row.status === 'failed' ? (
              <XCircle
                size={14}
                color='red'
              />
            ) : row.status === 'running' ? (
              <Clock
                size={14}
                color='orange'
              />
            ) : null}
            <Chip
              label={getStatusLabel(row.status)}
              size='small'
              color={getStatusColor(row.status)}
            />
          </Box>
        ),
      },
      {
        id: 'deployer',
        label: '部署人',
        render: (row) => row.deployer,
      },
      {
        id: 'deploy_time',
        label: '部署时间',
        render: (row) => row.deploy_time || row.created_at || '-',
      },
      {
        id: 'target_url',
        label: '访问地址',
        render: (row) =>
          row.target_url ? (
            <Button
              component='a'
              href={row.target_url}
              target='_blank'
              rel='noopener noreferrer'
              size='small'
              startIcon={<Globe size={14} />}
            >
              访问
            </Button>
          ) : (
            '-'
          ),
      },
    ],
    []
  );

  const rowActions = useMemo<RowAction<Deploy>[]>(
    () => [
      {
        label: '详情',
        icon: <FileText size={16} />,
        onClick: (row) => handleViewDetail(row),
      },
      {
        label: '重新部署',
        icon: <RotateCcw size={16} />,
        color: 'primary',
        onClick: (row) => handleRedeploy(row),
      },
    ],
    []
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        id: 'env',
        label: '环境',
        type: 'select',
        options: [
          { value: '', label: '全部' },
          { value: 'prod', label: '生产环境' },
          { value: 'staging', label: '预发布环境' },
          { value: 'test', label: '测试环境' },
          { value: 'dev', label: '开发环境' },
        ],
        value: envFilter,
        onChange: (value) => setEnvFilter(value as string),
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { value: '', label: '全部' },
          { value: 'success', label: '成功' },
          { value: 'failed', label: '失败' },
          { value: 'running', label: '进行中' },
          { value: 'pending', label: '待部署' },
        ],
        value: statusFilter,
        onChange: (value) => setStatusFilter(value as string),
      },
    ],
    [envFilter, statusFilter]
  );

  return (
    <PageContainer
      title='部署管理'
      subtitle='管理应用部署和发布流程'
    >
      <ListPageTemplate<Deploy>
        title=''
        subtitle=''
        backButton={{
          href: '/dashboard',
        }}
        columns={columns}
        data={deploys}
        loading={loading}
        searchable
        searchPlaceholder='搜索部署编号、项目...'
        searchValue={searchTerm}
        onSearch={(value) => setSearchTerm(value)}
        filters={filters}
        rowActions={rowActions}
        pagination={{
          page,
          pageSize: rowsPerPage,
          total,
          onPageChange: setPage,
          onPageSizeChange: setRowsPerPage,
        }}
        actions={[
          {
            label: '发起部署',
            icon: <Rocket size={18} />,
            onClick: () => setNewDeployDialogOpen(true),
            variant: 'contained',
          },
        ]}
      />

      <Dialog
        open={newDeployDialogOpen}
        onClose={() => setNewDeployDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>发起部署</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 2 }}
          >
            <TextField
              label='项目ID'
              fullWidth
              value={newDeployForm.project_id}
              onChange={(e) => setNewDeployForm({ ...newDeployForm, project_id: e.target.value })}
            />
            <TextField
              label='构建ID'
              fullWidth
              value={newDeployForm.build_id}
              onChange={(e) => setNewDeployForm({ ...newDeployForm, build_id: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>部署环境</InputLabel>
              <Select
                value={newDeployForm.env}
                label='部署环境'
                onChange={(e) => setNewDeployForm({ ...newDeployForm, env: e.target.value })}
              >
                <MenuItem value='prod'>生产环境</MenuItem>
                <MenuItem value='staging'>预发布环境</MenuItem>
                <MenuItem value='test'>测试环境</MenuItem>
                <MenuItem value='dev'>开发环境</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>部署方式</InputLabel>
              <Select
                value={newDeployForm.deploy_type}
                label='部署方式'
                onChange={(e) =>
                  setNewDeployForm({ ...newDeployForm, deploy_type: e.target.value })
                }
              >
                <MenuItem value='full'>全量部署</MenuItem>
                <MenuItem value='rolling'>滚动部署</MenuItem>
                <MenuItem value='blue-green'>蓝绿部署</MenuItem>
                <MenuItem value='canary'>灰度发布</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewDeployDialogOpen(false)}>取消</Button>
          <Button
            variant='contained'
            sx={{ bgcolor: 'primary.main' }}
            onClick={handleCreateDeploy}
          >
            发起部署
          </Button>
        </DialogActions>
      </Dialog>

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
                  label={selectedDeploy.project_name}
                  size='small'
                  variant='outlined'
                />
                <Chip
                  label={getEnvLabel(selectedDeploy.env)}
                  size='small'
                  color={getEnvColor(selectedDeploy.env)}
                />
                <Chip
                  label={getStatusLabel(selectedDeploy.status)}
                  size='small'
                  color={getStatusColor(selectedDeploy.status)}
                />
              </Stack>
              <Box sx={{ mt: 3 }}>
                <Typography
                  variant='subtitle2'
                  color='text.secondary'
                >
                  部署方式: {getDeployTypeLabel(selectedDeploy.deploy_type)}
                </Typography>
                <Typography
                  variant='subtitle2'
                  color='text.secondary'
                  sx={{ mt: 1 }}
                >
                  部署人: {selectedDeploy.deployer}
                </Typography>
                <Typography
                  variant='subtitle2'
                  color='text.secondary'
                  sx={{ mt: 1 }}
                >
                  部署时间: {selectedDeploy.deploy_time || selectedDeploy.created_at}
                </Typography>
                {selectedDeploy.target_url && (
                  <Typography
                    variant='subtitle2'
                    color='text.secondary'
                    sx={{ mt: 1 }}
                  >
                    访问地址:{' '}
                    <a
                      href={selectedDeploy.target_url}
                      target='_blank'
                      rel='noopener noreferrer'
                    >
                      {selectedDeploy.target_url}
                    </a>
                  </Typography>
                )}
              </Box>
              {selectedDeploy.logs && (
                <Box sx={{ mt: 3 }}>
                  <Typography
                    variant='subtitle2'
                    color='text.secondary'
                  >
                    部署日志
                  </Typography>
                  <Box
                    sx={{
                      mt: 1,
                      p: 2,
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      maxHeight: 200,
                      overflow: 'auto',
                    }}
                  >
                    {selectedDeploy.logs}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>关闭</Button>
          <Button
            variant='contained'
            sx={{ bgcolor: 'primary.main' }}
            onClick={() => handleRedeploy(selectedDeploy!)}
          >
            重新部署
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default RsDeployPage;
