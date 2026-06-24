import React from 'react';
import { type Employee, type Department } from '@/api/hrm';
import { AIHelperButton, AICodeGenerator, AIDataCompleter, AIFormValidator } from '../ai';
import type { CompletionItem } from '@/types/ai';

import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  InputAdornment,
} from '@mui/material';
import { Button } from '@/components/ui/Button';
import { Send } from 'lucide-react';

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
    const updates: Record<string, any> = {};
    Object.entries(completions).forEach(([field, item]) => {
      updates[field] = item.value;
    });
    setFormData((prev) => ({ ...prev, ...updates }));
    setShowAIDataCompleter(false);
  };

  const handleApplyValidationSuggestions = (suggestions: any[]) => {
    const updates: Record<string, any> = {};
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
            label='员工姓名 *'
            type='text'
            required
            value={(formData as Employee)?.name || ''}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder='请输入员工姓名'
            size='small'
            fullWidth
          />
          <TextField
            id={`${mode}-number`}
            label='工号'
            type='text'
            value={(formData as Employee)?.employee_no || ''}
            onChange={(e) => handleInputChange('employee_no', e.target.value)}
            placeholder='请输入工号'
            size='small'
            fullWidth
          />
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <TextField
            id={`${mode}-email`}
            label='邮箱'
            type='email'
            value={(formData as Employee)?.email || ''}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder='请输入邮箱'
            size='small'
            fullWidth
          />
          <TextField
            id={`${mode}-phone`}
            label='电话'
            type='text'
            value={(formData as Employee)?.phone || ''}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            placeholder='请输入电话'
            size='small'
            fullWidth
          />
        </Box>
        <FormControl
          size='small'
          fullWidth
        >
          <InputLabel id={`${mode}-department-label`}>所属部门</InputLabel>
          <Select
            labelId={`${mode}-department-label`}
            id={`${mode}-department`}
            value={(formData as Employee)?.department_id || 'none'}
            label='所属部门'
            onChange={(e) =>
              handleInputChange('department_id', e.target.value === 'none' ? '' : e.target.value)
            }
          >
            <MenuItem value='none'>无</MenuItem>
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
          label='职位'
          type='text'
          value={(formData as Employee)?.position || ''}
          onChange={(e) => handleInputChange('position', e.target.value)}
          placeholder='请输入职位'
          size='small'
          fullWidth
        />
        {mode === 'create' && (
          <TextField
            id={`${mode}-hire-date`}
            label='入职日期'
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
          <InputLabel id={`${mode}-status-label`}>状态</InputLabel>
          <Select
            labelId={`${mode}-status-label`}
            id={`${mode}-status`}
            value={(formData as Employee)?.status || 'active'}
            label='状态'
            onChange={(e) => handleInputChange('status', e.target.value)}
          >
            <MenuItem value='active'>在职</MenuItem>
            <MenuItem value='inactive'>离职</MenuItem>
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
            取消
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <AIHelperButton
              type='generate'
              onClick={() => setShowAICodeGenerator(true)}
              variant='outlined'
              label='生成工号'
            />
            <AIHelperButton
              type='complete'
              onClick={() => setShowAIDataCompleter(true)}
              variant='outlined'
              label='智能补全'
            />
            <AIHelperButton
              type='validate'
              onClick={() => setShowAIFormValidator(true)}
              variant='outlined'
              label='AI 校验'
            />
            <Button
              type='submit'
              variant='contained'
            >
              {mode === 'create' ? '创建' : '保存'}
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
