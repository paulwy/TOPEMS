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
import i18n from '@/i18n';

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

function getStatusLabelMap(): Record<string, string> {
  return {
    active: i18n.t('hrm.employee_detail_dialog.k0'),
    inactive: i18n.t('hrm.employee_detail_dialog.k1'),
    leave: i18n.t('hrm.employee_detail_dialog.k2'),
  };
}

const EmployeeDetailDialog: React.FC<EmployeeDetailDialogProps> = ({ open, onClose, employee }) => (
  <Dialog
    open={open}
    onClose={onClose}
    maxWidth='sm'
    fullWidth
  >
    <DialogTitle>{i18n.t('hrm.employee_detail_dialog.k3')}</DialogTitle>
    <DialogContent>
      {employee && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 2, gap: 2, pt: 1 }}>
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {i18n.t('hrm.hrm_employee_page_components_employee_detail_dialog.e1')}
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
              {i18n.t('hrm.hrm_employee_page_components_employee_detail_dialog.e2')}
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
              {i18n.t('hrm.hrm_employee_page_components_employee_detail_dialog.e3')}
            </Typography>
            <Typography variant='body2'>{employee.email || '-'}</Typography>
          </Box>
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {i18n.t('hrm.hrm_employee_page_components_employee_detail_dialog.e4')}
            </Typography>
            <Typography variant='body2'>{employee.phone || '-'}</Typography>
          </Box>
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {i18n.t('hrm.hrm_employee_page_components_employee_detail_dialog.e5')}
            </Typography>
            <Typography variant='body2'>{employee.department_name || '-'}</Typography>
          </Box>
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {i18n.t('hrm.hrm_employee_page_components_employee_detail_dialog.e6')}
            </Typography>
            <Typography variant='body2'>{employee.position || '-'}</Typography>
          </Box>
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {i18n.t('hrm.hrm_employee_page_components_employee_detail_dialog.e7')}
            </Typography>
            <Typography variant='body2'>{employee.hire_date || '-'}</Typography>
          </Box>
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {i18n.t('hrm.hrm_employee_page_components_employee_detail_dialog.e8')}
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={getStatusLabelMap()[employee.status] || employee.status}
                color={STATUS_COLOR_MAP[employee.status] || 'default'}
                size='small'
              />
            </Box>
          </Box>
        </Box>
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>{i18n.t('hrm.employee_detail_dialog.k4')}</Button>
    </DialogActions>
  </Dialog>
);

export default EmployeeDetailDialog;
