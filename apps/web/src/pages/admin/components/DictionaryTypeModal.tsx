import React from 'react';
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { DictType } from '@/api/system';

interface DictionaryTypeModalProps {
  open: boolean;
  editingType: DictType | null;
  newType: Partial<DictType>;
  onClose: () => void;
  setEditingType: React.Dispatch<React.SetStateAction<DictType | null>>;
  setNewType: React.Dispatch<React.SetStateAction<Partial<DictType>>>;
  onSubmit: (e: React.FormEvent) => void;
}

const DictionaryTypeModal: React.FC<DictionaryTypeModalProps> = ({
  open,
  editingType,
  newType,
  onClose,
  setEditingType,
  setNewType,
  onSubmit,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='sm'
      fullWidth
    >
      <DialogTitle>
        {editingType
          ? ` + ${t('admin.dictionary_management.edit_dictionary_type')} + `
          : t('admin.dictionary_management.new_dictionary_type')}
      </DialogTitle>
      <Box
        component='form'
        onSubmit={onSubmit}
      >
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label={t('admin.dictionary_management_page.attr_e21e27')}
              required
              disabled={!!editingType}
              value={editingType?.code || newType.code || ''}
              onChange={(e) => {
                if (editingType) {
                  setEditingType({ ...editingType, code: e.target.value });
                } else {
                  setNewType({ ...newType, code: e.target.value });
                }
              }}
              placeholder={t('admin.dictionary_management_page.attr_02123e')}
              size='small'
            />
            <TextField
              fullWidth
              label={t('admin.dictionary_management_page.attr_456f3a')}
              required
              value={editingType?.name || newType.name || ''}
              onChange={(e) => {
                if (editingType) {
                  setEditingType({ ...editingType, name: e.target.value });
                } else {
                  setNewType({ ...newType, name: e.target.value });
                }
              }}
              placeholder={t('admin.dictionary_management_page.attr_7bd820')}
              size='small'
            />
            <FormControl
              size='small'
              fullWidth
            >
              <InputLabel> {t('admin.dictionary_management.category')} </InputLabel>
              <Select
                value={editingType?.category || newType.category || 'business'}
                label={t('admin.dictionary_management.category')}
                onChange={(e) => {
                  if (editingType) {
                    setEditingType({ ...editingType, category: e.target.value });
                  } else {
                    setNewType({ ...newType, category: e.target.value });
                  }
                }}
              >
                <MenuItem value='system'>
                  {' '}
                  {t('admin.dictionary_management.system_dictionary')}{' '}
                </MenuItem>
                <MenuItem value='business'>
                  {' '}
                  {t('admin.dictionary_management.business_dictionary')}{' '}
                </MenuItem>
                <MenuItem value='basic'> {t('admin.dictionary_management.base_data')} </MenuItem>
                <MenuItem value='custom'>
                  {' '}
                  {t('admin.dictionary_management.custom_dictionary')}{' '}
                </MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label={t('admin.dictionary_management.description')}
              value={editingType?.description || newType.description || ''}
              onChange={(e) => {
                if (editingType) {
                  setEditingType({ ...editingType, description: e.target.value });
                } else {
                  setNewType({ ...newType, description: e.target.value });
                }
              }}
              multiline
              rows={2}
              size='small'
            />
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography variant='body2'> {t('admin.dictionary_management.status')} </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {(editingType?.status || newType.status) === 'active'
                    ? ` + ${t('admin.dictionary_management.enable')} + `
                    : t('admin.dictionary_management.disable')}
                </Typography>
                <Switch
                  checked={(editingType?.status || newType.status) === 'active'}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const status = e.target.checked ? 'active' : 'inactive';
                    if (editingType) {
                      setEditingType({ ...editingType, status });
                    } else {
                      setNewType({ ...newType, status });
                    }
                  }}
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
            {t('admin.dictionary_management_page.text_625fb2')}
          </Button>
          <Button
            type='submit'
            variant='contained'
          >
            {editingType
              ? ` + ${t('admin.dictionary_management.save')} + `
              : t('admin.dictionary_management.create')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default DictionaryTypeModal;
