import React from 'react';
import {
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  IconButton,
  LinearProgress,
  Box,
  Button,
} from '@mui/material';
import { Plus, Eye, Edit } from 'lucide-react';
import type { FmeaItem } from '@/api/qms';
import { getRpnRiskLevel } from '../utils';

interface FmeaItemsTableProps {
  items: FmeaItem[];
  loading: boolean;
  onViewItem: (item: FmeaItem) => void;
  onEditItem: (item: FmeaItem) => void;
  onAddItem: () => void;
}

const FmeaItemsTable: React.FC<FmeaItemsTableProps> = ({
  items,
  loading,
  onViewItem,
  onEditItem,
  onAddItem,
}) => {
  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant='contained'
          size='small'
          startIcon={<Plus />}
          onClick={onAddItem}
        >
          添加风险项
        </Button>
      </Box>
      {loading ? (
        <LinearProgress />
      ) : (
        <TableContainer
          component={Paper}
          variant='outlined'
        >
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>项号</TableCell>
                <TableCell>功能</TableCell>
                <TableCell>失效模式</TableCell>
                <TableCell>失效影响</TableCell>
                <TableCell align='center'>严重度</TableCell>
                <TableCell align='center'>发生度</TableCell>
                <TableCell align='center'>探测度</TableCell>
                <TableCell align='center'>RPN</TableCell>
                <TableCell align='center'>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => {
                const risk = getRpnRiskLevel(item.rpn);
                return (
                  <TableRow
                    key={item.id}
                    sx={{
                      bgcolor:
                        item.rpn >= 100
                          ? 'error.50'
                          : item.rpn >= 50
                            ? 'warning.light'
                            : 'inherit',
                    }}
                  >
                    <TableCell>{item.itemNo}</TableCell>
                    <TableCell sx={{ maxWidth: 150 }}>
                      {item.functionDescription}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 150 }}>{item.failureMode}</TableCell>
                    <TableCell sx={{ maxWidth: 150 }}>{item.failureEffect}</TableCell>
                    <TableCell align='center'>
                      <Chip
                        label={item.severity}
                        size='small'
                        color={
                          item.severity >= 8
                            ? 'error'
                            : item.severity >= 5
                              ? 'warning'
                              : 'success'
                        }
                        sx={{ minWidth: 40 }}
                      />
                    </TableCell>
                    <TableCell align='center'>
                      <Chip
                        label={item.occurrence}
                        size='small'
                        color={
                          item.occurrence >= 8
                            ? 'error'
                            : item.occurrence >= 5
                              ? 'warning'
                              : 'success'
                        }
                        sx={{ minWidth: 40 }}
                      />
                    </TableCell>
                    <TableCell align='center'>
                      <Chip
                        label={item.detection}
                        size='small'
                        color={
                          item.detection >= 8
                            ? 'error'
                            : item.detection >= 5
                              ? 'warning'
                              : 'success'
                        }
                        sx={{ minWidth: 40 }}
                      />
                    </TableCell>
                    <TableCell align='center'>
                      <Chip
                        label={item.rpn}
                        size='small'
                        color={risk.color}
                        sx={{ fontWeight: 600, minWidth: 50 }}
                      />
                    </TableCell>
                    <TableCell align='center'>
                      <IconButton
                        size='small'
                        onClick={() => onViewItem(item)}
                      >
                        <Eye style={{ width: 16, height: 16 }} />
                      </IconButton>
                      <IconButton
                        size='small'
                        onClick={() => onEditItem(item)}
                      >
                        <Edit style={{ width: 16, height: 16 }} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
              {items.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    align='center'
                    sx={{ py: 4 }}
                  >
                    暂无风险项，请添加
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  );
};

export default FmeaItemsTable;
