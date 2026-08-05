/**
 * @done V79 Phase 2 split
 * Database table structure detail table component - displays field list
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Typography,
  TableContainer,
  Table as MuiTable,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import { Plus, Trash2 } from 'lucide-react';
import type { TableDetail, ColumnInfo } from '@/api/system';

interface DatabaseStructureTableProps {
  selectedTable: TableDetail;
  detailLoading: boolean;
  onAddColumn: () => void;
  onDropColumn: (columnName: string) => void;
}

export const DatabaseStructureTable: React.FC<DatabaseStructureTableProps> = ({
  selectedTable,
  detailLoading,
  onAddColumn,
  onDropColumn,
}) => {
  const { t } = useTranslation();

  const getDataTypeDisplay = (col: ColumnInfo) => {
    let type = col.data_type.toUpperCase();
    if (col.character_maximum_length) {
      type = `VARCHAR(${col.character_maximum_length})`;
    } else if (col.numeric_precision && col.numeric_scale) {
      type = `NUMERIC(${col.numeric_precision}, ${col.numeric_scale})`;
    } else if (col.numeric_precision) {
      type = `NUMERIC(${col.numeric_precision})`;
    }
    return type;
  };

  return (
    <Box>
      {/* Info */}
      <Box
        sx={{
          p: 2.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        <Box>
          <Typography
            variant='h6'
            sx={{
              ...{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              },
              fontWeight: 600,
            }}
          >
            {selectedTable.table_name}
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ mt: 0.5 }}
          >
            {selectedTable.columns.length} {t('admin.database_structure.fields')} |{' '}
            {selectedTable.row_count?.toLocaleString() || '-'} {t('admin.database_structure.rows')}
          </Typography>
        </Box>
        <Button
          variant='contained'
          size='small'
          startIcon={<Plus size={16} />}
          onClick={onAddColumn}
          sx={{
            bgcolor: 'primary.dark',
            '&:hover': { bgcolor: 'primary.dark' },
            textTransform: 'none',
            borderRadius: 1.5,
          }}
        >
          {t('admin.database_structure_page.text_4484fa')}
        </Button>
      </Box>

      {/* Field list */}
      <Box sx={{ p: 2 }}>
        {detailLoading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              py: 6,
            }}
          >
            <CircularProgress size={28} />
          </Box>
        ) : (
          <TableContainer>
            <MuiTable size='small'>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                    }}
                  >
                    #
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                    }}
                  >
                    {t('admin.database_structure_page.text_d31455')}
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                    }}
                  >
                    {t('admin.database_structure_page.text_226b09')}
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                    }}
                  >
                    {t('admin.database_structure_page.text_d9b464')}
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                    }}
                  >
                    {t('admin.database_structure_page.text_225f3e')}
                  </TableCell>
                  <TableCell
                    align='right'
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                    }}
                  >
                    {t('admin.database_structure_page.text_2b6bc0')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedTable.columns.map((col) => (
                  <TableRow
                    key={col.column_name}
                    sx={{
                      '&:hover': { bgcolor: 'grey.50' },
                    }}
                  >
                    <TableCell
                      sx={{
                        color: 'text.secondary',
                        fontSize: '0.875rem',
                      }}
                    >
                      {col.ordinal_position}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontFamily:
                          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                      }}
                    >
                      {col.column_name}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: '0.875rem',
                        color: 'text.secondary',
                      }}
                    >
                      {getDataTypeDisplay(col)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}
                        size='small'
                        sx={{
                          bgcolor: col.is_nullable === 'YES' ? 'warning.light' : 'success.lighter',
                          color: col.is_nullable === 'YES' ? 'warning.700' : 'success.700',
                          fontWeight: 500,
                          fontSize: '0.75rem',
                        }}
                      />
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: '0.875rem',
                        color: 'text.secondary',
                        fontFamily:
                          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      }}
                    >
                      {col.column_default || '-'}
                    </TableCell>
                    <TableCell align='right'>
                      <Tooltip title={t('admin.database_structure.delete_field')}>
                        <IconButton
                          size='small'
                          color='error'
                          onClick={() => onDropColumn(col.column_name)}
                          sx={{
                            '&:hover': { bgcolor: 'error.lighter' },
                          }}
                        aria-label="删除"
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </MuiTable>
          </TableContainer>
        )}
      </Box>
    </Box>
  );
};
