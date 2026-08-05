import React from 'react';
import { Play, Edit, Trash2 } from 'lucide-react';
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
import type { CollectionTask } from '@/api/lims';
import { getStatusColor, getStatusLabel } from '../utils';
import type { ChipColor } from '../utils';

interface CollectionTaskTableProps {
  loading: boolean;
  tasks: CollectionTask[];
  totalCount: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  onTrigger: (id: string) => void;
  onEdit: (task: CollectionTask) => void;
  onDelete: (id: string) => void;
}

const CollectionTaskTable: React.FC<CollectionTaskTableProps> = ({
  loading,
  tasks,
  totalCount,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  onTrigger,
  onEdit,
  onDelete,
}) => {
  return (
    <Paper>
      <TableContainer>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell>任务编号</TableCell>
              <TableCell>任务名称</TableCell>
              <TableCell>仪器</TableCell>
              <TableCell>协议</TableCell>
              <TableCell>采集方式</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>上次运行</TableCell>
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
            ) : tasks.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  align='center'
                >
                  <Box sx={{ py: 4 }}>
                    <Play
                      size={48}
                      opacity={0.3}
                    />
                    <Typography
                      color='text.secondary'
                      sx={{ mt: 1 }}
                    >
                      暂无采集任务
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow
                  key={task.id}
                  hover
                >
                  <TableCell>{task.task_no}</TableCell>
                  <TableCell>{task.task_name}</TableCell>
                  <TableCell>{task.instrument_name || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={task.protocol}
                      size='small'
                      variant='outlined'
                    />
                  </TableCell>
                  <TableCell>{getStatusLabel(task.collection_mode)}</TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(task.status)}
                      size='small'
                      color={getStatusColor(task.status) as ChipColor}
                    />
                  </TableCell>
                  <TableCell>{task.last_run_at || '-'}</TableCell>
                  <TableCell>
                    <Stack
                      direction='row'
                      spacing={1}
                    >
                      <Tooltip title='立即采集'>
                        <IconButton
                          size='small'
                          onClick={() => onTrigger(task.id)}
                        aria-label="执行"
                        >
                          <Play size={16} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title='编辑'>
                        <IconButton
                          size='small'
                          onClick={() => onEdit(task)}
                        aria-label="编辑"
                        >
                          <Edit size={16} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title='删除'>
                        <IconButton
                          size='small'
                          onClick={() => onDelete(task.id)}
                        aria-label="删除"
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

export default CollectionTaskTable;
