import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { ImageUpload } from '@/components/common';
import { AIHelperButton } from '@/components/ai';
import type { EmployeeFormDialogProps } from '../types';

const EmployeeFormDialog: React.FC<EmployeeFormDialogProps> = ({
  open,
  onClose,
  mode,
  employee,
  formData,
  onChange,
  onSubmit,
  companies,
  departments,
  onOpenAICodeGenerator,
  onOpenAIDataCompleter,
  onOpenAIFormValidator,
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    maxWidth='sm'
    fullWidth
  >
    <DialogTitle>{mode === 'create' ? '新增员工' : '编辑员工'}</DialogTitle>
    <DialogContent>
      <Box
        component='form'
        onSubmit={onSubmit}
        sx={{ display: 'grid', gap: 2, pt: 1 }}
      >
        <FormControl
          size='small'
          fullWidth
        >
          <InputLabel>所属公司 *</InputLabel>
          <Select
            value={(formData as { company_id?: string })?.company_id || ''}
            label='所属公司 *'
            onChange={(e) => onChange('company_id', e.target.value)}
            required
          >
            {companies.map((c) => (
              <MenuItem
                key={c.id}
                value={c.id}
              >
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
            sx={{ mb: 1, display: 'block' }}
          >
            员工头像
          </Typography>
          <ImageUpload
            value={(formData as unknown as Record<string, unknown>)?.avatar_url ? [(formData as unknown as Record<string, unknown>).avatar_url as string] : []}
            onChange={(files) => onChange('avatar_url', files[0] || '')}
            maxCount={1}
            accept='image/*'
            cropEnabled
            cropAspect={1}
            height={120}
          />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 2, gap: 2 }}>
          <TextField
            label='员工姓名 *'
            size='small'
            value={(formData as { name?: string })?.name || ''}
            onChange={(e) => onChange('name', e.target.value)}
            required
          />
          <Box sx={{ position: 'relative' }}>
            <TextField
              label='工号'
              size='small'
              value={(formData as { employee_no?: string })?.employee_no || ''}
              onChange={(e) => onChange('employee_no', e.target.value)}
              fullWidth
            />
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 2, gap: 2 }}>
          <TextField
            label='邮箱'
            type='email'
            size='small'
            value={(formData as { email?: string })?.email || ''}
            onChange={(e) => onChange('email', e.target.value)}
          />
          <TextField
            label='电话'
            size='small'
            value={(formData as { phone?: string })?.phone || ''}
            onChange={(e) => onChange('phone', e.target.value)}
          />
        </Box>

        <FormControl
          size='small'
          fullWidth
        >
          <InputLabel>所属部门</InputLabel>
          <Select
            value={(formData as { department_id?: string })?.department_id || ''}
            label='所属部门'
            onChange={(e) => onChange('department_id', e.target.value)}
          >
            <MenuItem value=''>无</MenuItem>
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
          label='职位'
          size='small'
          value={(formData as { position?: string })?.position || ''}
          onChange={(e) => onChange('position', e.target.value)}
        />

        <TextField
          label='入职日期'
          type='date'
          size='small'
          value={(formData as { hire_date?: string })?.hire_date || ''}
          onChange={(e) => onChange('hire_date', e.target.value)}
          slotProps={{ inputLabel: { shrink: true } } as const}
        />

        <FormControl
          size='small'
          fullWidth
        >
          <InputLabel>状态</InputLabel>
          <Select
            value={(formData as { status?: string })?.status || 'active'}
            label='状态'
            onChange={(e) => onChange('status', e.target.value)}
          >
            <MenuItem value='active'>在职</MenuItem>
            <MenuItem value='inactive'>离职</MenuItem>
          </Select>
        </FormControl>

        <DialogActions sx={{ p: 0, pt: 2, justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <AIHelperButton
              type='generate'
              onClick={() => onOpenAICodeGenerator(mode)}
              size='small'
              label='生成工号'
            />
            <AIHelperButton
              type='complete'
              onClick={onOpenAIDataCompleter}
              size='small'
              label='智能补全'
            />
            <AIHelperButton
              type='validate'
              onClick={onOpenAIFormValidator}
              size='small'
              label='AI校验'
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              onClick={onClose}
              variant='outlined'
            >
              取消
            </Button>
            <Button
              type='submit'
              variant='contained'
            >
              {mode === 'create' ? '创建' : '保存'}
            </Button>
          </Box>
        </DialogActions>
      </Box>
    </DialogContent>
  </Dialog>
);

export default EmployeeFormDialog;
