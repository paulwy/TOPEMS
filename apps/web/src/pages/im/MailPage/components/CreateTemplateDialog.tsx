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
  Typography,
} from '@mui/material';
import { TEMPLATE_CATEGORIES } from '@/api/mail';

interface TemplateForm {
  code: string;
  name: string;
  description: string;
  subject_template: string;
  body_template: string;
  body_html_template: string;
  category: string;
  tags: string;
}

interface CreateTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  templateForm: TemplateForm;
  setTemplateForm: React.Dispatch<React.SetStateAction<TemplateForm>>;
  handleCreateTemplate: (e: React.FormEvent) => void;
  resetTemplateForm: () => void;
}

const CreateTemplateDialog: React.FC<CreateTemplateDialogProps> = ({
  open,
  onClose,
  templateForm,
  setTemplateForm,
  handleCreateTemplate,
  resetTemplateForm,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
    >
      <DialogContent sx={{ maxWidth: 600 }}>
        <DialogTitle>创建邮件模板</DialogTitle>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 2 }}
        >
          创建新的邮件模板，支持变量替换
        </Typography>
        <form onSubmit={handleCreateTemplate}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <InputLabel htmlFor='template-code'>模板编码 *</InputLabel>
              <TextField
                id='template-code'
                value={templateForm.code}
                onChange={(e) =>
                  setTemplateForm((prev) => ({
                    ...prev,
                    code: e.target.value,
                  }))
                }
                placeholder='如: workflow_approval'
                required
                size='small'
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <InputLabel htmlFor='template-name'>模板名称 *</InputLabel>
              <TextField
                id='template-name'
                value={templateForm.name}
                onChange={(e) =>
                  setTemplateForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                placeholder='如: 流程审批通知'
                required
                size='small'
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <InputLabel htmlFor='template-description'>描述</InputLabel>
              <TextField
                id='template-description'
                value={templateForm.description}
                onChange={(e) =>
                  setTemplateForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder='简要描述此模板的用途'
                size='small'
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <InputLabel htmlFor='template-category'>分类</InputLabel>
              <FormControl
                size='small'
                sx={{ width: '100%' }}
              >
                <Select
                  value={templateForm.category}
                  onChange={(e) =>
                    setTemplateForm((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  displayEmpty
                >
                  <MenuItem
                    value=''
                    disabled
                  >
                    选择分类
                  </MenuItem>
                  {TEMPLATE_CATEGORIES.map((cat) => (
                    <MenuItem
                      key={cat.value}
                      value={cat.value}
                    >
                      {cat.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <InputLabel htmlFor='template-tags'>标签</InputLabel>
              <TextField
                id='template-tags'
                value={templateForm.tags}
                onChange={(e) =>
                  setTemplateForm((prev) => ({
                    ...prev,
                    tags: e.target.value,
                  }))
                }
                placeholder='多个标签用逗号分隔'
                size='small'
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <InputLabel htmlFor='template-subject'>主题模板 *</InputLabel>
              <TextField
                id='template-subject'
                value={templateForm.subject_template}
                onChange={(e) =>
                  setTemplateForm((prev) => ({
                    ...prev,
                    subject_template: e.target.value,
                  }))
                }
                placeholder='支持变量替换，如: 【TOPEMS】{{title}}'
                required
                size='small'
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <InputLabel htmlFor='template-body'>正文模板 *</InputLabel>
              <TextField
                id='template-body'
                value={templateForm.body_template}
                onChange={(e) =>
                  setTemplateForm((prev) => ({
                    ...prev,
                    body_template: e.target.value,
                  }))
                }
                placeholder='支持变量替换，如: 尊敬的{{user_name}}'
                multiline
                minRows={4}
                required
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <InputLabel htmlFor='template-body-html'>HTML正文模板</InputLabel>
              <TextField
                id='template-body-html'
                value={templateForm.body_html_template}
                onChange={(e) =>
                  setTemplateForm((prev) => ({
                    ...prev,
                    body_html_template: e.target.value,
                  }))
                }
                placeholder='HTML格式的邮件内容'
                multiline
                minRows={3}
                sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
              />
            </Box>
            <Box
              sx={{
                p: 2,
                bgcolor: 'info.light',
                borderRadius: 1,
                border: 1,
                borderColor: 'info.main',
              }}
            >
              <Typography
                variant='body2'
                sx={{ fontWeight: 500, color: 'info.dark', mb: 1 }}
              >
                变量使用说明
              </Typography>
              <Typography
                variant='body2'
                color='info.dark'
              >
                在模板中使用{' '}
                <Box
                  component='code'
                  sx={{
                    bgcolor: 'background.paper',
                    px: 0.5,
                    py: 0.25,
                    borderRadius: 0.5,
                  }}
                >
                  {'{{变量名}}'}
                </Box>{' '}
                格式的变量，发送邮件时传入数据即可替换。
              </Typography>
            </Box>
          </Box>
          <DialogActions sx={{ mt: 3 }}>
            <Button
              type='button'
              variant='contained'
              onClick={() => {
                onClose();
                resetTemplateForm();
              }}
            >
              取消
            </Button>
            <Button type='submit'>创建模板</Button>
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTemplateDialog;
