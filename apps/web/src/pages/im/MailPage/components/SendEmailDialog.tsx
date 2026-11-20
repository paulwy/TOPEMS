import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import { Send as SendIcon } from 'lucide-react';
import { PRIORITY_OPTIONS } from '@/api/mail';
import type { SendForm } from '@/components/im/mail/types';
import { useTranslation } from 'react-i18next';

interface SendEmailDialogProps {
  open: boolean;
  onClose: () => void;
  sendForm: SendForm;
  setSendForm: React.Dispatch<React.SetStateAction<SendForm>>;
  formErrors: Record<string, string>;
  handleSendEmail: (e: React.FormEvent) => void;
  resetSendForm: () => void;
}

const SendEmailDialog: React.FC<SendEmailDialogProps> = ({
  open,
  onClose,
  sendForm,
  setSendForm,
  formErrors,
  handleSendEmail,
  resetSendForm,
}) => {
  const { t } = useTranslation('im');
  return (
    <Dialog
      open={open}
      onClose={onClose}
    >
      <DialogContent sx={{ maxWidth: 720 }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SendIcon size={20} />
          {t('im.mail_page_components_send_email_dialog.e1')}
        </DialogTitle>
        <form onSubmit={handleSendEmail}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <InputLabel htmlFor='send-subject'>
                {t('im.mail_page_components_send_email_dialog.r1')}
              </InputLabel>
              <TextField
                id='send-subject'
                value={sendForm.subject}
                onChange={(e) =>
                  setSendForm((prev) => ({
                    ...prev,
                    subject: e.target.value,
                  }))
                }
                placeholder={t('im.send_email_dialog.k7')}
                error={!!formErrors.subject}
                helperText={formErrors.subject}
              />
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <InputLabel htmlFor='send-to'>
                {t('im.mail_page_components_send_email_dialog.r2')}
              </InputLabel>
              <TextField
                id='send-to'
                value={sendForm.to_addresses}
                onChange={(e) =>
                  setSendForm((prev) => ({
                    ...prev,
                    to_addresses: e.target.value,
                  }))
                }
                placeholder={t('im.send_email_dialog.k8')}
                error={!!formErrors.to_addresses}
                helperText={formErrors.to_addresses}
              />
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <InputLabel htmlFor='send-cc'>{t('im.send_email_dialog.k9')}</InputLabel>
              <TextField
                id='send-cc'
                value={sendForm.cc_addresses}
                onChange={(e) =>
                  setSendForm((prev) => ({
                    ...prev,
                    cc_addresses: e.target.value,
                  }))
                }
                placeholder={t('im.send_email_dialog.k10')}
                error={!!formErrors.cc_addresses}
                helperText={formErrors.cc_addresses}
              />
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <InputLabel htmlFor='send-bcc'>{t('im.send_email_dialog.k11')}</InputLabel>
              <TextField
                id='send-bcc'
                value={sendForm.bcc_addresses}
                onChange={(e) =>
                  setSendForm((prev) => ({
                    ...prev,
                    bcc_addresses: e.target.value,
                  }))
                }
                placeholder={t('im.send_email_dialog.k12')}
                error={!!formErrors.bcc_addresses}
                helperText={formErrors.bcc_addresses}
              />
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <InputLabel htmlFor='send-body'>
                  {t('im.mail_page_components_send_email_dialog.r3')}
                </InputLabel>
                <FormControl
                  size='small'
                  sx={{ minWidth: 100 }}
                >
                  <Select
                    value={sendForm.priority}
                    onChange={(e) =>
                      setSendForm((prev) => ({
                        ...prev,
                        priority: e.target.value,
                      }))
                    }
                  >
                    {PRIORITY_OPTIONS.map((opt) => (
                      <MenuItem
                        key={opt.value}
                        value={opt.value}
                      >
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <TextField
                id='send-body'
                value={sendForm.body}
                onChange={(e) => setSendForm((prev) => ({ ...prev, body: e.target.value }))}
                placeholder={t('im.send_email_dialog.k13')}
                multiline
                minRows={4}
                error={!!formErrors.body}
                helperText={formErrors.body}
              />
            </Box>
          </Box>
          <DialogActions sx={{ mt: 3 }}>
            <Button
              type='button'
              variant='contained'
              onClick={() => {
                onClose();
                resetSendForm();
              }}
            >
              {t('im.mail_page_components_create_template_dialog.e5')}
            </Button>
            <Button type='submit'>{t('im.send_email_dialog.k14')}</Button>
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SendEmailDialog;
