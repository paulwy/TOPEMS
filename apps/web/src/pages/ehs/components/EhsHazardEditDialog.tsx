/**
 * @done V80 split
 * Edit-hazard dialog: form with name / category / location / severity selects etc.
 */
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { designTokens } from '@/theme/tokens';
import type { HazardFormData } from '../hooks/useEhsHazardDetail';

const ct = designTokens.colors;

interface EhsHazardEditDialogProps {
  open: boolean;
  formData: HazardFormData;
  setFormData: React.Dispatch<React.SetStateAction<HazardFormData>>;
  onClose: () => void;
  onSave: () => void;
}

const EhsHazardEditDialog: React.FC<EhsHazardEditDialogProps> = ({
  open,
  formData,
  setFormData,
  onClose,
  onSave,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='lg'
      fullWidth
    >
      <DialogTitle>{t('ehs.ehshazarddetailpage.text_416ddf')}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography
              variant='body2'
              sx={{ mb: 0.5, display: 'block' }}
            >
              {t('ehs.ehs_hazard_detail_page.hazard_name_required')}
            </Typography>
            <TextField
              size='small'
              fullWidth
              value={formData.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder={t('ehs.ehs_hazard_detail_page.please_input')}
            />
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Box>
              <Typography
                variant='body2'
                sx={{ mb: 0.5, display: 'block' }}
              >
                {t('ehs.ehshazarddetailpage.text_000a6b')}
              </Typography>
              <TextField
                size='small'
                fullWidth
                value={formData.category}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev) => ({ ...prev, category: e.target.value }))
                }
                placeholder={t('ehs.ehs_hazard_detail_page.please_input_2')}
              />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ mb: 0.5, display: 'block' }}
              >
                {t('ehs.ehshazarddetailpage.text_000a19')}
              </Typography>
              <TextField
                size='small'
                fullWidth
                value={formData.location}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev) => ({ ...prev, location: e.target.value }))
                }
                placeholder={t('ehs.ehs_hazard_detail_page.please_input_3')}
              />
            </Box>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
            <Box>
              <Typography
                variant='body2'
                sx={{ mb: 0.5, display: 'block' }}
              >
                {t('ehs.ehshazarddetailpage.text_25b83c')}
              </Typography>
              <FormControl
                fullWidth
                size='small'
              >
                <InputLabel>{t('ehs.ehshazarddetailpage.text_25b83c')}</InputLabel>
                <Select
                  value={formData.severity}
                  label={t('ehs.ehs_hazard_detail_page.text_08fe50')}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      severity: e.target.value as 'high' | 'medium' | 'low',
                    }))
                  }
                >
                  <MenuItem value='high'>{t('ehs.ehshazarddetailpage.text_00009a')}</MenuItem>
                  <MenuItem value='medium'>{t('ehs.ehshazarddetailpage.text_00004e')}</MenuItem>
                  <MenuItem value='low'>{t('ehs.ehshazarddetailpage.text_00004f')}</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ mb: 0.5, display: 'block' }}
              >
                {t('ehs.ehshazarddetailpage.text_30fa2c')}
              </Typography>
              <FormControl
                fullWidth
                size='small'
              >
                <InputLabel>{t('ehs.ehshazarddetailpage.text_30fa2c')}</InputLabel>
                <Select
                  value={formData.exposure}
                  label={t('ehs.ehs_hazard_detail_page.text_f83966')}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      exposure: e.target.value as 'high' | 'medium' | 'low',
                    }))
                  }
                >
                  <MenuItem value='high'>{t('ehs.ehshazarddetailpage.text_00009a')}</MenuItem>
                  <MenuItem value='medium'>{t('ehs.ehshazarddetailpage.text_00004e')}</MenuItem>
                  <MenuItem value='low'>{t('ehs.ehshazarddetailpage.text_00004f')}</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ mb: 0.5, display: 'block' }}
              >
                {t('ehs.ehshazarddetailpage.text_27deb2')}
              </Typography>
              <FormControl
                fullWidth
                size='small'
              >
                <InputLabel>{t('ehs.ehshazarddetailpage.text_27deb2')}</InputLabel>
                <Select
                  value={formData.likelihood}
                  label={t('ehs.ehs_hazard_detail_page.text_d7fbe9')}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      likelihood: e.target.value as 'high' | 'medium' | 'low',
                    }))
                  }
                >
                  <MenuItem value='high'>{t('ehs.ehshazarddetailpage.text_00009a')}</MenuItem>
                  <MenuItem value='medium'>{t('ehs.ehshazarddetailpage.text_00004e')}</MenuItem>
                  <MenuItem value='low'>{t('ehs.ehshazarddetailpage.text_00004f')}</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
          <Box>
            <Typography
              variant='body2'
              sx={{ mb: 0.5, display: 'block' }}
            >
              {t('ehs.ehshazarddetailpage.text_000e44')}
            </Typography>
            <FormControl
              fullWidth
              size='small'
            >
              <InputLabel>{t('ehs.ehshazarddetailpage.text_000e44')}</InputLabel>
              <Select
                value={formData.status}
                label={t('ehs.ehs_hazard_detail_page.status')}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    status: e.target.value as 'active' | 'controlled' | 'eliminated' | 'archived',
                  }))
                }
              >
                <MenuItem value='active'>{t('ehs.ehshazarddetailpage.text_01a45b')}</MenuItem>
                <MenuItem value='controlled'>{t('ehs.ehshazarddetailpage.text_016d0c')}</MenuItem>
                <MenuItem value='eliminated'>{t('ehs.ehshazarddetailpage.text_016e83')}</MenuItem>
                <MenuItem value='archived'>{t('ehs.ehshazarddetailpage.text_016c9c')}</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Box>
            <Typography
              variant='body2'
              sx={{ mb: 0.5, display: 'block' }}
            >
              {t('ehs.ehshazarddetailpage.text_000ca6')}
            </Typography>
            <TextField
              multiline
              rows={3}
              fullWidth
              value={formData.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder={t('ehs.ehs_hazard_detail_page.description_2')}
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          variant='outlined'
          onClick={onClose}
        >
          {t('ehs.ehshazarddetailpage.text_000a94')}
        </Button>
        <Button
          variant='contained'
          onClick={onSave}
          sx={{ backgroundColor: 'warning.600', '&:hover': { backgroundColor: ct.orange[700] } }}
        >
          {t('ehs.ehshazarddetailpage.text_25b189')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EhsHazardEditDialog;
