import React from 'react';
import { Plus, X, Check } from 'lucide-react';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import i18n from '@/i18n';
import type { VoucherManagementReturn } from '../hooks/useVoucherManagement';

type VoucherFormDialogProps = VoucherManagementReturn;
const VoucherFormDialog: React.FC<VoucherFormDialogProps> = (vm) => {
  const {
    showCreateModal,
    setShowCreateModal,
    newVoucher,
    setNewVoucher,
    subjects,
    addVoucherItem,
    updateVoucherItem,
    removeVoucherItem,
    handleCreate,
    resetForm,
    totalDebit,
    totalCredit,
    isBalanced,
    formatCurrency,
  } = vm;
  return (
    <Dialog
      open={showCreateModal}
      onClose={() => {
        setShowCreateModal(false);
        resetForm();
      }}
      maxWidth='lg'
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Plus size={20} />
          {i18n.t('erp.voucher_mgmt.label.add_accounting_voucher')}
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 2,
            }}
          >
            <FormControl size='small'>
              <InputLabel>{i18n.t('erp.voucher_mgmt.label.voucher_prefix')}</InputLabel>
              <Select
                value={newVoucher.voucher_type}
                label={i18n.t('erp.voucher_mgmt.label.voucher_prefix')}
                onChange={(e) =>
                  setNewVoucher((prev) => ({ ...prev, voucher_type: e.target.value }))
                }
              >
                <MenuItem value={i18n.t('erp.voucher_mgmt.voucher_type_short.receipt')}>
                  {i18n.t('erp.voucher_mgmt.label.receipt_short_label')}
                </MenuItem>
                <MenuItem value={i18n.t('erp.voucher_mgmt.voucher_type_short.payment')}>
                  {i18n.t('erp.voucher_mgmt.label.payment_short_label')}
                </MenuItem>
                <MenuItem value={i18n.t('erp.voucher_mgmt.voucher_type_short.transfer')}>
                  {i18n.t('erp.voucher_mgmt.label.transfer_short_label')}
                </MenuItem>
                <MenuItem value={i18n.t('erp.voucher_mgmt.voucher_type_short.accounting')}>
                  {i18n.t('erp.voucher_mgmt.label.accounting_short_label')}
                </MenuItem>
              </Select>
            </FormControl>
            <TextField
              size='small'
              label={i18n.t('erp.voucher_mgmt.label.voucher_number_required')}
              value={newVoucher.voucher_number}
              onChange={(e) =>
                setNewVoucher((prev) => ({ ...prev, voucher_number: e.target.value }))
              }
              placeholder={i18n.t('erp.voucher_mgmt.label.voucher_number_placeholder')}
            />
            <TextField
              size='small'
              label={i18n.t('erp.voucher_mgmt.label.voucher_date_required')}
              type='date'
              value={newVoucher.voucher_date}
              onChange={(e) => setNewVoucher((prev) => ({ ...prev, voucher_date: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } } as const}
            />
            <TextField
              size='small'
              label={i18n.t('erp.voucher_mgmt.label.period_required')}
              value={newVoucher.period}
              onChange={(e) => setNewVoucher((prev) => ({ ...prev, period: e.target.value }))}
              placeholder={i18n.t('erp.voucher_mgmt.label.period_placeholder')}
            />
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 2,
            }}
          >
            <TextField
              size='small'
              label={i18n.t('erp.voucher_mgmt.label.attachment_count')}
              type='number'
              value={newVoucher.attachment_count}
              onChange={(e) =>
                setNewVoucher((prev) => ({
                  ...prev,
                  attachment_count: parseInt(e.target.value) || 0,
                }))
              }
            />
          </Box>
          <TextField
            size='small'
            label={i18n.t('erp.voucher_mgmt.label.summary')}
            multiline
            rows={2}
            value={newVoucher.summary}
            onChange={(e) => setNewVoucher((prev) => ({ ...prev, summary: e.target.value }))}
            placeholder={i18n.t('erp.voucher_mgmt.label.voucher_summary')}
          />
          <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
              }}
            >
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600 }}
              >
                {i18n.t('erp.voucher_mgmt.label.voucher_items')}
              </Typography>
              <Button
                size='small'
                startIcon={<Plus size={16} />}
                onClick={addVoucherItem}
              >
                {i18n.t('erp.voucher_mgmt.label.add_entry')}
              </Button>
            </Box>
            <TableContainer
              component={Paper}
              variant='outlined'
            >
              <Table size='small'>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ width: 60, fontWeight: 'bold' }}>
                      {i18n.t('erp.voucher_mgmt.label.line_number')}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>
                      {i18n.t('erp.voucher_mgmt.label.subject')}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>
                      {i18n.t('erp.voucher_mgmt.label.summary')}
                    </TableCell>
                    <TableCell
                      align='right'
                      sx={{ width: 140, fontWeight: 'bold' }}
                    >
                      {i18n.t('erp.voucher_mgmt.label.debit_amount')}
                    </TableCell>
                    <TableCell
                      align='right'
                      sx={{ width: 140, fontWeight: 'bold' }}
                    >
                      {i18n.t('erp.voucher_mgmt.label.credit_amount')}
                    </TableCell>
                    <TableCell sx={{ width: 60 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {newVoucher.items.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        sx={{ py: 4, textAlign: 'center', color: 'text.disabled' }}
                      >
                        {i18n.t('erp.voucher_mgmt.message.click_to_add_items')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    newVoucher.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.line_number}</TableCell>
                        <TableCell>
                          <FormControl
                            fullWidth
                            size='small'
                          >
                            <Select
                              value={item.subject_code}
                              onChange={(e) =>
                                updateVoucherItem(index, 'subject_code', e.target.value)
                              }
                              displayEmpty
                            >
                              <MenuItem
                                value=''
                                disabled
                              >
                                {i18n.t('erp.voucher_mgmt.label.select_subject')}
                              </MenuItem>
                              {subjects.map((s) => (
                                <MenuItem
                                  key={s.id}
                                  value={s.code}
                                >
                                  {s.code} - {s.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          <TextField
                            size='small'
                            fullWidth
                            value={item.summary}
                            onChange={(e) => updateVoucherItem(index, 'summary', e.target.value)}
                            placeholder={i18n.t('erp.voucher_mgmt.label.summary')}
                          />
                        </TableCell>
                        <TableCell align='right'>
                          <TextField
                            size='small'
                            type='number'
                            fullWidth
                            value={item.debit_amount || ''}
                            onChange={(e) =>
                              updateVoucherItem(
                                index,
                                'debit_amount',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder='0.00'
                          />
                        </TableCell>
                        <TableCell align='right'>
                          <TextField
                            size='small'
                            type='number'
                            fullWidth
                            value={item.credit_amount || ''}
                            onChange={(e) =>
                              updateVoucherItem(
                                index,
                                'credit_amount',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder='0.00'
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size='small'
                            color='error'
                            onClick={() => removeVoucherItem(index)}
                            aria-label={i18n.t('erp.voucher_form_dialog.k0')}
                          >
                            <X size={16} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 4,
                mt: 2,
                pt: 2,
                borderTop: 1,
                borderColor: 'divider',
              }}
            >
              <Box sx={{ textAlign: 'right' }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('erp.voucher_mgmt.label.debit_total')}
                </Typography>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 'bold', color: 'error.main' }}
                >
                  {formatCurrency(totalDebit)}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('erp.voucher_mgmt.label.credit_total')}
                </Typography>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 'bold', color: 'success.main' }}
                >
                  {formatCurrency(totalCredit)}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('erp.voucher_mgmt.label.balance_status')}
                </Typography>
                <Chip
                  label={
                    isBalanced
                      ? i18n.t('erp.voucher_mgmt.label.balanced')
                      : i18n.t('erp.voucher_mgmt.label.unbalanced')
                  }
                  color={isBalanced ? 'success' : 'error'}
                  size='small'
                  icon={isBalanced ? <Check size={14} /> : <X size={14} />}
                />
              </Box>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={() => {
            setShowCreateModal(false);
            resetForm();
          }}
        >
          {i18n.t('erp.voucher_mgmt.label.cancel')}
        </Button>
        <Button
          variant='contained'
          onClick={handleCreate}
          disabled={!isBalanced}
        >
          {i18n.t('erp.voucher_mgmt.label.save_voucher')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
export default VoucherFormDialog;
