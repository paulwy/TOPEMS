import React, { useState } from 'react';
import {
  MasterDetailPageTemplate,
  type MasterColumn,
} from '../../components/templates/MasterDetailPageTemplate';
import { Box, Typography, Chip, Divider } from '@mui/material';
import { Calendar, User, DollarSign, Target, CheckCircle } from 'lucide-react';

interface ProjectItem {
  id: string;
  name: string;
  manager: string;
  status: 'active' | 'inactive' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  progress: number;
  startDate: string;
  endDate: string;
  budget: number;
  description?: string;
}

const initialProjects: ProjectItem[] = [
  {
    id: '1',
    name: '数字化转型项目',
    manager: '张三',
    status: 'active',
    priority: 'high',
    progress: 65,
    startDate: '2026-01-15',
    endDate: '2026-06-30',
    budget: 500000,
    description: '公司整体数字化转型项目，包括ERP系统升级、数据分析平台建设等',
  },
  {
    id: '2',
    name: '客户管理系统',
    manager: '李四',
    status: 'active',
    priority: 'medium',
    progress: 30,
    startDate: '2026-02-01',
    endDate: '2026-05-15',
    budget: 150000,
    description: '新一代客户关系管理系统，支持多渠道客户接入和智能分析',
  },
  {
    id: '3',
    name: '供应链优化项目',
    manager: '王五',
    status: 'completed',
    priority: 'high',
    progress: 100,
    startDate: '2025-08-01',
    endDate: '2026-01-31',
    budget: 300000,
    description: '供应链流程优化，降低库存成本，提高配送效率',
  },
  {
    id: '4',
    name: '智能仓储系统',
    manager: '赵六',
    status: 'inactive',
    priority: 'medium',
    progress: 20,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    budget: 400000,
    description: '基于AI的智能仓储管理系统，实现自动化入库出库',
  },
];

export const ProjectMasterDetailPage: React.FC = () => {
  const [projects] = useState<ProjectItem[]>(initialProjects);

  const columns: MasterColumn<ProjectItem>[] = [
    { id: 'name', label: '项目名称', width: 'flex', minWidth: 150 },
    {
      id: 'manager',
      label: '负责人',
      width: 100,
    },
    {
      id: 'status',
      label: '状态',
      width: 80,
      align: 'center',
      render: (_value, row) => {
        const statusConfig = {
          active: { label: '进行中', color: 'success' as const },
          inactive: { label: '暂停', color: 'warning' as const },
          completed: { label: '已完成', color: 'default' as const },
        };
        const config = statusConfig[row.status];
        return (
          <Chip
            label={config.label}
            size='small'
            color={config.color}
          />
        );
      },
    },
    {
      id: 'progress',
      label: '进度',
      width: 120,
      align: 'right',
      render: (_value, row) => (
        <Typography
          variant='body2'
          sx={{ fontWeight: 500 }}
        >
          {row.progress}%
        </Typography>
      ),
    },
    {
      id: 'budget',
      label: '预算',
      width: 100,
      align: 'right',
      render: (_value, row) => (
        <Typography variant='body2'>{row.budget.toLocaleString()}</Typography>
      ),
    },
  ];

  const renderDetail = (item: ProjectItem | null) => {
    if (!item) return null;

    return (
      <Box sx={{ p: 2 }}>
        <Typography
          variant='h5'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {item.name}
        </Typography>

        {item.description && (
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ mb: 4 }}
          >
            {item.description}
          </Typography>
        )}

        <Divider sx={{ mb: 4 }} />

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          <Box sx={{ flex: '1 1 250px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1,
                  bgcolor: 'primary.light',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <User style={{ width: 18, height: 18, color: 'primary.main' }} />
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  负责人
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500 }}
                >
                  {item.manager}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ flex: '1 1 250px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1,
                  bgcolor: 'success.light',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Target style={{ width: 18, height: 18, color: 'success.main' }} />
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  优先级
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500 }}
                >
                  {item.priority === 'low' && '低'}
                  {item.priority === 'medium' && '中'}
                  {item.priority === 'high' && '高'}
                  {item.priority === 'urgent' && '紧急'}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ flex: '1 1 250px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1,
                  bgcolor: 'info.light',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Calendar style={{ width: 18, height: 18, color: 'info.main' }} />
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  时间范围
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500 }}
                >
                  {item.startDate} ~ {item.endDate}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ flex: '1 1 250px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1,
                  bgcolor: 'warning.light',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <DollarSign style={{ width: 18, height: 18, color: 'warning.main' }} />
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  预算
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500 }}
                >
                  {item.budget.toLocaleString()} 元
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 4 }} />

        <Typography
          variant='subtitle2'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          项目进度
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{ flex: 1, height: 8, bgcolor: 'grey.200', borderRadius: 4, overflow: 'hidden' }}
          >
            <Box
              sx={{
                width: `${item.progress}%`,
                height: '100%',
                bgcolor: item.status === 'completed' ? 'success.main' : 'primary.main',
                borderRadius: 4,
                transition: 'width 0.3s',
              }}
            />
          </Box>
          <Typography
            variant='body2'
            sx={{ fontWeight: 600, minWidth: 40, textAlign: 'right' }}
          >
            {item.progress}%
          </Typography>
        </Box>

        <Divider sx={{ my: 4 }} />

        <Typography
          variant='subtitle2'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          项目状态
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {item.status === 'completed' ? (
            <CheckCircle style={{ width: 24, height: 24, color: 'success.main' }} />
          ) : item.status === 'active' ? (
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: 'success.main',
                animation: 'pulse 2s infinite',
              }}
            />
          ) : (
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'warning.main' }} />
          )}
          <Typography variant='body2'>
            {item.status === 'active' && '项目进行中'}
            {item.status === 'inactive' && '项目已暂停'}
            {item.status === 'completed' && '项目已完成'}
          </Typography>
        </Box>
      </Box>
    );
  };

  return (
    <MasterDetailPageTemplate<ProjectItem>
      title='项目列表'
      subtitle='查看和管理所有项目，点击项目查看详情'
      items={projects}
      columns={columns}
      getRowId={(item) => item.id}
      renderDetail={renderDetail}
      detailEmptyTitle='选择项目'
      detailEmptyDescription='从左侧列表中选择一个项目查看详细信息'
      onAdd={() => {}}
      addButtonText='新建项目'
      masterWidth={520}
      collapsible
      enableEditMode
    />
  );
};

export default ProjectMasterDetailPage;
