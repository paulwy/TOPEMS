import React from 'react';
import { Database, Eye, RefreshCw, Trash2 } from 'lucide-react';
import {
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  LinearProgress,
  Box,
  Typography,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  TablePagination,
} from '@mui/material';
import type { InstrumentData } from '@/api/lims';
import { getStatusColor, getStatusLabel } from '../utils';
import type { ChipColor } from '../utils';

interface InstrumentDataTableProps {
  loading: boolean;
  dataList: InstrumentData[];
  totalCount: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  onViewDetail: (data: InstrumentData) => void;
  onParse: (id: string) => void;
  onDelete: (id: string) => void;
}

const InstrumentDataTable: React.FC<InstrumentDataTableProps> = ({
  loading,
  dataList,
  totalCount,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  onViewDetail,
  onParse,
  onDelete,
}) => {
  return (
    <Paper>
      <TableContainer>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell>数据编号</TableCell>
              <TableCell>仪器</TableCell>
              <TableCell>批次号</TableCell>
              <TableCell>协议</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>质量分</TableCell>
              <TableCell>采集时间</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <LinearProgress />
                </TableCell>
              </TableRow>
            ) : dataList.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  align='center'
                >
                  <Box sx={{ py: 4 }}>
                    <Database
                      size={48}
                      opacity={0.3}
                    />
                    <Typography
                      color='text.secondary'
                      sx={{ mt: 1 }}
                    >
                      暂无数据
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              dataList.map((item) => (
                <TableRow
                  key={item.id}
                  hover
                >
                  <TableCell>{item.data_no}</TableCell>
                  <TableCell>{item.instrument_name || '-'}</TableCell>
                  <TableCell>{item.batch_no}</TableCell>
                  <TableCell>
                    <Chip
                      label={item.protocol}
                      size='small'
                      variant='outlined'
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(item.status)}
                      size='small'
                      color={getStatusColor(item.status) as ChipColor}
                    />
                  </TableCell>
                  <TableCell>
                    {item.quality_score !== undefined && item.quality_score !== null
                      ? `${item.quality_score}%`
                      : '-'}
                  </TableCell>
                  <TableCell>{item.collected_at || '-'}</TableCell>
                  <TableCell>
                    <Stack
                      direction='row'
                      spacing={1}
                    >
                      <Tooltip title='查看详情'>
                        <IconButton
                          size='small'
                          onClick={() => onViewDetail(item)}
                        >
                          <Eye size={16} />
                        </IconButton>
                      </Tooltip>
                      {item.status === 'pending' || item.status === 'failed' ? (
                        <Tooltip title='重新解析'>
                          <IconButton
                            size='small'
                            onClick={() => onParse(item.id)}
                          >
                            <RefreshCw size={16} />
                          </IconButton>
                        </Tooltip>
                      ) : null}
                      <Tooltip title='删除'>
                        <IconButton
                          size='small'
                          onClick={() => onDelete(item.id)}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 50]}
        component='div'
        count={totalCount}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, p) => onPageChange(p)}
        onRowsPerPageChange={(e) => {
          onRowsPerPageChange(parseInt(e.target.value, 10));
        }}
      />
    </Paper>
  );
};

export default InstrumentDataTable;
