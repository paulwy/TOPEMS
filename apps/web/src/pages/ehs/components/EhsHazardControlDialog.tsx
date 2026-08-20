/**
 * @done V80 split
 * Add-control-measure dialog: measure type, description, responsible, deadline.
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
import type { ControlFormData } from '../hooks/useEhsHazardDetail';

const ct = designTokens.colors;

interface EhsHazardControlDialogProps {
  open: boolean;
  controlFormData: ControlFormData;
  setControlFormData: React.Dispatch<React.SetStateAction<ControlFormData>>;
  onClose: () => void;
  onSave: () => void;
}

const EhsHazardControlDialog: React.FC<EhsHazardControlDialogProps> = ({
  open,
  controlFormData,
  setControlFormData,
  onClose,
  onSave,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='sm'
      fullWidth
    >
      <DialogTitle>{t('ehs.ehshazarddetailpage.text_676fd4')}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography
              variant='body2'
              sx={{ mb: 0.5, display: 'block' }}
            >
              {t('ehs.ehs_hazard_detail_page.measure_type_required')}
            </Typography>
            <FormControl
              fullWidth
              size='small'
            >
              <InputLabel>{t('ehs.ehshazarddetailpage.text_2edb59')}</InputLabel>
              <Select
                value={controlFormData.measure_type}
                label={t('ehs.ehs_hazard_detail_page.type')}
                onChange={(e) =>
                  setControlFormData((prev) => ({
                    ...prev,
                    measure_type: e.target.value as 'engineering' | 'administrative' | 'ppe',
                  }))
                }
              >
                <MenuItem value='engineering'>{t('ehs.ehshazarddetailpage.text_2c8522')}</MenuItem>
                <MenuItem value='administrative'>
                  {t('ehs.ehshazarddetailpage.text_39f2c2')}
                </MenuItem>
                <MenuItem value='ppe'>{t('ehs.ehshazarddetailpage.text_24c224')}</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Box>
            <Typography
              variant='body2'
              sx={{ mb: 0.5, display: 'block' }}
            >
              {t('ehs.ehs_hazard_detail_page.measure_desc_required')}
            </Typography>
            <TextField
              multiline
              rows={3}
              fullWidth
              value={controlFormData.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setControlFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder={t('ehs.ehs_hazard_detail_page.description_3')}
            />
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Box>
              <Typography
                variant='body2'
                sx={{ mb: 0.5, display: 'block' }}
              >
                {t('ehs.ehshazarddetailpage.text_022327')}
              </Typography>
              <TextField
                size='small'
                fullWidth
                value={controlFormData.responsible}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setControlFormData((prev) => ({ ...prev, responsible: e.target.value }))
                }
                placeholder={t('ehs.ehs_hazard_detail_page.manager_1')}
              />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ mb: 0.5, display: 'block' }}
              >
                {t('ehs.ehshazarddetailpage.text_2b1a9a')}
              </Typography>
              <TextField
                type='date'
                size='small'
                fullWidth
                value={controlFormData.deadline}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setControlFormData((prev) => ({ ...prev, deadline: e.target.value }))
                }
              />
            </Box>
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
          {t('ehs.ehshazarddetailpage.text_33412e')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EhsHazardControlDialog;
