import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  Printer,
  Search,
  Calendar,
  User,
  Hash,
  ChevronLeft,
  ChevronRight,
  X,
  Table,
  Eye,
} from 'lucide-react';
import {
  Box,
  Typography,
  TextField,
  Table as MuiTable,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Button,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import type { ReportData } from '@/api/report';

interface ReportViewerProps {
  report: ReportData;
  onClose: () => void;
}

const ReportViewer: React.FC<ReportViewerProps> = ({ report, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllColumns, setShowAllColumns] = useState(false);
  const itemsPerPage = 10;

  const filteredData = useMemo(() => {
    if (!searchTerm) return report.data;
    return report.data.filter((row) =>
      Object.values(row).some((value) =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [report.data, searchTerm]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const displayColumns = showAllColumns ? report.config.columns : report.config.columns.slice(0, 6);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = report.config.columns.join(',');
    const rows = report.data.map((row) =>
      report.config.columns
        .map((col) => {
          const value = row[col];
          if (value === null || value === undefined) return '';
          const str = String(value);
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(',')
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${report.config.title}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleExportJSON = () => {
    const json = JSON.stringify(report.data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${report.config.title}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? '是' : '否';
    if (typeof value === 'number') {
      return value.toLocaleString('zh-CN');
    }
    if (value instanceof Date) {
      return value.toLocaleDateString('zh-CN');
    }
    return String(value);
  };

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
      sx={{
        position: 'fixed',
        inset: 0,
        bgcolor: 'action.active',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        minHeight: 'auto',
      }}
    >
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 3,
          width: '100%',
          maxWidth: 1152,
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, primary.main 0%, primary.light 100%)',
            color: 'common.white',
            p: 3,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <FileText sx={{ width: 24, height: 24 }} />
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {report.config.title}
                </Typography>
              </Box>
              {report.config.description && (
                <Typography sx={{ color: 'primary.light', fontSize: 14 }}>
                  {report.config.description}
                </Typography>
              )}
            </Box>
            <Button
              onClick={onClose}
              sx={{
                p: 1,
                color: 'common.white',
                '&:hover': { bgcolor: 'action.disabledBackground' },
                borderRadius: 3,
                minWidth: 'auto',
              }}
            >
              <X sx={{ width: 24, height: 24 }} />
            </Button>
          </Box>
        </Box>

        {/* Meta Info */}
        <Box
          sx={{
            bgcolor: 'grey.100',
            px: 3,
            py: 2,
            borderBottom: 1,
            borderColor: 'grey.200',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 14,
                color: 'grey.600',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Hash sx={{ width: 16, height: 16, mr: 0.5 }} />
                报表ID: {report.id}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Calendar sx={{ width: 16, height: 16, mr: 0.5 }} />
                创建时间: {new Date(report.created_at).toLocaleDateString('zh-CN')}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Table sx={{ width: 16, height: 16, mr: 0.5 }} />共 {report.row_count} 条记录
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <User sx={{ width: 16, height: 16, mr: 0.5 }} />
                类型: {report.config.report_type}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                onClick={handleExportCSV}
                size='small'
                variant='contained'
                color='success'
                startIcon={<Download sx={{ width: 16, height: 16 }} />}
                sx={{ borderRadius: 3, textTransform: 'none' }}
              >
                导出CSV
              </Button>
              <Button
                onClick={handleExportJSON}
                size='small'
                variant='contained'
                color='secondary'
                startIcon={<Download sx={{ width: 16, height: 16 }} />}
                sx={{ borderRadius: 3, textTransform: 'none' }}
              >
                导出JSON
              </Button>
              <Button
                onClick={handlePrint}
                size='small'
                variant='contained'
                color='inherit'
                startIcon={<Printer sx={{ width: 16, height: 16 }} />}
                sx={{ borderRadius: 3, textTransform: 'none' }}
              >
                打印
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Search */}
        <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'grey.200' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ flex: 1, position: 'relative' }}>
              <Search
                sx={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 20,
                  height: 20,
                  color: 'grey.400',
                }}
              />
              <TextField
                fullWidth
                size='small'
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder='搜索报表数据...'
                sx={{ pl: 5, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              />
            </Box>
            <Button
              onClick={() => setShowAllColumns(!showAllColumns)}
              size='small'
              variant='outlined'
              startIcon={<Eye sx={{ width: 16, height: 16 }} />}
              sx={{ borderRadius: 3, textTransform: 'none' }}
            >
              {showAllColumns ? '收起列' : '显示全部列'}
            </Button>
            <Typography sx={{ fontSize: 14, color: 'grey.500' }}>
              {filteredData.length} 条匹配
            </Typography>
          </Box>
        </Box>

        {/* Table */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          {paginatedData.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <FileText
                sx={{
                  width: 64,
                  height: 64,
                  color: 'grey.300',
                  mx: 'auto',
                  mb: 2,
                }}
              />
              <Typography sx={{ color: 'grey.500' }}>暂无数据</Typography>
            </Box>
          ) : (
            <TableContainer
              component={Paper}
              sx={{ overflowX: 'auto' }}
            >
              <MuiTable
                sx={{ minWidth: '100%' }}
                size='small'
              >
                <TableHead sx={{ bgcolor: 'grey.100' }}>
                  <TableRow>
                    <TableCell sx={{ width: 64, fontWeight: 600, color: 'grey.600' }}>#</TableCell>
                    {displayColumns.map((column) => (
                      <TableCell
                        key={column}
                        sx={{
                          fontWeight: 600,
                          color: 'grey.600',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {column}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody sx={{ bgcolor: 'background.paper' }}>
                  {paginatedData.map((row, idx) => (
                    <TableRow
                      key={idx}
                      sx={{ '&:hover': { bgcolor: 'grey.50' } }}
                    >
                      <TableCell sx={{ color: 'grey.600' }}>
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </TableCell>
                      {displayColumns.map((column) => (
                        <TableCell
                          key={column}
                          sx={{ color: 'grey.900', whiteSpace: 'nowrap' }}
                        >
                          {formatValue(row[column])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </MuiTable>
            </TableContainer>
          )}
        </Box>

        {/* Pagination */}
        {totalPages > 1 && (
          <Box
            sx={{
              bgcolor: 'background.paper',
              borderTop: 1,
              borderColor: 'grey.200',
              px: 3,
              py: 2,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ fontSize: 14, color: 'grey.600' }}>
                显示 {(currentPage - 1) * itemsPerPage + 1} -{' '}
                {Math.min(currentPage * itemsPerPage, filteredData.length)} 条， 共{' '}
                {filteredData.length} 条
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  size='small'
                  sx={{
                    border: 1,
                    borderColor: 'grey.200',
                    '&:hover': { bgcolor: 'grey.50' },
                    '&.Mui-disabled': { opacity: 0.5 },
                  }}
                aria-label="展开"
                >
                  <ChevronLeft sx={{ width: 16, height: 16 }} />
                </IconButton>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      size='small'
                      variant={currentPage === pageNum ? 'contained' : 'outlined'}
                      sx={{ minWidth: 'auto', px: 1.5, borderRadius: 1 }}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <IconButton
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  size='small'
                  sx={{
                    border: 1,
                    borderColor: 'grey.200',
                    '&:hover': { bgcolor: 'grey.50' },
                    '&.Mui-disabled': { opacity: 0.5 },
                  }}
                aria-label="展开"
                >
                  <ChevronRight sx={{ width: 16, height: 16 }} />
                </IconButton>
              </Box>
            </Box>
          </Box>
        )}

        {/* Date Range Info */}
        {report.config.date_range && (
          <Box
            sx={{
              bgcolor: 'grey.100',
              px: 3,
              py: 1.5,
              borderTop: 1,
              borderColor: 'grey.200',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                fontSize: 14,
                color: 'grey.600',
              }}
            >
              <Calendar sx={{ width: 16, height: 16, mr: 1 }} />
              时间范围: {report.config.date_range.start_date} 至 {report.config.date_range.end_date}
            </Box>
          </Box>
        )}
      </Box>
    </PageContainer>
  );
};

export default ReportViewer;
