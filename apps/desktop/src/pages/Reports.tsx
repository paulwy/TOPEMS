import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import { Download, RefreshCw, BarChart3, PieChart, LineChart, Table } from 'lucide-react';

interface Report {
  id: string;
  name: string;
  description: string;
  type: 'chart' | 'table' | 'dashboard';
  lastGenerated: string;
  category: string;
}

const mockReports: Report[] = [
  { id: '1', name: '财务报表', description: '月度财务汇总报表', type: 'dashboard', lastGenerated: '2024-01-15', category: '财务' },
  { id: '2', name: '销售趋势分析', description: '季度销售数据分析', type: 'chart', lastGenerated: '2024-01-14', category: '销售' },
  { id: '3', name: '库存盘点报告', description: '仓库库存统计报表', type: 'table', lastGenerated: '2024-01-13', category: '仓储' },
  { id: '4', name: '客户分布分析', description: '客户地域分布统计', type: 'chart', lastGenerated: '2024-01-12', category: '销售' },
  { id: '5', name: '员工考勤报表', description: '月度考勤统计', type: 'table', lastGenerated: '2024-01-11', category: 'HR' },
  { id: '6', name: '采购支出分析', description: '采购成本分析报告', type: 'chart', lastGenerated: '2024-01-10', category: '采购' },
];

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
  const [reports] = useState<Report[]>(mockReports);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          报表分析
        </Typography>
        <Button variant="contained" startIcon={<BarChart3 size={18} />}>
          新建报表
        </Button>
      </Box>

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
                  <Button size="small" startIcon={<Download size={14} />}>导出</Button>
                  <Button size="small" startIcon={<RefreshCw size={14} />}>刷新</Button>
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
    </Box>
  );
};

export default Reports;