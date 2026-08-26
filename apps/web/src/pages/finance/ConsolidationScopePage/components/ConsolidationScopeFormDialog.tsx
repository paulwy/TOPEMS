import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
} from '@mui/material';
import type { ScopeFormData, CompanyFormData } from '../hooks/useConsolidationScope';

// Scope form dialog
interface ScopeFormDialogProps {
  open: boolean;
  editMode: boolean;
  formData: Partial<ScopeFormData>;
  isSubmitting: boolean;
  onFormDataChange: (data: Partial<ScopeFormData>) => void;
  onSave: () => void;
  onClose: () => void;
}

export function ScopeFormDialog({
  open,
  editMode,
  formData,
  isSubmitting,
  onFormDataChange,
  onSave,
  onClose,
}: ScopeFormDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='sm'
      fullWidth
    >
      <DialogTitle>
        {editMode
          ? ` + ${t('finance.consolidation_scope_page.edit')}`
          : t('finance.consolidation_scope_page.text_425d69')}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            label={t('finance.consolidation_scope_page.code_2')}
            value={formData.code || ''}
            onChange={(e) => onFormDataChange({ ...formData, code: e.target.value })}
            placeholder={t('finance.consolidation_scope_page.please_input_1')}
            disabled={editMode}
          />
          <TextField
            fullWidth
            label={t('finance.consolidation_scope_page.name_2')}
            value={formData.name || ''}
            onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
            placeholder={t('finance.consolidation_scope_page.please_input_2')}
          />
          <FormControl fullWidth>
            <InputLabel>{t('finance.consolidation_scope_page.text_e15d05')}</InputLabel>
            <Select
              value={formData.consolidation_method || 'full'}
              label={t('finance.consolidation_scope_page.text_e15d05')}
              onChange={(e) =>
                onFormDataChange({
                  ...formData,
                  consolidation_method: e.target.value as 'full' | 'equity' | 'proportional',
                })
              }
            >
              <MenuItem value='full'>{t('finance.consolidation_scope_page.text_a8d219')}</MenuItem>
              <MenuItem value='equity'>
                {t('finance.consolidation_scope_page.text_08dfd4')}
              </MenuItem>
              <MenuItem value='proportional'>
                {t('finance.consolidation_scope_page.text_ad6e8a')}
              </MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>{t('finance.consolidation_scope_page.status')}</InputLabel>
            <Select
              value={formData.status || 'active'}
              label={t('finance.consolidation_scope_page.status')}
              onChange={(e) =>
                onFormDataChange({
                  ...formData,
                  status: e.target.value as 'active' | 'inactive' | 'draft',
                })
              }
            >
              <MenuItem value='active'>{t('finance.consolidation_scope_page.active')}</MenuItem>
              <MenuItem value='inactive'>{t('finance.consolidation_scope_page.inactive')}</MenuItem>
              <MenuItem value='draft'>{t('finance.consolidation_scope_page.text_22b433')}</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label={t('finance.consolidation_scope_page.description')}
            value={formData.description || ''}
            onChange={(e) => onFormDataChange({ ...formData, description: e.target.value })}
            placeholder={t('finance.consolidation_scope_page.please_input_3')}
            multiline
            rows={3}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          variant='outlined'
          onClick={onClose}
        >
          {t('finance.consolidation_scope_page.cancel')}
        </Button>
        <Button
          variant='contained'
          onClick={onSave}
          disabled={isSubmitting}
        >
          {isSubmitting
            ? ` + ${t('finance.consolidation_scope_page.save')}`
            : t('finance.consolidation_scope_page.save_1')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Add company dialog
interface AddCompanyDialogProps {
  open: boolean;
  formData: CompanyFormData;
  isSubmitting: boolean;
  onFormDataChange: (data: CompanyFormData) => void;
  onAdd: () => void;
  onClose: () => void;
}

export function AddCompanyDialog({
  open,
  formData,
  isSubmitting,
  onFormDataChange,
  onAdd,
  onClose,
}: AddCompanyDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='sm'
      fullWidth
    >
      <DialogTitle>{t('finance.consolidation_scope_page.add_company_to_scope_title')}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControl fullWidth>
            <InputLabel>{t('finance.consolidation_scope_page.text_b868e7')}</InputLabel>
            <Select
              value={formData.company_id}
              label={t('finance.consolidation_scope_page.text_b868e7')}
              onChange={(e) => onFormDataChange({ ...formData, company_id: e.target.value })}
            >
              <MenuItem value=''>
                {t('finance.consolidation_scope_page.please_select_company')}
              </MenuItem>
              <MenuItem value='company-1'>
                {t('finance.consolidation_scope_page.mock_group_parent')}
              </MenuItem>
              <MenuItem value='company-2'>
                {t('finance.consolidation_scope_page.mock_subsidiary_a')}
              </MenuItem>
              <MenuItem value='company-3'>
                {t('finance.consolidation_scope_page.mock_subsidiary_b')}
              </MenuItem>
              <MenuItem value='company-4'>
                {t('finance.consolidation_scope_page.mock_joint_c')}
              </MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>{t('finance.consolidation_scope_page.type')}</InputLabel>
            <Select
              value={formData.control_type}
              label={t('finance.consolidation_scope_page.type')}
              onChange={(e) =>
                onFormDataChange({
                  ...formData,
                  control_type: e.target.value as 'full_control' | 'joint_venture' | 'associate',
                })
              }
            >
              <MenuItem value='full_control'>
                {t('finance.consolidation_scope_page.text_918de9')}
              </MenuItem>
              <MenuItem value='joint_venture'>
                {t('finance.consolidation_scope_page.text_393113')}
              </MenuItem>
              <MenuItem value='associate'>
                {t('finance.consolidation_scope_page.text_34ed98')}
              </MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label={t('finance.consolidation_scope_page.text_6563f0')}
            type='number'
            value={formData.ownership_percentage}
            onChange={(e) =>
              onFormDataChange({
                ...formData,
                ownership_percentage: Number(e.target.value),
              })
            }
            placeholder={t('finance.consolidation_scope_page.please_input_4')}
          />
          <TextField
            fullWidth
            label={t('finance.consolidation_scope_page.text_5c6273')}
            type='number'
            value={formData.consolidation_percentage}
            onChange={(e) =>
              onFormDataChange({
                ...formData,
                consolidation_percentage: Number(e.target.value),
              })
            }
            placeholder={t('finance.consolidation_scope_page.please_input_5')}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          variant='outlined'
          onClick={onClose}
        >
          {t('finance.consolidation_scope_page.cancel')}
        </Button>
        <Button
          variant='contained'
          onClick={onAdd}
          disabled={isSubmitting}
        >
          {isSubmitting
            ? ` + ${t('finance.consolidation_scope_page.text_745316')}`
            : t('finance.consolidation_scope_page.text_b58c75')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Rule configuration dialog
interface RuleConfigDialogProps {
  open: boolean;
  onClose: () => void;
}

export function RuleConfigDialog({ open, onClose }: RuleConfigDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='md'
      fullWidth
    >
      <DialogTitle>{t('finance.consolidation_scope_page.rule_config_title')}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ mb: 2 }}
          >
            {t('finance.consolidation_scope_page.rule_config_description')}
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              fullWidth
              label={t('finance.consolidation_scope_page.name_3')}
              placeholder={t('finance.consolidation_scope_page.please_input_6')}
            />
            <FormControl fullWidth>
              <InputLabel>{t('finance.consolidation_scope_page.type_1')}</InputLabel>
              <Select
                value=''
                label={t('finance.consolidation_scope_page.type_1')}
              >
                <MenuItem value=''>
                  {t('finance.consolidation_scope_page.please_select_type')}
                </MenuItem>
                <MenuItem value='intercompany'>
                  {t('finance.consolidation_scope_page.rule_type_intercompany')}
                </MenuItem>
                <MenuItem value='inventory'>
                  {t('finance.consolidation_scope_page.rule_type_inventory')}
                </MenuItem>
                <MenuItem value='fixed_asset'>
                  {t('finance.consolidation_scope_page.rule_type_fixed_asset')}
                </MenuItem>
                <MenuItem value='equity'>
                  {t('finance.consolidation_scope_page.rule_type_equity')}
                </MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label={t('finance.consolidation_scope_page.text_0251e1')}
              placeholder={t('finance.consolidation_scope_page.please_input_7')}
            />
            <TextField
              fullWidth
              label={t('finance.consolidation_scope_page.text_765fea')}
              placeholder={t('finance.consolidation_scope_page.please_input_8')}
            />
            <FormControl fullWidth>
              <InputLabel>{t('finance.consolidation_scope_page.text_cbc6f6')}</InputLabel>
              <Select
                value=''
                label={t('finance.consolidation_scope_page.text_cbc6f6')}
              >
                <MenuItem value=''>
                  {t('finance.consolidation_scope_page.please_select_calc_method')}
                </MenuItem>
                <MenuItem value='full'>{t('finance.consolidation_scope_page.calc_full')}</MenuItem>
                <MenuItem value='percentage'>
                  {t('finance.consolidation_scope_page.calc_percentage')}
                </MenuItem>
                <MenuItem value='manual'>
                  {t('finance.consolidation_scope_page.calc_manual')}
                </MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label={t('finance.consolidation_scope_page.text_ee8ecb')}
              type='number'
              placeholder={t('finance.consolidation_scope_page.text_3446e5')}
            />
          </Box>
          <TextField
            fullWidth
            label={t('finance.consolidation_scope_page.description_2')}
            placeholder={t('finance.consolidation_scope_page.please_input_9')}
            multiline
            rows={3}
            sx={{ mt: 2 }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          variant='outlined'
          onClick={onClose}
        >
          {t('finance.consolidation_scope_page.cancel')}
        </Button>
        <Button variant='contained'>{t('finance.consolidation_scope_page.save_rule')}</Button>
      </DialogActions>
    </Dialog>
  );
}
