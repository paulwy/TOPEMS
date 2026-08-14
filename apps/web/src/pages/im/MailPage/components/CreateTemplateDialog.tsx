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
  const { t } = useTranslation('im');
  return (
    <Dialog
      open={open}
      onClose={onClose}
    >
      <DialogContent sx={{ maxWidth: 600 }}>
        <DialogTitle>{i18n.t('im.create_template_dialog.k0')}</DialogTitle>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 2 }}
        >
          {t('im.mail_page_components_create_template_dialog.e1')}
        </Typography>
        <form onSubmit={handleCreateTemplate}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <InputLabel htmlFor='template-code'>
                {t('im.mail_page_components_create_template_dialog.r1')}
              </InputLabel>
              <TextField
                id='template-code'
                value={templateForm.code}
                onChange={(e) =>
                  setTemplateForm((prev) => ({
                    ...prev,
                    code: e.target.value,
                  }))
                }
                placeholder={t('im.mail_page_components_create_template_dialog.m1')}
                required
                size='small'
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <InputLabel htmlFor='template-name'>
                {t('im.mail_page_components_create_template_dialog.r2')}
              </InputLabel>
              <TextField
                id='template-name'
                value={templateForm.name}
                onChange={(e) =>
                  setTemplateForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                placeholder={t('im.mail_page_components_create_template_dialog.m2')}
                required
                size='small'
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <InputLabel htmlFor='template-description'>
                {t('im.create_template_dialog.k1')}
              </InputLabel>
              <TextField
                id='template-description'
                value={templateForm.description}
                onChange={(e) =>
                  setTemplateForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder={t('im.create_template_dialog.k2')}
                size='small'
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <InputLabel htmlFor='template-category'>
                {t('im.create_template_dialog.k3')}
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
              <InputLabel htmlFor='template-tags'>{t('im.create_template_dialog.k4')}</InputLabel>
              <TextField
                id='template-tags'
                value={templateForm.tags}
                onChange={(e) =>
                  setTemplateForm((prev) => ({
                    ...prev,
                    tags: e.target.value,
                  }))
                }
                placeholder={t('im.create_template_dialog.k5')}
                size='small'
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <InputLabel htmlFor='template-subject'>
                {t('im.mail_page_components_create_template_dialog.r3')}
              </InputLabel>
              <TextField
                id='template-subject'
                value={templateForm.subject_template}
                onChange={(e) =>
                  setTemplateForm((prev) => ({
                    ...prev,
                    subject_template: e.target.value,
                  }))
                }
                placeholder={t('im.mail_page_components_create_template_dialog.m3')}
                required
                size='small'
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <InputLabel htmlFor='template-body'>
                {t('im.mail_page_components_create_template_dialog.r4')}
              </InputLabel>
              <TextField
                id='template-body'
                value={templateForm.body_template}
                onChange={(e) =>
                  setTemplateForm((prev) => ({
                    ...prev,
                    body_template: e.target.value,
                  }))
                }
                placeholder={t('im.mail_page_components_create_template_dialog.m4')}
                multiline
                minRows={4}
                required
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <InputLabel htmlFor='template-body-html'>{t('im.mail_page_components_create_template_dialog.e1')}</InputLabel>
              <TextField
                id='template-body-html'
                value={templateForm.body_html_template}
                onChange={(e) =>
                  setTemplateForm((prev) => ({
                    ...prev,
                    body_html_template: e.target.value,
                  }))
                }
                placeholder={t('im.mail_page_components_create_template_dialog.m5')}
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
                {t('im.mail_page_components_create_template_dialog.e3')}
              </Typography>
              <Typography
                variant='body2'
                color='info.dark'
              >
                {t('im.mail_page_components_create_template_dialog.r5', { v1: ' ' })}
                <Box
                  component='code'
                  sx={{
                    bgcolor: 'background.paper',
                    px: 0.5,
                    py: 0.25,
                    borderRadius: 0.5,
                  }}
                >
                  {t('im.mail_page_components_create_template_dialog.l1')}
                </Box>{' '}
                {t('im.mail_page_components_create_template_dialog.e4')}
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
              {t('im.mail_page_components_create_template_dialog.e5')}
            </Button>
            <Button type='submit'>{t('im.create_template_dialog.k6')}</Button>
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTemplateDialog;
