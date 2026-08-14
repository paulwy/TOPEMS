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
import i18n from '@/i18n';
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
              <TableCell>{i18n.t('lims.instrument_data_table.k0')}</TableCell>
              <TableCell>{i18n.t('lims.instrument_data_table.k1')}</TableCell>
              <TableCell>{i18n.t('lims.instrument_data_table.k2')}</TableCell>
              <TableCell>{i18n.t('lims.instrument_data_table.k3')}</TableCell>
              <TableCell>{i18n.t('lims.instrument_data_table.k4')}</TableCell>
              <TableCell>{i18n.t('lims.instrument_data_table.k5')}</TableCell>
              <TableCell>{i18n.t('lims.instrument_data_table.k6')}</TableCell>
              <TableCell>{i18n.t('lims.instrument_data_table.k7')}</TableCell>
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
                      {i18n.t('pages.instrument_data_table.k0')}
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
                      <Tooltip title={i18n.t('lims.instrument_data_table.k8')}>
                        <IconButton
                          size='small'
                          onClick={() => onViewDetail(item)}
                          aria-label={i18n.t('lims.instrument_data_table.k9')}
                        >
                          <Eye size={16} />
                        </IconButton>
                      </Tooltip>
                      {item.status === 'pending' || item.status === 'failed' ? (
                        <Tooltip title={i18n.t('lims.instrument_data_table.k10')}>
                          <IconButton
                            size='small'
                            onClick={() => onParse(item.id)}
                            aria-label={i18n.t('lims.instrument_data_table.k11')}
                          >
                            <RefreshCw size={16} />
                          </IconButton>
                        </Tooltip>
                      ) : null}
                      <Tooltip title={i18n.t('lims.instrument_data_table.k12')}>
                        <IconButton
                          size='small'
                          onClick={() => onDelete(item.id)}
                          aria-label={i18n.t('lims.instrument_data_table.k13')}
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