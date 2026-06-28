import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  ButtonGroup,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Divider,
  Alert,
} from '@mui/material';

import type { ExportFormat } from '../api/report';
import { ArrowLeft, FileText, Filter, Grid3X3, Printer } from 'lucide-react';
const ArrowBack = ArrowLeft;
const Description = FileText;
const FilterList = Filter;
const GridOn = Grid3X3;
const PictureAsPdf = FileText;
const Print = Printer;

interface ReportViewerPageProps {
  reportId?: string;
  onBack?: () => void;
}

export const ReportViewerPage: React.FC<ReportViewerPageProps> = ({ reportId, onBack }) => {
  const [format, setFormat] = useState<ExportFormat>('excel');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showFilters, setShowFilters] = useState(false);

  const mockColumns = ['序号', '名称', '类型', '金额', '状态', '创建时间'];
  const mockData = Array.from({ length: 50 }, (_, i) => ({
    序号: i + 1,
    名称: `报表项目 ${i + 1}`,
    类型: i % 2 === 0 ? '收入' : '支出',
    金额: (Math.random() * 10000).toFixed(2),
    状态: i % 3 === 0 ? '已完成' : i % 3 === 1 ? '进行中' : '待审核',
    创建时间: new Date(Date.now() - i * 86400000).toLocaleDateString('zh-CN'),
  }));

  const sortedData = [...mockData].sort((a, b) => {
    if (!sortColumn) return 0;
    const aVal = a[sortColumn as keyof typeof a];
    const bVal = b[sortColumn as keyof typeof b];

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }

    return sortDirection === 'asc'
      ? String(aVal).localeCompare(String(bVal), 'zh-CN')
      : String(bVal).localeCompare(String(aVal), 'zh-CN');
  });

  const paginatedData = sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const handleExport = () => {
    console.log('Export report in format:', format);
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '已完成':
        return 'success';
      case '进行中':
        return 'primary';
      case '待审核':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          {onBack && (
            <Button startIcon={<ArrowBack />} onClick={onBack} sx={{ mr: 2 }}>
              返回
            </Button>
          )}
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h4" component="h1">
              财务报表 - 月度收支明细
            </Typography>
            <Typography variant="body2" color="text.secondary">
              报表ID: {reportId || 'RPT-001'} | 生成时间:{' '}
              {new Date().toLocaleString('zh-CN')}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <ButtonGroup variant="outlined">
            <Button
              startIcon={<PictureAsPdf />}
              onClick={() => setFormat('pdf')}
              variant={format === 'pdf' ? 'contained' : 'outlined'}
            >
              PDF
            </Button>
            <Button
              startIcon={<GridOn />}
              onClick={() => setFormat('excel')}
              variant={format === 'excel' ? 'contained' : 'outlined'}
            >
              Excel
            </Button>
            <Button
              startIcon={<Description />}
              onClick={() => setFormat('csv')}
              variant={format === 'csv' ? 'contained' : 'outlined'}
            >
              CSV
            </Button>
          </ButtonGroup>
          <Button variant="contained" onClick={handleExport}>
            导出
          </Button>
          <Button variant="outlined" startIcon={<Print />} onClick={handlePrint}>
            打印
          </Button>
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => setShowFilters(!showFilters)}
          >
            筛选
          </Button>
        </Box>

        {showFilters && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              参数筛选
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                label="开始日期"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="结束日期"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>状态</InputLabel>
                <Select label="状态" defaultValue="">
                  <MenuItem value="">全部</MenuItem>
                  <MenuItem value="completed">已完成</MenuItem>
                  <MenuItem value="processing">进行中</MenuItem>
                  <MenuItem value="pending">待审核</MenuItem>
                </Select>
              </FormControl>
              <Button variant="contained">应用筛选</Button>
              <Button variant="outlined">重置</Button>
            </Box>
          </Paper>
        )}

        <Alert severity="info" sx={{ mb: 3 }}>
          共 {mockData.length} 条记录
        </Alert>

        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  {mockColumns.map((column) => (
                    <TableCell
                      key={column}
                      onClick={() => handleSort(column)}
                      sx={{
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        backgroundColor: 'grey.100',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {column}
                      {sortColumn === column && (
                        <span style={{ marginLeft: 4 }}>
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedData.map((row, index) => (
                  <TableRow key={index} hover>
                    {mockColumns.map((column) => (
                      <TableCell key={column}>
                        {column === '状态' ? (
                          <Chip
                            label={row[column as keyof typeof row]}
                            size="small"
                            color={getStatusColor(row[column as keyof typeof row] as string)}
                          />
                        ) : (
                          row[column as keyof typeof row]
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Divider />
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={mockData.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="每页行数"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} 共 ${count} 条`}
          />
        </Paper>
      </Box>
    </Container>
  );
};
