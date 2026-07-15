import React, { useState, useMemo } from 'react';
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
import { Plus, FileText, GitBranch, GitCommit, Users, ExternalLink } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ListPageTemplate } from '@/components/templates';

import type { RowAction, FilterConfig, ColumnDef } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { rdApi } from '@/api/rd';
import { useNotificationStore } from '@/store';
import type { Project, UpdateProjectRequest } from '@/api/rd';
import { logger } from '@/utils/logger';
import { QUERY_KEYS } from '@/lib/reactQuery';

interface CodeRepo {
  id: string;
  repo_name: string;
  project_name: string;
  repo_url: string;
  branch_count: number;
  commit_count: number;
  last_commit: string;
  language: string;
}

const RsCodePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [languageFilter, setLanguageFilter] = useState<string>('');
  const [newRepoDialogOpen, setNewRepoDialogOpen] = useState(false);
  const [newRepoForm, setNewRepoForm] = useState({
    project_id: '',
    repo_name: '',
    repo_url: '',
    language: 'JavaScript',
  });

  const projectsQuery = useQuery({
    queryKey: [...QUERY_KEYS.RD.PROJECTS, 'code-page'],
    queryFn: async () => {
      const response = await rdApi.listProjects();
      if (!response.success || !response.data) {
        throw new Error(response.message || '加载项目列表失败');
      }
      return response.data.projects || [];
    },
  });

  const repoListQuery = useQuery({
    queryKey: [
      ...QUERY_KEYS.RD.PROJECTS,
      'repos',
      { page, rowsPerPage, searchTerm, languageFilter },
    ],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page: page + 1,
        pagesize: rowsPerPage,
      };
      if (searchTerm) params.search = searchTerm;
      if (languageFilter) params.language = languageFilter;

      const response = await rdApi.listProjects(params);
      if (!response.success || !response.data) {
        throw new Error(response.message || '加载代码仓库失败');
      }
      const projectList = response.data.projects || [];
      const transformedRepos: CodeRepo[] = projectList.map((p: Project) => ({
        id: p.id,
        repo_name: p.project_name,
        project_name: p.project_name,
        repo_url: p.repo_url || '',
        branch_count: Math.floor(Math.random() * 10) + 1,
        commit_count: Math.floor(Math.random() * 100) + 10,
        last_commit: p.created_at || '',
        language: p.tech_stack || 'JavaScript',
      }));
      return {
        repos: transformedRepos,
        total: response.data.total || 0,
      };
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateProjectRequest }) => {
      const response = await rdApi.updateProject(id, data);
      if (!response.success) {
        throw new Error(response.message || '配置代码仓库失败');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.RD.PROJECTS, 'repos'] });
      addNotification({
        type: 'success',
        title: '创建成功',
        message: '代码仓库已配置',
      });
    },
    onError: (error: unknown) => {
      logger.error('创建代码仓库失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: error instanceof Error ? error.message : '无法配置代码仓库',
      });
    },
  });

  const repos = repoListQuery.data?.repos || [];
  const total = repoListQuery.data?.total || 0;
  const projects = projectsQuery.data || [];
  const loading = repoListQuery.isLoading || updateProjectMutation.isPending;

  const uniqueLanguages = useMemo(() => [...new Set(repos.map((r) => r.language))], [repos]);

  const handleViewDetail = (repo: CodeRepo) => {
    addNotification({
      type: 'info',
      title: '查看详情',
      message: `仓库: ${repo.repo_name}`,
    });
  };

  const handleCreateRepo = async () => {
    try {
      const projectExists = projects.some((p) => p.id === newRepoForm.project_id);
      if (!projectExists) {
        addNotification({
          type: 'error',
          title: '创建失败',
          message: '项目不存在',
        });
        return;
      }

      await updateProjectMutation.mutateAsync({
        id: newRepoForm.project_id,
        data: {
          repo_url: newRepoForm.repo_url,
          tech_stack: newRepoForm.language,
        },
      });

      setNewRepoDialogOpen(false);
      setNewRepoForm({
        project_id: '',
        repo_name: '',
        repo_url: '',
        language: 'JavaScript',
      });
    } catch {
      // 错误已在 mutation onError 中处理
    }
  };

  const columns = useMemo<ColumnDef<CodeRepo>[]>(
    () => [
      {
        id: 'repo_name',
        label: '仓库名称',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GitBranch
              size={16}
              color='primary.main'
            />
            <Typography
              variant='body2'
              sx={{ fontWeight: 500 }}
            >
              {row.repo_name}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'project_name',
        label: '关联项目',
        render: (row) => row.project_name,
      },
      {
        id: 'language',
        label: '语言',
        render: (row) => (
          <Chip
            label={row.language}
            size='small'
            variant='outlined'
          />
        ),
      },
      {
        id: 'branch_count',
        label: '分支数',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <GitBranch size={14} />
            <Typography variant='body2'>{row.branch_count}</Typography>
          </Box>
        ),
      },
      {
        id: 'commit_count',
        label: '提交数',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <GitCommit size={14} />
            <Typography variant='body2'>{row.commit_count}</Typography>
          </Box>
        ),
      },
      {
        id: 'last_commit',
        label: '最后提交',
        render: (row) => <Typography variant='body2'>{row.last_commit}</Typography>,
      },
      {
        id: 'repo_url',
        label: '仓库链接',
        render: (row) =>
          row.repo_url ? (
            <Button
              component='a'
              href={row.repo_url}
              target='_blank'
              rel='noopener noreferrer'
              size='small'
              startIcon={<ExternalLink size={14} />}
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

  const rowActions = useMemo<RowAction<CodeRepo>[]>(
    () => [
      {
        label: '详情',
        icon: <FileText size={16} />,
        onClick: (row) => handleViewDetail(row),
      },
      {
        label: '成员',
        icon: <Users size={16} />,
        onClick: () => {},
      },
    ],
    []
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        id: 'language',
        label: '语言',
        type: 'select',
        options: [
          { value: '', label: '全部' },
          ...uniqueLanguages.map((lang) => ({
            value: lang,
            label: lang,
          })),
        ],
        value: languageFilter,
        onChange: (value) => setLanguageFilter(value as string),
      },
    ],
    [languageFilter, uniqueLanguages]
  );

  return (
    <PageContainer
      title='代码库管理'
      subtitle='管理代码仓库和版本控制'
    >
      <ListPageTemplate<CodeRepo>
        title=''
        subtitle=''
        backButton={{
          href: '/dashboard',
        }}
        columns={columns}
        data={repos}
        loading={loading}
        searchable
        searchPlaceholder='搜索仓库名称、项目...'
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
            label: '添加仓库',
            icon: <Plus size={18} />,
            onClick: () => setNewRepoDialogOpen(true),
            variant: 'contained',
          },
        ]}
      />

      <Dialog
        open={newRepoDialogOpen}
        onClose={() => setNewRepoDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>添加代码仓库</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 2 }}
          >
            <FormControl fullWidth>
              <InputLabel>关联项目</InputLabel>
              <Select
                value={newRepoForm.project_id}
                label='关联项目'
                onChange={(e) => setNewRepoForm({ ...newRepoForm, project_id: e.target.value })}
              >
                {projects.map((p) => (
                  <MenuItem
                    key={p.id}
                    value={p.id}
                  >
                    {p.project_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label='仓库名称'
              fullWidth
              value={newRepoForm.repo_name}
              onChange={(e) => setNewRepoForm({ ...newRepoForm, repo_name: e.target.value })}
            />
            <TextField
              label='仓库URL'
              fullWidth
              value={newRepoForm.repo_url}
              onChange={(e) => setNewRepoForm({ ...newRepoForm, repo_url: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>语言</InputLabel>
              <Select
                value={newRepoForm.language}
                label='语言'
                onChange={(e) => setNewRepoForm({ ...newRepoForm, language: e.target.value })}
              >
                <MenuItem value='JavaScript'>JavaScript</MenuItem>
                <MenuItem value='TypeScript'>TypeScript</MenuItem>
                <MenuItem value='Python'>Python</MenuItem>
                <MenuItem value='Java'>Java</MenuItem>
                <MenuItem value='Go'>Go</MenuItem>
                <MenuItem value='Rust'>Rust</MenuItem>
                <MenuItem value='PHP'>PHP</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewRepoDialogOpen(false)}>取消</Button>
          <Button
            variant='contained'
            sx={{ bgcolor: 'primary.main' }}
            onClick={handleCreateRepo}
          >
            添加
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default RsCodePage;
