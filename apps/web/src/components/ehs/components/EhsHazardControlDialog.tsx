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
  useTheme,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { ControlFormData } from '../hooks/useEhsHazardDetail';

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
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='sm'
      fullWidth
    >
      <DialogTitle>{t('ehs.ehshazarddetailpage.add_control_measure')}</DialogTitle>
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
              <InputLabel>{t('ehs.ehshazarddetailpage.control_measure_type')}</InputLabel>
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
                <MenuItem value='engineering'>
                  {t('ehs.ehshazarddetailpage.engineering_control')}
                </MenuItem>
                <MenuItem value='administrative'>
                  {t('ehs.ehshazarddetailpage.management_measures')}
                </MenuItem>
                <MenuItem value='ppe'>{t('ehs.ehshazarddetailpage.ppe')}</MenuItem>
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
                {t('ehs.ehshazarddetailpage.measure_name')}
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
                {t('ehs.ehshazarddetailpage.planned_completion_date')}
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
          {t('ehs.ehshazarddetailpage.cancel')}
        </Button>
        <Button
          variant='contained'
          onClick={onSave}
          sx={{
            backgroundColor: 'warning.600',
            '&:hover': { backgroundColor: theme.palette.orange[700] },
          }}
        >
          {t('ehs.ehshazarddetailpage.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EhsHazardControlDialog;
