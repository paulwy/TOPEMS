import React from 'react';
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
} from '@mui/material';
import type { Employee } from '@/api/hrm';

interface EmployeeDetailDialogProps {
  open: boolean;
  onClose: () => void;
  employee: Employee | null;
}

const STATUS_COLOR_MAP: Record<string, 'success' | 'default' | 'warning' | 'error'> = {
  active: 'success',
  inactive: 'default',
  leave: 'warning',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  active: '在职',
  inactive: '离职',
  leave: '请假',
};

const EmployeeDetailDialog: React.FC<EmployeeDetailDialogProps> = ({ open, onClose, employee }) => (
  <Dialog
    open={open}
    onClose={onClose}
    maxWidth='sm'
    fullWidth
  >
    <DialogTitle>员工详情</DialogTitle>
    <DialogContent>
      {employee && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 2, gap: 2, pt: 1 }}>
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              员工姓名
            </Typography>
            <Typography
              variant='body2'
              sx={{ fontWeight: 500 }}
            >
              {employee.name}
            </Typography>
          </Box>
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              工号
            </Typography>
            <Typography
              variant='body2'
              sx={{ fontWeight: 500 }}
            >
              {employee.employee_no || '-'}
            </Typography>
          </Box>
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              邮箱
            </Typography>
            <Typography variant='body2'>{employee.email || '-'}</Typography>
          </Box>
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              电话
            </Typography>
            <Typography variant='body2'>{employee.phone || '-'}</Typography>
          </Box>
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              部门
            </Typography>
            <Typography variant='body2'>{employee.department_name || '-'}</Typography>
          </Box>
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              职位
            </Typography>
            <Typography variant='body2'>{employee.position || '-'}</Typography>
          </Box>
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              入职日期
            </Typography>
            <Typography variant='body2'>{employee.hire_date || '-'}</Typography>
          </Box>
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              状态
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={STATUS_LABEL_MAP[employee.status] || employee.status}
                color={STATUS_COLOR_MAP[employee.status] || 'default'}
                size='small'
              />
            </Box>
          </Box>
        </Box>
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>关闭</Button>
    </DialogActions>
  </Dialog>
);

export default EmployeeDetailDialog;
