import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Card,
  CardContent,
  CardActions,
  CircularProgress,
} from '@mui/material';
import { Download, RefreshCw, BarChart3, PieChart, LineChart, Table, Plus } from 'lucide-react';
import { reportsApi, type Report } from '../api/reports';

const getIcon = (type: Report['type']) => {
  switch (type) {
    case 'chart': return LineChart;
    case 'table': return Table;
    case 'dashboard': return BarChart3;
    default: return BarChart3;
  }
};

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    '财务': '#6366f1',
    '销售': '#22c55e',
    '仓储': '#f59e0b',
    'HR': '#ec4899',
    '采购': '#06b6d4',
  };
  return colors[category] || '#6b7280';
};

const Reports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await reportsApi.getReports({ page: 1, pageSize: 20 });
      setReports(response.items);
    } catch (err) {
      setError('获取报表列表失败');
      console.error('Failed to fetch reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReports();
   
  }, []);

  const handleRefresh = async () => {
    await fetchReports();
  };

  const handleExport = async (id: string) => {
    try {
      const blob = await reportsApi.exportReport(id, 'pdf');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report_${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export report:', err);
    }
  };

  const handleRefreshReport = async (id: string) => {
    try {
      await reportsApi.refreshReport(id);
      await fetchReports();
    } catch (err) {
      console.error('Failed to refresh report:', err);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          报表分析
        </Typography>
        <Button variant="contained" startIcon={<Plus size={18} />}>
          新建报表
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography variant="body1" color="error" sx={{ textAlign: 'center', mt: 10 }}>
          {error}
          <Button onClick={handleRefresh} sx={{ ml: 2 }}>重试</Button>
        </Typography>
      ) : (
        <>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {reports.map((report) => {
              const Icon = getIcon(report.type);
              return (
                <Box key={report.id} sx={{ flex: '1 1 280px', minWidth: '280px', maxWidth: '400px' }}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                        <div>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            backgroundColor: `${getCategoryColor(report.category)}15`,
                            color: getCategoryColor(report.category),
                          }}>
                            {report.category}
                          </span>
                        </div>
                        <Icon size={32} color={getCategoryColor(report.category)} />
                      </Box>
                      <Typography variant="h6" component="h3">
                        {report.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {report.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                        最后生成: {report.lastGenerated}
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button size="small" startIcon={<Download size={14} />} onClick={() => handleExport(report.id)}>
                        导出
                      </Button>
                      <Button size="small" startIcon={<RefreshCw size={14} />} onClick={() => handleRefreshReport(report.id)}>
                        刷新
                      </Button>
                    </CardActions>
                  </Card>
                </Box>
              );
            })}
          </Box>

          <Paper sx={{ mt: 4, p: 4 }}>
            <Typography variant="h6" component="h2" sx={{ mb: 4 }}>
              实时数据概览
            </Typography>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Box sx={{ flex: 1 }}>
                <Paper sx={{ p: 3, height: 300 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <div style={{ textAlign: 'center' }}>
                      <BarChart3 size={64} color="#6366f1" />
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>销售趋势图表</Typography>
                    </div>
                  </Box>
                </Paper>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Paper sx={{ p: 3, height: 300 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <div style={{ textAlign: 'center' }}>
                      <PieChart size={64} color="#22c55e" />
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>客户分布饼图</Typography>
                    </div>
                  </Box>
                </Paper>
              </Box>
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default Reports;
