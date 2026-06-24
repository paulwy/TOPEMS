import React, { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Stack,
} from '@mui/material';
import { Button } from '@/components/ui/Button';
import { Plus, Download, Eye, Edit, Trash2 } from 'lucide-react';
import { ListPageTemplate, type ColumnDef, type FilterConfig } from '@/components/templates';

interface Project {
  id: string;
  name: string;
  code: string;
  project_type: string;
  status: string;
  leader: string;
  progress: number;
  start_date: string;
  end_date: string | null;
  budget: number | null;
}

const RsProjectListPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // 模拟数据
  useEffect(() => {
    const mockProjects: Project[] = [
      {
        id: '1',
        name: '新型催化剂研发项目',
        code: 'RS-2024-001',
        project_type: '新产品研发',
        status: '进行中',
        leader: '张三',
        progress: 65,
        start_date: '2024-01-15',
        end_date: '2024-12-31',
        budget: 500000,
      },
      {
        id: '2',
        name: '聚合物改性研究',
        code: 'RS-2024-002',
        project_type: '工艺改进',
        status: '进行中',
        leader: '李四',
        progress: 42,
        start_date: '2024-02-01',
        end_date: '2024-08-30',
        budget: 300000,
      },
      {
        id: '3',
        name: '环保材料开发',
        code: 'RS-2024-003',
        project_type: '新产品研发',
        status: '已完成',
        leader: '王五',
        progress: 100,
        start_date: '2024-03-01',
        end_date: '2024-06-30',
        budget: 200000,
      },
      {
        id: '4',
        name: '纳米材料合成工艺',
        code: 'RS-2024-004',
        project_type: '工艺改进',
        status: '暂停',
        leader: '赵六',
        progress: 30,
        start_date: '2024-04-01',
        end_date: null,
        budget: 400000,
      },
      {
        id: '5',
        name: '高性能涂料配方优化',
        code: 'RS-2024-005',
        project_type: '配方优化',
        status: '进行中',
        leader: '孙七',
        progress: 78,
        start_date: '2024-05-01',
        end_date: '2024-10-31',
        budget: 150000,
      },
    ];
    setProjects(mockProjects);
    setLoading(false);
  }, []);

  const getStatusColor = (
    status: string
  ): 'primary' | 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case '进行中':
        return 'primary';
      case '已完成':
        return 'success';
      case '暂停':
        return 'warning';
      case '取消':
        return 'error';
      default:
        return 'default';
    }
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const paginatedProjects = filteredProjects.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleDeleteClick = (project: Project) => {
    setSelectedProject(project);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedProject) {
      setProjects(projects.filter((p) => p.id !== selectedProject.id));
    }
    setDeleteDialogOpen(false);
    setSelectedProject(null);
  };

  const handleExport = () => {
    logger.info('导出项目列表');
  };

  const columns: ColumnDef<Project>[] = [
    {
      id: 'code',
      label: '项目编码',
      render: (row) => (
        <Typography
          variant='body2'
          sx={{ fontWeight: 'medium' }}
        >
          {row.code}
        </Typography>
      ),
    },
    {
      id: 'name',
      label: '项目名称',
      render: (row) => <Typography variant='body2'>{row.name}</Typography>,
    },
    {
      id: 'project_type',
      label: '项目类型',
      render: (row) => (
        <Chip
          label={row.project_type}
          size='small'
          variant='outlined'
        />
      ),
    },
    {
      id: 'leader',
      label: '负责人',
    },
    {
      id: 'status',
      label: '状态',
      render: (row) => (
        <Chip
          label={row.status}
          size='small'
          color={getStatusColor(row.status)}
        />
      ),
    },
    {
      id: 'progress',
      label: '进度',
      render: (row) => (
        <Stack
          direction='row'
          spacing={1}
          sx={{ alignItems: 'center' }}
        >
          <LinearProgress
            variant='determinate'
            value={row.progress}
            sx={{ width: 80 }}
          />
          <Typography variant='body2'>{row.progress}%</Typography>
        </Stack>
      ),
    },
    {
      id: 'start_date',
      label: '开始日期',
    },
    {
      id: 'budget',
      label: '预算(万元)',
      render: (row) => (row.budget ? (row.budget / 10000).toFixed(1) : '-'),
    },
  ];

  const filters: FilterConfig[] = [
    {
      id: 'status',
      label: '状态',
      type: 'select',
      options: [
        { label: '全部', value: '' },
        { label: '进行中', value: '进行中' },
        { label: '已完成', value: '已完成' },
        { label: '暂停', value: '暂停' },
        { label: '取消', value: '取消' },
      ],
      value: statusFilter || '',
      onChange: (value) => setStatusFilter(value || null),
    },
  ];

  const rowActions = [
    {
      label: '查看详情',
      icon: <Eye size={16} />,
      onClick: (row: Project) => navigate(`/rs/projects/${row.id}`),
    },
    {
      label: '编辑',
      icon: <Edit size={16} />,
      onClick: (row: Project) => navigate(`/rs/projects/${row.id}/edit`),
    },
    {
      label: '删除',
      icon: <Trash2 size={16} />,
      color: 'error' as const,
      divider: true,
      onClick: handleDeleteClick,
    },
  ];

  return (
    <Box sx={{ bgcolor: '#fff', minHeight: '100vh', py: 3 }}>
      <ListPageTemplate
        title='研发项目管理'
        subtitle='管理研发项目、跟踪进度、分配资源'
        columns={columns}
        data={paginatedProjects}
        loading={loading}
        searchable
        searchPlaceholder='搜索项目名称或编码...'
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        filters={filters}
        filtersValue={{ status: statusFilter || '' }}
        onFilterChange={(filters) => {
          if (filters.status !== undefined) {
            setStatusFilter(filters.status || null);
          }
        }}
        pagination={{
          page,
          pageSize: rowsPerPage,
          total: filteredProjects.length,
          onPageChange: setPage,
          onPageSizeChange: setRowsPerPage,
        }}
        actions={[
          {
            label: '导出',
            variant: 'outlined',
            icon: <Download size={18} />,
            onClick: handleExport,
          },
          {
            label: '新建项目',
            variant: 'contained',
            icon: <Plus size={18} />,
            onClick: () => navigate('/rs/projects/create'),
          },
        ]}
        rowActions={rowActions}
        showRowNumber
        emptyMessage='暂无项目数据'
      />

      {/* 删除确认对话框 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>确定要删除项目 "{selectedProject?.name}" 吗？此操作不可恢复。</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>取消</Button>
          <Button
            variant='contained'
            color='error'
            onClick={handleDeleteConfirm}
          >
            删除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RsProjectListPage;
