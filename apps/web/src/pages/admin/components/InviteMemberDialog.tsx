import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Box,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { TenantRole } from '@/api/tenant/types';

interface InviteMemberDialogProps {
  open: boolean;
  inviteForm: { email: string; role: TenantRole };
  onClose: () => void;
  onSubmit: () => void;
  onFormChange: (form: { email: string; role: TenantRole }) => void;
}

const InviteMemberDialog: React.FC<InviteMemberDialogProps> = ({
  open,
  inviteForm,
  onClose,
  onSubmit,
  onFormChange,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='sm'
      fullWidth
    >
      <DialogTitle> {t('admin.tenant_detail.invite_member')} </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label={t('admin.tenant_detail.email_address')}
            value={inviteForm.email}
            onChange={(e) => onFormChange({ ...inviteForm, email: e.target.value })}
            fullWidth
            type='email'
          />
          <FormControl fullWidth>
            <InputLabel> {t('admin.tenant_detail.role')} </InputLabel>
            <Select
              value={inviteForm.role}
              label={t('admin.tenant_detail.role')}
              onChange={(e) => onFormChange({ ...inviteForm, role: e.target.value as TenantRole })}
            >
              <MenuItem value='owner'> {t('admin.tenant_detail.owner')} </MenuItem>
              <MenuItem value='admin'> {t('admin.tenant_detail.administrator')} </MenuItem>
              <MenuItem value='member'> {t('admin.tenant_detail.member')} </MenuItem>
              <MenuItem value='guest'> {t('admin.tenant_detail.visitor')} </MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}> {t('admin.tenant_detail.cancel')} </Button>
        <Button
          variant='contained'
          onClick={onSubmit}
        >
          {t('admin.tenant_detail_page.text_8965f3')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InviteMemberDialog;
