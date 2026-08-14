import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { ImageUpload } from '@/components/common';
import { AIHelperButton } from '@/components/ai';
import type { EmployeeFormDialogProps } from '../types';

import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const EmployeeFormDialog: React.FC<EmployeeFormDialogProps> = ({
  open,
  onClose,
  mode,
  formData,
  onChange,
  onSubmit,
  companies,
  departments,
  onOpenAICodeGenerator,
  onOpenAIDataCompleter,
  onOpenAIFormValidator,
}) => {
  const { t } = useTranslation();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='sm'
      fullWidth
    >
      <DialogTitle>
        {mode === 'create'
          ? i18n.t('hrm.hrm_employee_page_components__employee_form_dialog.add')
          : i18n.t('hrm.hrm_employee_page_components__employee_form_dialog.edit')}
      </DialogTitle>
      <DialogContent>
        <Box
          component='form'
          onSubmit={onSubmit}
          sx={{ display: 'grid', gap: 2, pt: 1 }}
        >
          <FormControl
            size='small'
            fullWidth
          >
            <InputLabel>{t('hrm.hrm_employee_page_components_employee_form_dialog.r1')}</InputLabel>
            <Select
              value={(formData as { org_id?: string })?.org_id || ''}
              label={i18n.t('hrm.hrm_employee_page_components__employee_form_dialog.text_c3846b')}
              onChange={(e) => onChange('org_id', e.target.value)}
              required
            >
              {companies.map((c) => (
                <MenuItem
                  key={c.id}
                  value={c.id}
                >
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
              sx={{ mb: 1, display: 'block' }}
            >
              {t('hrm.hrm_employee_page_components_employee_form_dialog.e1')}
            </Typography>
            <ImageUpload
              value={
                (formData as unknown as Record<string, unknown>)?.avatar_url
                  ? [(formData as unknown as Record<string, unknown>).avatar_url as string]
                  : []
              }
              onChange={(files) => onChange('avatar_url', files[0] || '')}
              maxCount={1}
              accept='image/*'
              cropEnabled
              cropAspect={1}
              height={120}
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: 2, gap: 2 }}>
            <TextField
              label={t('hrm.hrm_employee_page_components__employee_form_dialog.text_88eff5')}
              size='small'
              value={(formData as { name?: string })?.name || ''}
              onChange={(e) => onChange('name', e.target.value)}
              required
            />
            <Box sx={{ position: 'relative' }}>
              <TextField
                label={t('hrm.hrm_employee_page_components__employee_form_dialog.text_752d38')}
                size='small'
                value={(formData as { employee_no?: string })?.employee_no || ''}
                onChange={(e) => onChange('employee_no', e.target.value)}
                fullWidth
              />
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: 2, gap: 2 }}>
            <TextField
              label={t('hrm.hrm_employee_page_components__employee_form_dialog.email')}
              type='email'
              size='small'
              value={(formData as { email?: string })?.email || ''}
              onChange={(e) => onChange('email', e.target.value)}
            />
            <TextField
              label={t('hrm.hrm_employee_page_components__employee_form_dialog.phone')}
              size='small'
              value={(formData as { phone?: string })?.phone || ''}
              onChange={(e) => onChange('phone', e.target.value)}
            />
          </Box>

          <FormControl
            size='small'
            fullWidth
          >
            <InputLabel>{t('hrm.employee_form_dialog.k0')}</InputLabel>
            <Select
              value={(formData as { department_id?: string })?.department_id || ''}
              label={t('hrm.hrm_employee_page_components__employee_form_dialog.text_68923b')}
              onChange={(e) => onChange('department_id', e.target.value)}
            >
              <MenuItem value=''>
                {t('hrm.hrm_employee_page_components_employee_form_dialog.e2')}
              </MenuItem>
              {departments.map((d) => (
                <MenuItem
                  key={d.id}
                  value={d.id}
                >
                  {d.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label={t('hrm.hrm_employee_page_components__employee_form_dialog.text_b652de')}
            size='small'
            value={(formData as { position?: string })?.position || ''}
            onChange={(e) => onChange('position', e.target.value)}
          />

          <TextField
            label={t('hrm.hrm_employee_page_components__employee_form_dialog.date')}
            type='date'
            size='small'
            value={(formData as { hire_date?: string })?.hire_date || ''}
            onChange={(e) => onChange('hire_date', e.target.value)}
            slotProps={{ inputLabel: { shrink: true } } as const}
          />

          <FormControl
            size='small'
            fullWidth
          >
            <InputLabel>{t('hrm.employee_form_dialog.k1')}</InputLabel>
            <Select
              value={(formData as { status?: string })?.status || 'active'}
              label={t('hrm.hrm_employee_page_components__employee_form_dialog.status')}
              onChange={(e) => onChange('status', e.target.value)}
            >
              <MenuItem value='active'>{t('hrm.employee_form_dialog.k2')}</MenuItem>
              <MenuItem value='inactive'>{t('hrm.employee_form_dialog.k3')}</MenuItem>
            </Select>
          </FormControl>

          <DialogActions sx={{ p: 0, pt: 2, justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <AIHelperButton
                type='generate'
                onClick={() => onOpenAICodeGenerator(mode)}
                size='small'
                label={t('hrm.hrm_employee_page_components__employee_form_dialog.text_0dd441')}
              />
              <AIHelperButton
                type='complete'
                onClick={onOpenAIDataCompleter}
                size='small'
                label={t('hrm.hrm_employee_page_components__employee_form_dialog.text_e93748')}
              />
              <AIHelperButton
                type='validate'
                onClick={onOpenAIFormValidator}
                size='small'
                label={t('hrm.hrm_employee_page_components__employee_form_dialog.text_6bc019')}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                onClick={onClose}
                variant='outlined'
              >
                {t('hrm.employee_finance_tab.e2')}
              </Button>
              <Button
                type='submit'
                variant='contained'
              >
                {mode === 'create'
                  ? t('hrm.hrm_employee_page_components__employee_form_dialog.create')
                  : t('hrm.hrm_employee_page_components__employee_form_dialog.save')}
              </Button>
            </Box>
          </DialogActions>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeFormDialog;
