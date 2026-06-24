import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  TextField,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Search } from '@mui/icons-material';
import { reportApi, type Report, type ReportCategory } from '../api/report';
import { ReportCard } from '../components/ReportCard';

const categories: { value: ReportCategory | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'finance', label: '财务' },
  { value: 'hr', label: '人事' },
  { value: 'sales', label: '销售' },
  { value: 'inventory', label: '库存' },
];

export const ReportListPage: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<ReportCategory | 'all'>('all');
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await reportApi.listReports({
          category: category !== 'all' ? category : undefined,
          keyword: keyword || undefined,
        });
        setReports(data);
      } catch (err) {
        console.error('Failed to fetch reports:', err);
        setError('加载报表列表失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [category, keyword]);

  const handleGenerate = (report: Report) => {
    console.log('Generate report:', report);
  };

  const handleView = (report: Report) => {
    console.log('View report:', report);
  };

  const handleCategoryChange = (_: React.SyntheticEvent, newValue: ReportCategory | 'all') => {
    setCategory(newValue);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          报表中心
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          浏览和生成各类业务报表
        </Typography>

        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            placeholder="搜索报表..."
            size="small"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />,
            }}
            sx={{ minWidth: 250 }}
          />
        </Box>

        <Tabs value={category} onChange={handleCategoryChange} sx={{ mb: 3 }}>
          {categories.map((cat) => (
            <Tab key={cat.value} value={cat.value} label={cat.label} />
          ))}
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : reports.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body1" color="text.secondary">
              暂无报表数据
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {reports.map((report) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={report.id}>
                <ReportCard report={report} onGenerate={handleGenerate} onView={handleView} />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Container>
  );
};
