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
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

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
  const { t } = useTranslation('im');
  return (
    <Dialog
      open={open}
      onClose={onClose}
    >
      <DialogContent sx={{ maxWidth: 600 }}>
        <DialogTitle>{i18n.t('im.edit_template_dialog.k0')}</DialogTitle>
        {selectedTemplate && (
          <form onSubmit={handleUpdateTemplate}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='edit-template-code'>
                  {i18n.t('im.edit_template_dialog.k1')}
                </InputLabel>
                <TextField
                  id='edit-template-code'
                  value={templateForm.code}
                  disabled
                  size='small'
                  sx={{ bgcolor: 'grey.100' }}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='edit-template-name'>
                  {i18n.t('im.edit_template_dialog.k2')}
                </InputLabel>
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
                <InputLabel htmlFor='edit-template-description'>
                  {i18n.t('im.edit_template_dialog.k3')}
                </InputLabel>
                <TextField
                  id='edit-template-description'
                  value={templateForm.description}
                  onChange={(e) =>
                    setTemplateForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder={i18n.t('im.edit_template_dialog.k4')}
                  size='small'
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='edit-template-category'>
                  {t('im.edit_template_dialog.k5')}
                </InputLabel>
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
                      {t('im.mail_page_components_create_template_dialog.e2')}
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
                <InputLabel htmlFor='edit-template-tags'>
                  {t('im.edit_template_dialog.k6')}
                </InputLabel>
                <TextField
                  id='edit-template-tags'
                  value={templateForm.tags}
                  onChange={(e) =>
                    setTemplateForm((prev) => ({
                      ...prev,
                      tags: e.target.value,
                    }))
                  }
                  placeholder={t('im.edit_template_dialog.k7')}
                  size='small'
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='edit-template-subject'>
                  {t('im.edit_template_dialog.k8')}
                </InputLabel>
                <TextField
                  id='edit-template-subject'
                  value={templateForm.subject_template}
                  onChange={(e) =>
                    setTemplateForm((prev) => ({
                      ...prev,
                      subject_template: e.target.value,
                    }))
                  }
                  placeholder={t('im.edit_template_dialog.k9')}
                  size='small'
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='edit-template-body'>
                  {t('im.edit_template_dialog.k10')}
                </InputLabel>
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
                {t('im.mail_page_components_create_template_dialog.e5')}
              </Button>
              <Button type='submit'>{t('im.edit_template_dialog.k11')}</Button>
            </DialogActions>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EditTemplateDialog;
