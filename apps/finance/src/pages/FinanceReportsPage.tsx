import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { reportApi } from '../api/finance';

export const FinanceReportsPage: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [companyId, setCompanyId] = useState('');
  const [period, setPeriod] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<unknown>(null);

  const load = async () => {
    if (!companyId || !period) {
      setError('请填写公司和期间');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = { company_id: companyId, period };
      let result: unknown;
      if (tab === 0) {
        result = await reportApi.getBalanceSheet(params);
      } else if (tab === 1) {
        result = await reportApi.getIncomeStatement(params);
      } else {
        result = await reportApi.getCashFlowStatement(params);
      }
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
          财务报表
        </Typography>
        <Typography variant="body2" color="text.secondary">
          资产负债表 / 利润表 / 现金流量表
        </Typography>
      </Box>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_e, v) => { setTab(v); setData(null); }}>
          <Tab label="资产负债表" />
          <Tab label="利润表" />
          <Tab label="现金流量表" />
        </Tabs>
      </Paper>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            label="公司ID"
            size="small"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
          />
          <TextField
            label="期间 (YYYY-MM)"
            size="small"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
          <Button variant="contained" startIcon={<SearchIcon />} onClick={load}>
            查询
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : data ? (
        <Paper sx={{ p: 3 }}>
          <pre style={{ overflow: 'auto', margin: 0, fontSize: 13 }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </Paper>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">请填写查询条件后查看报表</Typography>
        </Paper>
      )}
    </Box>
  );
};

export default FinanceReportsPage;
