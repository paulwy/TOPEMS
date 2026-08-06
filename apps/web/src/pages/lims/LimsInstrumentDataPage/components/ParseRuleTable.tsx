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
              <TableCell>规则编号</TableCell>
              <TableCell>规则名称</TableCell>
              <TableCell>协议</TableCell>
              <TableCell>仪器类型</TableCell>
              <TableCell>版本</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>创建时间</TableCell>
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
                      暂无解析规则
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
                      <Tooltip title='编辑'>
                        <IconButton
                          size='small'
                          onClick={() => onEdit(rule)}
                          aria-label='编辑'
                        >
                          <Edit size={16} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title='删除'>
                        <IconButton
                          size='small'
                          onClick={() => onDelete(rule.id)}
                          aria-label='删除'
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
