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
import type { EmailTemplate } from '@/api/mail';
import { PRIORITY_OPTIONS } from '@/api/mail';
import type { SendForm } from '../types';

interface SendEmailDialogProps {
  open: boolean;
  onClose: () => void;
  sendForm: SendForm;
  setSendForm: React.Dispatch<React.SetStateAction<SendForm>>;
  formErrors: Record<string, string>;
  templates: EmailTemplate[];
  handleTemplateChange: (code: string) => void;
  handleSendEmail: (e: React.FormEvent) => void;
  resetSendForm: () => void;
}

const SendEmailDialog: React.FC<SendEmailDialogProps> = ({
  open,
  onClose,
  sendForm,
  setSendForm,
  formErrors,
  templates,
  handleTemplateChange,
  handleSendEmail,
  resetSendForm,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
    >
      <DialogContent sx={{ maxWidth: 720 }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SendIcon size={20} />
          发送邮件
        </DialogTitle>
        <form onSubmit={handleSendEmail}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <InputLabel sx={{ fontSize: '1rem', fontWeight: 500 }}>使用模板</InputLabel>
              <Button
                variant='text'
                size='small'
                onClick={() =>
                  setSendForm((prev) => ({
                    ...prev,
                    useTemplate: !prev.useTemplate,
                  }))
                }
                sx={sendForm.useTemplate ? { color: 'primary.main' } : {}}
              >
                {sendForm.useTemplate ? '取消使用模板' : '使用模板'}
              </Button>
            </Box>

            {sendForm.useTemplate && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <InputLabel htmlFor='template-select'>选择模板</InputLabel>
                <FormControl
                  size='small'
                  sx={{ width: '100%' }}
                >
                  <Select
                    value={sendForm.template_code}
                    onChange={(e) => {
                      setSendForm((prev) => ({
                        ...prev,
                        template_code: e.target.value,
                      }));
                      handleTemplateChange(e.target.value);
                    }}
                    displayEmpty
                  >
                    <MenuItem
                      value=''
                      disabled
                    >
                      选择邮件模板
                    </MenuItem>
                    {templates.map((t) => (
                      <MenuItem
                        key={t.code}
                        value={t.code}
                      >
                        {t.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='template-data'>模板数据（JSON格式）</InputLabel>
                  <TextField
                    id='template-data'
                    placeholder={`{"user_name": "张三", "process_name": "报销申请"}`}
                    value={sendForm.templateData}
                    onChange={(e) =>
                      setSendForm((prev) => ({
                        ...prev,
                        templateData: e.target.value,
                      }))
                    }
                    multiline
                    minRows={3}
                    error={!!formErrors.templateData}
                    helperText={formErrors.templateData}
                    sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                  />
                </Box>
              </Box>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <InputLabel htmlFor='send-subject'>主题 *</InputLabel>
              <TextField
                id='send-subject'
                value={sendForm.subject}
                onChange={(e) =>
                  setSendForm((prev) => ({
                    ...prev,
                    subject: e.target.value,
                  }))
                }
                placeholder='输入邮件主题'
                error={!!formErrors.subject}
                helperText={formErrors.subject}
              />
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <InputLabel htmlFor='send-to'>收件人 *</InputLabel>
              <TextField
                id='send-to'
                value={sendForm.to_addresses}
                onChange={(e) =>
                  setSendForm((prev) => ({
                    ...prev,
                    to_addresses: e.target.value,
                  }))
                }
                placeholder='多个邮箱用逗号分隔'
                error={!!formErrors.to_addresses}
                helperText={formErrors.to_addresses}
              />
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <InputLabel htmlFor='send-cc'>抄送</InputLabel>
              <TextField
                id='send-cc'
                value={sendForm.cc_addresses}
                onChange={(e) =>
                  setSendForm((prev) => ({
                    ...prev,
                    cc_addresses: e.target.value,
                  }))
                }
                placeholder='多个邮箱用逗号分隔'
                error={!!formErrors.cc_addresses}
                helperText={formErrors.cc_addresses}
              />
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <InputLabel htmlFor='send-bcc'>密送</InputLabel>
              <TextField
                id='send-bcc'
                value={sendForm.bcc_addresses}
                onChange={(e) =>
                  setSendForm((prev) => ({
                    ...prev,
                    bcc_addresses: e.target.value,
                  }))
                }
                placeholder='多个邮箱用逗号分隔'
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
                <InputLabel htmlFor='send-body'>邮件内容 *</InputLabel>
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
                placeholder='输入邮件内容'
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
              取消
            </Button>
            <Button type='submit'>发送邮件</Button>
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SendEmailDialog;
