import React from 'react';
import { type Employee, type Department } from '@/api/hrm';
import { AIHelperButton, AICodeGenerator, AIDataCompleter, AIFormValidator } from '../ai';
import type { CompletionItem } from '@/types/ai';

import { TextField, FormControl, InputLabel, Select, MenuItem, Box, Button } from '@mui/material';
import i18n from '@/i18n';

interface EmployeeFormProps {
  formData: Partial<Employee>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Employee>>>;
  departments: Department[];
  mode: 'create' | 'edit';
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export const EmployeeForm: React.FC<EmployeeFormProps> = ({
  formData,
  setFormData,
  departments,
  mode,
  onSubmit,
  onCancel,
}) => {
  const [showAICodeGenerator, setShowAICodeGenerator] = React.useState(false);
  const [showAIDataCompleter, setShowAIDataCompleter] = React.useState(false);
  const [showAIFormValidator, setShowAIFormValidator] = React.useState(false);
  const [existingCodes] = React.useState<string[]>([]);

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSelectAICode = (code: string) => {
    setFormData((prev) => ({ ...prev, employee_number: code }));
  };

  const handleApplyCompletion = (completions: Record<string, CompletionItem>) => {
    const updates: Record<string, unknown> = {};
    Object.entries(completions).forEach(([field, item]) => {
      updates[field] = item.value;
    });
    setFormData((prev) => ({ ...prev, ...updates }));
    setShowAIDataCompleter(false);
  };

  const handleApplyValidationSuggestions = (suggestions: { field: string; value?: unknown }[]) => {
    const updates: Record<string, unknown> = {};
    suggestions.forEach((s) => {
      updates[s.field] = s.value;
    });
    setFormData((prev) => ({ ...prev, ...updates }));
    setShowAIFormValidator(false);
  };

  return (
    <>
      <Box
        component='form'
        onSubmit={onSubmit}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <TextField
            id={`${mode}-name`}
            label={i18n.t('components.employee_form.k0')}
            type='text'
            required
            value={(formData as Employee)?.name || ''}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder={i18n.t('components.employee_form.k0')}
            size='small'
            fullWidth
          />
          <TextField
            id={`${mode}-number`}
            label={i18n.t('components.employee_form.k1')}
            type='text'
            value={(formData as Employee)?.employee_no || ''}
            onChange={(e) => handleInputChange('employee_no', e.target.value)}
            placeholder={i18n.t('components.employee_form.k2')}
            size='small'
            fullWidth
          />
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <TextField
            id={`${mode}-email`}
            label={i18n.t('components.employee_form.k3')}
            type='email'
            value={(formData as Employee)?.email || ''}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder={i18n.t('components.employee_form.k4')}
            size='small'
            fullWidth
          />
          <TextField
            id={`${mode}-phone`}
            label={i18n.t('components.employee_form.k5')}
            type='text'
            value={(formData as Employee)?.phone || ''}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            placeholder={i18n.t('components.employee_form.k6')}
            size='small'
            fullWidth
          />
        </Box>
        <FormControl
          size='small'
          fullWidth
        >
          <InputLabel id={`${mode}-department-label`}>
            {i18n.t('components.employee_form.k7')}
          </InputLabel>
          <Select
            labelId={`${mode}-department-label`}
            id={`${mode}-department`}
            value={(formData as Employee)?.department_id || 'none'}
            label={i18n.t('components.employee_form.k8')}
            onChange={(e) =>
              handleInputChange('department_id', e.target.value === 'none' ? '' : e.target.value)
            }
          >
            <MenuItem value='none'>{i18n.t('components.employee_form.k1')}</MenuItem>
            {departments.map((d) => (
              <MenuItem
                key={d.id}
                value={d.id}
              >
                {d.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          id={`${mode}-position`}
          label={i18n.t('components.employee_form.k9')}
          type='text'
          value={(formData as Employee)?.position || ''}
          onChange={(e) => handleInputChange('position', e.target.value)}
          placeholder={i18n.t('components.employee_form.k10')}
          size='small'
          fullWidth
        />
        {mode === 'create' && (
          <TextField
            id={`${mode}-hire-date`}
            label={i18n.t('components.employee_form.k11')}
            type='date'
            value={(formData as Employee)?.hire_date || ''}
            onChange={(e) => handleInputChange('hire_date', e.target.value)}
            size='small'
            fullWidth
            slotProps={{
              inputLabel: {
                shrink: true,
              },
            }}
          />
        )}
        <FormControl
          size='small'
          fullWidth
        >
          <InputLabel id={`${mode}-status-label`}>
            {i18n.t('components.employee_form.k12')}
          </InputLabel>
          <Select
            labelId={`${mode}-status-label`}
            id={`${mode}-status`}
            value={(formData as Employee)?.status || 'active'}
            label={i18n.t('components.employee_form.k13')}
            onChange={(e) => handleInputChange('status', e.target.value)}
          >
            <MenuItem value='active'>{i18n.t('components.employee_form.k14')}</MenuItem>
            <MenuItem value='inactive'>{i18n.t('components.employee_form.k15')}</MenuItem>
          </Select>
        </FormControl>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Button
            type='button'
            variant='outlined'
            onClick={onCancel}
          >
            {i18n.t('components.employee_form.k2')}
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <AIHelperButton
              type='generate'
              onClick={() => setShowAICodeGenerator(true)}
              variant='outlined'
              label={i18n.t('components.employee_form.k16')}
            />
            <AIHelperButton
              type='complete'
              onClick={() => setShowAIDataCompleter(true)}
              variant='outlined'
              label={i18n.t('components.employee_form.k17')}
            />
            <AIHelperButton
              type='validate'
              onClick={() => setShowAIFormValidator(true)}
              variant='outlined'
              label={i18n.t('components.employee_form.ai_3')}
            />
            <Button
              type='submit'
              variant='contained'
            >
              {mode === 'create'
                ? i18n.t('components.employee_form.k19')
                : i18n.t('components.employee_form.k18')}
            </Button>
          </Box>
        </Box>
      </Box>

      <AICodeGenerator
        isOpen={showAICodeGenerator}
        onClose={() => setShowAICodeGenerator(false)}
        context={{
          entityType: 'employee',
          name: (formData as Employee)?.name,
        }}
        onSelect={handleSelectAICode}
        existingCodes={existingCodes}
      />

      <AIDataCompleter
        isOpen={showAIDataCompleter}
        onClose={() => setShowAIDataCompleter(false)}
        completeRequest={{
          partialData: formData,
          context: {
            module: 'hrm',
            entityType: 'employee',
          },
        }}
        onApplyCompletion={handleApplyCompletion}
      />

      <AIFormValidator
        isOpen={showAIFormValidator}
        onClose={() => setShowAIFormValidator(false)}
        validateRequest={{
          data: formData,
          context: {
            module: 'hrm',
            entityType: 'employee',
          },
        }}
        onApplySuggestions={handleApplyValidationSuggestions}
        onFixIssue={() => {}}
      />
    </>
  );
};
