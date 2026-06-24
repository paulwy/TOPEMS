import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider,
  TextField,
  Button,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { ganttApi, type ProjectGanttResponse } from '../api/pm';

export const GanttChartPage: React.FC = () => {
  const [projectId, setProjectId] = useState('');
  const [ganttData, setGanttData] = useState<ProjectGanttResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGantt = async (id: string) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await ganttApi.getProjectGantt(id);
      setGanttData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载甘特图数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = () => {
    loadGantt(projectId);
  };

  useEffect(() => {
    // initial empty state
  }, []);

  const getStatusColor = (status: string): 'success' | 'default' | 'warning' | 'primary' => {
    switch (status) {
      case 'active':
      case 'in_progress':
        return 'success';
      case 'completed':
        return 'primary';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
          甘特图
        </Typography>
        <Typography variant="body2" color="text.secondary">
          可视化项目进度和时间线
        </Typography>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <TextField
              label="项目 ID"
              size="small"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              fullWidth
              placeholder="请输入项目 ID"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={handleLoad}
              disabled={!projectId || loading}
              fullWidth
            >
              加载甘特图
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : ganttData ? (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    阶段数
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 1, fontWeight: 600 }}>
                    {ganttData.phases?.length || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    里程碑
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 1, fontWeight: 600 }}>
                    {ganttData.milestones?.length || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    资源数
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 1, fontWeight: 600 }}>
                    {ganttData.resources?.length || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              阶段
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {ganttData.phases && ganttData.phases.length > 0 ? (
              ganttData.phases.map((phase) => (
                <Box
                  key={phase.id}
                  sx={{
                    p: 2,
                    mb: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {phase.name}
                    </Typography>
                    <Chip
                      label={phase.status}
                      size="small"
                      color={getStatusColor(phase.status)}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      开始: {formatDate(phase.start_date)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      结束: {formatDate(phase.end_date)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      进度: {phase.progress || 0}%
                    </Typography>
                  </Box>
                </Box>
              ))
            ) : (
              <Typography color="text.secondary" variant="body2">
                暂无阶段数据
              </Typography>
            )}
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              里程碑
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {ganttData.milestones && ganttData.milestones.length > 0 ? (
              ganttData.milestones.map((milestone) => (
                <Box
                  key={milestone.id}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 1.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {milestone.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      日期: {formatDate(milestone.date)}
                    </Typography>
                  </Box>
                  <Chip
                    label={milestone.status}
                    size="small"
                    color={getStatusColor(milestone.status)}
                  />
                </Box>
              ))
            ) : (
              <Typography color="text.secondary" variant="body2">
                暂无里程碑数据
              </Typography>
            )}
          </Paper>
        </>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">请输入项目 ID 并加载甘特图</Typography>
        </Paper>
      )}
    </Box>
  );
};

export default GanttChartPage;
