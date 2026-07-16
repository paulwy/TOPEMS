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
import type { EmailTemplate } from '@/api/mail';
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

interface EditTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  selectedTemplate: EmailTemplate | null;
  templateForm: TemplateForm;
  setTemplateForm: React.Dispatch<React.SetStateAction<TemplateForm>>;
  handleUpdateTemplate: (e: React.FormEvent) => void;
  resetTemplateForm: () => void;
  setSelectedTemplate: (template: EmailTemplate | null) => void;
}

const EditTemplateDialog: React.FC<EditTemplateDialogProps> = ({
  open,
  onClose,
  selectedTemplate,
  templateForm,
  setTemplateForm,
  handleUpdateTemplate,
  resetTemplateForm,
  setSelectedTemplate,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
    >
      <DialogContent sx={{ maxWidth: 600 }}>
        <DialogTitle>编辑邮件模板</DialogTitle>
        {selectedTemplate && (
          <form onSubmit={handleUpdateTemplate}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='edit-template-code'>模板编码</InputLabel>
                <TextField
                  id='edit-template-code'
                  value={templateForm.code}
                  disabled
                  size='small'
                  sx={{ bgcolor: 'grey.100' }}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='edit-template-name'>模板名称</InputLabel>
                <TextField
                  id='edit-template-name'
                  value={templateForm.name}
                  onChange={(e) =>
                    setTemplateForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder='如: 流程审批通知'
                  size='small'
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='edit-template-description'>描述</InputLabel>
                <TextField
                  id='edit-template-description'
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
                <InputLabel htmlFor='edit-template-category'>分类</InputLabel>
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
                <InputLabel htmlFor='edit-template-tags'>标签</InputLabel>
                <TextField
                  id='edit-template-tags'
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
                <InputLabel htmlFor='edit-template-subject'>主题模板</InputLabel>
                <TextField
                  id='edit-template-subject'
                  value={templateForm.subject_template}
                  onChange={(e) =>
                    setTemplateForm((prev) => ({
                      ...prev,
                      subject_template: e.target.value,
                    }))
                  }
                  placeholder='支持变量替换'
                  size='small'
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='edit-template-body'>正文模板</InputLabel>
                <TextField
                  id='edit-template-body'
                  value={templateForm.body_template}
                  onChange={(e) =>
                    setTemplateForm((prev) => ({
                      ...prev,
                      body_template: e.target.value,
                    }))
                  }
                  multiline
                  minRows={4}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='edit-template-body-html'>HTML正文模板</InputLabel>
                <TextField
                  id='edit-template-body-html'
                  value={templateForm.body_html_template}
                  onChange={(e) =>
                    setTemplateForm((prev) => ({
                      ...prev,
                      body_html_template: e.target.value,
                    }))
                  }
                  multiline
                  minRows={3}
                  sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                />
              </Box>
            </Box>
            <DialogActions sx={{ mt: 3 }}>
              <Button
                type='button'
                variant='contained'
                onClick={() => {
                  onClose();
                  setSelectedTemplate(null);
                  resetTemplateForm();
                }}
              >
                取消
              </Button>
              <Button type='submit'>保存修改</Button>
            </DialogActions>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EditTemplateDialog;
