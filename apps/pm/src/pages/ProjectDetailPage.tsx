import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Card,
  CardContent,
  Divider,
  LinearProgress,
} from '@mui/material';

import { usePmStore } from '../store/pmStore';
import type { Project } from '../api/pm';
import { ArrowLeft } from 'lucide-react';
const ArrowBackIcon = ArrowLeft;

interface ProjectDetailPageProps {
  projectId?: string;
  onBack?: () => void;
}

export const ProjectDetailPage: React.FC<ProjectDetailPageProps> = ({ projectId, onBack }) => {
  const { loadProject } = usePmStore();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      if (!projectId) {
        setError('缺少项目 ID');
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await loadProject(projectId);
        if (data) {
          setProject(data);
        } else {
          setError('未找到项目');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载项目详情失败');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [projectId, loadProject]);

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !project) {
    return (
      <Box sx={{ p: 3 }}>
        {onBack && (
          <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ mb: 2 }}>
            返回
          </Button>
        )}
        <Alert severity="error">{error || '项目不存在'}</Alert>
      </Box>
    );
  }

  const getStatusColor = (status: string): 'success' | 'default' | 'warning' | 'primary' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'completed':
        return 'primary';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return '进行中';
      case 'completed':
        return '已完成';
      case 'pending':
        return '待审批';
      case 'cancelled':
        return '已取消';
      case 'draft':
        return '草稿';
      case 'approved':
        return '已批准';
      default:
        return status;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        {onBack && (
          <Button startIcon={<ArrowBackIcon />} onClick={onBack}>
            返回
          </Button>
        )}
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            {project.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            项目编码：{project.code} · 类型：{project.project_type}
          </Typography>
        </Box>
        <Box sx={{ ml: 'auto' }}>
          <Chip
            label={getStatusLabel(project.status)}
            color={getStatusColor(project.status)}
            size="medium"
          />
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              项目概览
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  负责人
                </Typography>
                <Typography variant="body1">{project.leader || '-'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  优先级
                </Typography>
                <Typography variant="body1">{project.priority ?? '-'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  开始日期
                </Typography>
                <Typography variant="body1">
                  {project.start_date
                    ? new Date(project.start_date).toLocaleDateString('zh-CN')
                    : '-'}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  结束日期
                </Typography>
                <Typography variant="body1">
                  {project.end_date
                    ? new Date(project.end_date).toLocaleDateString('zh-CN')
                    : '-'}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="body2" color="text.secondary">
                  描述
                </Typography>
                <Typography variant="body1">{project.description || '暂无描述'}</Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                预算
              </Typography>
              <Typography variant="h4" sx={{ mt: 1, fontWeight: 600 }}>
                {(project.budget ?? 0).toLocaleString()}
                <Typography component="span" variant="body2" color="text.secondary">
                  {' '}元
                </Typography>
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                进度
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ flex: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={project.progress || 0}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                </Box>
                <Box sx={{ fontWeight: 600, minWidth: 40 }}>{project.progress || 0}%</Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProjectDetailPage;
