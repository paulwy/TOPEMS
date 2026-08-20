import React from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table as MuiTable,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  TablePagination,
  InputAdornment,
} from '@mui/material';
import i18n from '@/i18n';
import { Database, Table, Eye, Search } from 'lucide-react';
import type { TableInfo } from '@/api/erp/database';

interface DatabaseManagementTableListProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filteredTables: TableInfo[];
  tables: TableInfo[];
  loading: boolean;
  page: number;
  rowsPerPage: number;
  onPageChange: (newPage: number) => void;
  onRowsPerPageChange: (value: number) => void;
  onViewStructure: (table: TableInfo) => void;
}
const DatabaseManagementTableList: React.FC<DatabaseManagementTableListProps> = ({
  searchQuery,
  onSearchChange,
  filteredTables,
  tables,
  loading,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  onViewStructure,
}) => {
  return (
    <>
      <Box
        sx={{
          p: 2,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          alignItems: 'center',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <TextField
          size='small'
          placeholder={i18n.t('erp.database.label.search_table')}
          value={searchQuery}
          onChange={(e) => {
            onSearchChange(e.target.value);
            onPageChange(0);
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position='start'>
                  <Search
                    size={16}
                    style={{ opacity: 0.5 }}
                  />
                </InputAdornment>
              ),
            },
          }}
          sx={{ minWidth: 280 }}
        />
        <Box sx={{ flexGrow: 1 }} />
        <FormControl
          size='small'
          sx={{ minWidth: 140 }}
        >
          <InputLabel>{i18n.t('erp.database.label.sort')}</InputLabel>
          <Select
            value=''
            label={i18n.t('erp.database.label.sort')}
          >
            <MenuItem value=''>{i18n.t('erp.database.label.default_sort')}</MenuItem>
            <MenuItem value='name'>{i18n.t('erp.database.label.sort_by_name')}</MenuItem>
            <MenuItem value='time'>{i18n.t('erp.database.label.sort_by_time')}</MenuItem>
          </Select>
        </FormControl>
      </Box>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer>
            <MuiTable>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>
                    {i18n.t('erp.database.label.table_name')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>
                    {i18n.t('erp.database.label.type')}
                  </TableCell>
                  <TableCell
                    align='center'
                    sx={{ fontWeight: 'bold', width: 120 }}
                  >
                    {i18n.t('erp.database.label.operation')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTables.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      sx={{ py: 8, textAlign: 'center' }}
                    >
                      <Database
                        sx={{
                          width: 48,
                          height: 48,
                          color: 'text.disabled',
                          mx: 'auto',
                          mb: 2,
                        }}
                      />
                      <Typography
                        variant='body1'
                        sx={{ color: 'text.secondary' }}
                      >
                        {i18n.t('erp.database.label.no_tables')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTables.map((table) => (
                    <TableRow
                      key={table.table_name}
                      hover
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Table
                            size={16}
                            style={{ opacity: 0.5 }}
                          />
                          <Typography
                            sx={{
                              fontWeight: 500,
                              color: 'primary.main',
                              fontFamily: 'monospace',
                              fontSize: '0.875rem',
                            }}
                          >
                            {table.table_name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={table.table_type}
                          size='small'
                          variant='outlined'
                        />
                      </TableCell>
                      <TableCell align='center'>
                        <Tooltip title={i18n.t('erp.database.label.view_structure')}>
                          <IconButton
                            size='small'
                            onClick={() => onViewStructure(table)}
                            aria-label={i18n.t('erp.database_management_table_list.k0')}
                          >
                            <Eye size={16} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </MuiTable>
          </TableContainer>
          <TablePagination
            component='div'
            count={tables.length}
            page={page}
            onPageChange={(_, newPage) => onPageChange(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              onRowsPerPageChange(parseInt(e.target.value, 10));
              onPageChange(0);
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
            labelRowsPerPage={i18n.t('erp.database.label.rows_per_page')}
          />
        </>
      )}
    </>
  );
};
