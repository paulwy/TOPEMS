import React from 'react';
import { Settings, Edit, Trash2 } from 'lucide-react';
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
import type { ParseRule } from '@/api/lims';
import { getStatusColor, getStatusLabel } from '../utils';
import type { ChipColor } from '../utils';
interface ParseRuleTableProps {
  loading: boolean;
  rules: ParseRule[];
  totalCount: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  onEdit: (rule: ParseRule) => void;
  onDelete: (id: string) => void;
}
const ParseRuleTable: React.FC<ParseRuleTableProps> = ({
  loading,
  rules,
  totalCount,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  onEdit,
  onDelete,
}) => {
  return (
    <Paper>
      <TableContainer>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell>{i18n.t('lims.parse_rule_table.k0')}</TableCell>
              <TableCell>{i18n.t('lims.parse_rule_table.k1')}</TableCell>
              <TableCell>{i18n.t('lims.parse_rule_table.k2')}</TableCell>
              <TableCell>{i18n.t('lims.parse_rule_table.k3')}</TableCell>
              <TableCell>{i18n.t('lims.parse_rule_table.k4')}</TableCell>
              <TableCell>{i18n.t('lims.parse_rule_table.k5')}</TableCell>
              <TableCell>{i18n.t('lims.parse_rule_table.k6')}</TableCell>
              <TableCell>{i18n.t('lims.parse_rule_table.k7')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <LinearProgress />
                </TableCell>
              </TableRow>
            ) : rules.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  align='center'
                >
                  <Box sx={{ py: 4 }}>
                    <Settings
                      size={48}
                      opacity={0.3}
                    />
                    <Typography
                      color='text.secondary'
                      sx={{ mt: 1 }}
                    >
                      {i18n.t('pages.parse_rule_table.k0')}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              rules.map((rule) => (
                <TableRow
                  key={rule.id}
                  hover
                >
                  <TableCell>{rule.rule_no}</TableCell>
                  <TableCell>{rule.rule_name}</TableCell>
                  <TableCell>
                    <Chip
                      label={rule.protocol}
                      size='small'
                      variant='outlined'
                    />
                  </TableCell>
                  <TableCell>{rule.instrument_type || '-'}</TableCell>
                  <TableCell>v{rule.version}</TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(rule.status)}
                      size='small'
                      color={getStatusColor(rule.status) as ChipColor}
                    />
                  </TableCell>
                  <TableCell>{rule.created_at || '-'}</TableCell>
                  <TableCell>
                    <Stack
                      direction='row'
                      spacing={1}
                    >
                      <Tooltip title={i18n.t('lims.parse_rule_table.k8')}>
                        <IconButton
                          size='small'
                          onClick={() => onEdit(rule)}
                          aria-label={i18n.t('lims.parse_rule_table.k9')}
                        >
                          <Edit size={16} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={i18n.t('lims.parse_rule_table.k10')}>
                        <IconButton
                          size='small'
                          onClick={() => onDelete(rule.id)}
                          aria-label={i18n.t('lims.parse_rule_table.k11')}
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
export default ParseRuleTable;