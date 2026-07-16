import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { Eye } from 'lucide-react';

interface PreviewContent {
  subject: string;
  body: string;
}

interface TemplatePreviewDialogProps {
  open: boolean;
  onClose: () => void;
  previewContent: PreviewContent | null;
}

const TemplatePreviewDialog: React.FC<TemplatePreviewDialogProps> = ({
  open,
  onClose,
  previewContent,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
    >
      <DialogContent sx={{ maxWidth: 600 }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Eye size={20} />
          模板预览
        </DialogTitle>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 2 }}
        >
          以下是模板渲染后的预览效果
        </Typography>
        {previewContent && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                主题
              </Typography>
              <Typography variant='h6'>{previewContent.subject}</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                正文内容
              </Typography>
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'grey.100',
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'grey.300',
                }}
              >
                <Box
                  component='pre'
                  sx={{
                    fontSize: '0.875rem',
                    whiteSpace: 'pre-wrap',
                    maxHeight: 320,
                    overflow: 'auto',
                  }}
                >
                  {previewContent.body}
                </Box>
              </Box>
            </Box>
          </Box>
        )}
        <DialogActions>
          <Button
            variant='outlined'
            onClick={onClose}
          >
            关闭
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
};

export default TemplatePreviewDialog;
