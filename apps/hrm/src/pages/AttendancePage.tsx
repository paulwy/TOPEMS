import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  Button,
  TextField,
  Pagination,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
} from '@mui/material';

import { Clock, LogIn, LogOut, RefreshCw, Search } from 'lucide-react';

import { attendanceApi, type AttendanceRecord } from '../api/hrm';

const LoginIcon = LogIn;
const AccessTimeIcon = Clock;
const SearchIcon = Search;
const RefreshIcon = RefreshCw;
const LogoutIcon = LogOut;

const getStatusColor = (
  status: string
): 'default' | 'success' | 'warning' | 'error' | 'info' => {
  switch (status) {
    case 'present':
    case 'normal':
      return 'success';
    case 'late':
      return 'warning';
    case 'absent':
      return 'error';
    case 'leave':
      return 'info';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'present':
    case 'normal':
      return '出勤';
    case 'late':
      return '迟到';
    case 'absent':
      return '缺勤';
    case 'leave':
      return '请假';
    default:
      return status;
  }
};

export const AttendancePage: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');

  const loadRecords = async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await attendanceApi.list({ page: p, page_size: pageSize, search: searchKeyword || undefined });
      setRecords(data.items);
      setTotal(data.total);
      setPage(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载考勤记录失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCheckIn = async () => {
    try {
      const employeeId = 'current-employee';
      await attendanceApi.checkIn(employeeId);
      await loadRecords(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : '签到失败');
    }
  };

  const handleCheckOut = async () => {
    try {
      const employeeId = 'current-employee';
      await attendanceApi.checkOut(employeeId);
      await loadRecords(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : '签退失败');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            考勤管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            管理员工考勤记录、签到签退及统计
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" startIcon={<LoginIcon />} onClick={handleCheckIn}>
            签到
          </Button>
          <Button variant="outlined" startIcon={<LogoutIcon />} onClick={handleCheckOut}>
            签退
          </Button>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={() => loadRecords(page)}
          >
            刷新
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Stack direction="row" sx={{ alignItems: 'center' }} spacing={2}>
                <AccessTimeIcon color="primary" size={24} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    今日出勤
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {records.filter((r) => r.status === 'present' || r.status === 'normal').length}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Stack direction="row" sx={{ alignItems: 'center' }} spacing={2}>
                <AccessTimeIcon color="warning" size={24} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    迟到人次
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {records.filter((r) => r.status === 'late').length}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Stack direction="row" sx={{ alignItems: 'center' }} spacing={2}>
                <AccessTimeIcon color="error" size={24} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    缺勤人次
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {records.filter((r) => r.status === 'absent').length}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Stack direction="row" sx={{ alignItems: 'center' }} spacing={2}>
                <AccessTimeIcon color="info" size={24} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    请假人次
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {records.filter((r) => r.status === 'leave').length}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <TextField
            placeholder="搜索员工..."
            
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadRecords(1)}
             
            slotProps={{ input: { size: 'small', startAdornment: <SearchIcon style={{ color: 'text.secondary', marginRight: 4, fontSize: 20 }}  />  }}}
            sx={{ minWidth: 300 }}
          />
          <Button variant="outlined" onClick={() => loadRecords(1)}>
            搜索
          </Button>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>员工</TableCell>
                <TableCell>日期</TableCell>
                <TableCell>签到时间</TableCell>
                <TableCell>签退时间</TableCell>
                <TableCell>工作时长</TableCell>
                <TableCell>状态</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无考勤数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => (
                  <TableRow key={record.id} hover>
                    <TableCell>{record.employee_name || record.employee_id}</TableCell>
                    <TableCell>{record.date}</TableCell>
                    <TableCell>{record.check_in_time || record.check_in || '-'}</TableCell>
                    <TableCell>{record.check_out_time || record.check_out || '-'}</TableCell>
                    <TableCell>
                      {record.work_hours ? `${record.work_hours} 小时` : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(record.attendance_status || record.status)}
                        size="small"
                        color={getStatusColor(record.attendance_status || record.status)}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {total > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, p) => loadRecords(p)}
              size="small"
            />
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default AttendancePage;
