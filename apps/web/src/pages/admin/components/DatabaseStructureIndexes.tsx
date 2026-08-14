/**
 * @done V79 Phase 2 split
 * Database change history component - displays field change records
 */
import React from 'react';
import {
  Box,
  Typography,
  TableContainer,
  Table as MuiTable,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import i18n from '@/i18n';
import { Clock } from 'lucide-react';
import type { DbChange } from '@/api/system';
interface DatabaseStructureIndexesProps {
  dbChanges: DbChange[];
}
export const DatabaseStructureIndexes: React.FC<DatabaseStructureIndexesProps> = ({
  dbChanges,
}) => {
  const changeTypeLabels: Record<string, string> = {
    add_column: i18n.t('admin.database_structure.add_field'),
    modify_column: i18n.t('admin.database_structure.modify_field'),
    drop_column: i18n.t('admin.database_structure.delete_field'),
  };
  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case 'add_column':
        return { bgcolor: 'success.lighter', color: 'success.700' };
      case 'drop_column':
        return { bgcolor: 'error.lighter', color: 'error.darker' };
      default:
        return { bgcolor: 'warning.light', color: 'warning.700' };
    }
  };
  return (
    <Box sx={{ p: 2 }}>
      {dbChanges.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            py: 8,
          }}
        >
          <Clock
            size={48}
            color='grey.400'
          />
          <Typography
            color='text.secondary'
            sx={{ mt: 2 }}
          >
            {i18n.t('admin.database_structure_page.text_98d867')}
          </Typography>
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
                  {i18n.t('admin.database_structure_page.text_19fcb9')}
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    color: 'text.secondary',
                    textTransform: 'uppercase',
                  }}
                >
                  {i18n.t('admin.database_structure_page.text_226b09')}
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    color: 'text.secondary',
                    textTransform: 'uppercase',
                  }}
                >
                  {i18n.t('admin.database_structure_page.text_7ecd01')}
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    color: 'text.secondary',
                    textTransform: 'uppercase',
                  }}
                >
                  {i18n.t('admin.database_structure_page.text_9caecd')}
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    color: 'text.secondary',
                    textTransform: 'uppercase',
                  }}
                >
                  SQL
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dbChanges.map((change) => {
                const style = getChangeTypeColor(change.change_type);
                return (
                  <TableRow
                    key={change.id}
                    sx={{
                      '&:hover': { bgcolor: 'grey.50' },
                    }}
                  >
                    <TableCell
                      sx={{
                        fontSize: '0.875rem',
                        color: 'text.secondary',
                      }}
                    >
                      {new Date(change.executed_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={changeTypeLabels[change.change_type] || change.change_type}
                        size='small'
                        sx={{
                          bgcolor: style.bgcolor,
                          color: style.color,
                          fontWeight: 500,
                          fontSize: '0.75rem',
                        }}
                      />
                    </TableCell>
                    <TableCell
                      sx={{
                        fontFamily:
                          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                      }}
                    >
                      {change.table_name}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: '0.875rem',
                        color: 'text.secondary',
                      }}
                    >
                      {change.column_name || '-'}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: '0.875rem',
                        color: 'text.secondary',
                        fontFamily:
                          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        maxWidth: 320,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {change.sql_statement}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </MuiTable>
        </TableContainer>
      )}
    </Box>
  );
};