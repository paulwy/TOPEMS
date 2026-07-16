import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { AlertCircle } from 'lucide-react';
import type { Email } from '@/api/mail';

interface EmailDetailDialogProps {
  open: boolean;
  onClose: () => void;
  selectedEmail: Email | null;
  getStatusBadge: (status: string) => React.ReactNode;
  getPriorityBadge: (priority: string) => React.ReactNode;
}

const EmailDetailDialog: React.FC<EmailDetailDialogProps> = ({
  open,
  onClose,
  selectedEmail,
  getStatusBadge,
  getPriorityBadge,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
    >
      <DialogContent sx={{ maxWidth: 600 }}>
        <DialogTitle>{selectedEmail?.subject}</DialogTitle>
        {selectedEmail && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  发件人
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>{selectedEmail.from_address}</Typography>
              </Box>
              {getStatusBadge(selectedEmail.status)}
            </Box>
            <Box>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                收件人
              </Typography>
              <Typography>
                {Array.isArray(selectedEmail.to_addresses)
                  ? selectedEmail.to_addresses.join(', ')
                  : selectedEmail.to_addresses}
              </Typography>
            </Box>
            {selectedEmail.cc_addresses && (
              <Box>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  抄送
                </Typography>
                <Typography>
                  {Array.isArray(selectedEmail.cc_addresses)
                    ? selectedEmail.cc_addresses.join(', ')
                    : selectedEmail.cc_addresses}
                </Typography>
              </Box>
            )}
            {selectedEmail.bcc_addresses && (
              <Box>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  密送
                </Typography>
                <Typography>
                  {Array.isArray(selectedEmail.bcc_addresses)
                    ? selectedEmail.bcc_addresses.join(', ')
                    : selectedEmail.bcc_addresses}
                </Typography>
              </Box>
            )}
            <Box>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                优先级
              </Typography>
              {getPriorityBadge(selectedEmail.priority)}
            </Box>
            <Box>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                创建时间
              </Typography>
              <Typography>
                {new Date(selectedEmail.created_at).toLocaleString('zh-CN')}
              </Typography>
            </Box>
            {selectedEmail.sent_at && (
              <Box>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  发送时间
                </Typography>
                <Typography>
                  {new Date(selectedEmail.sent_at).toLocaleString('zh-CN')}
                </Typography>
              </Box>
            )}
            {selectedEmail.error_message && (
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'error.light',
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'error.main',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    color: 'error.dark',
                  }}
                >
                  <AlertCircle size={16} />
                  发送失败
                </Box>
                <Typography
                  variant='body2'
                  sx={{ mt: 1, color: 'error.dark' }}
                >
                  {selectedEmail.error_message}
                </Typography>
              </Box>
            )}
            <Box>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                邮件内容
              </Typography>
              <Box
                component='pre'
                sx={{
                  mt: 1,
                  p: 2,
                  bgcolor: 'grey.100',
                  borderRadius: 1,
                  fontSize: '0.875rem',
                  whiteSpace: 'pre-wrap',
                  maxHeight: 256,
                  overflow: 'auto',
                }}
              >
                {selectedEmail.body}
              </Box>
            </Box>
          </Box>
        )}
        <DialogActions>
          <Button
            variant='contained'
            onClick={onClose}
          >
            关闭
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
};

export default EmailDetailDialog;
