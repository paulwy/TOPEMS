import { useForm, Controller } from 'react-hook-form';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  TextField,
  Box,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { Button } from '@mui/material';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppStore } from '@/store';
import { logger } from '@/utils/logger';

// 定义表单验证 schema
const workflowFormSchema = z.object({
  name: z.string().min(2, {
    message: '工作流名称至少需要 2 个字符',
  }),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

type WorkflowFormValues = {
  name: string;
  description?: string;
  isActive: boolean;
};

interface WorkflowFormExampleProps {
  onSubmit?: (_values: WorkflowFormValues) => void;
  initialValues?: Partial<WorkflowFormValues>;
}

export function WorkflowFormExample({ onSubmit, initialValues }: WorkflowFormExampleProps) {
  const addNotification = useAppStore((state) => state.addNotification);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WorkflowFormValues>({
    resolver: zodResolver(workflowFormSchema) as any,
    defaultValues: {
      name: initialValues?.name || '',
      description: initialValues?.description || '',
      isActive: initialValues?.isActive ?? true,
    },
  });

  function onFormSubmit(values: WorkflowFormValues) {
    logger.info('表单提交:', values);
    onSubmit?.(values);

    addNotification({
      title: '成功',
      message: '工作流已保存',
      type: 'success',
    });
  }

  return (
    <Card sx={{ maxWidth: 600, mx: 'auto' }}>
      <CardContent>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600 }}
        >
          工作流表单示例
        </Typography>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary', mb: 3 }}
        >
          使用 React Hook Form + Zod + MUI 的示例
        </Typography>

        <Box
          component='form'
          onSubmit={handleSubmit(onFormSubmit)}
          sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
        >
          <Controller
            name='name'
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label='工作流名称'
                placeholder='请输入工作流名称'
                fullWidth
                size='small'
                error={!!errors.name}
                helperText={errors.name?.message || '这是工作流的显示名称'}
              />
            )}
          />

          <Controller
            name='description'
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label='描述'
                placeholder='请输入工作流描述'
                fullWidth
                size='small'
                multiline
                rows={3}
                error={!!errors.description}
                helperText={errors.description?.message}
                sx={{ '& .MuiInputBase-input': { resize: 'none' } }}
              />
            )}
          />

          <Controller
            name='isActive'
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch
                    {...field}
                    checked={field.value}
                  />
                }
                label='启用状态'
              />
            )}
          />

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              type='submit'
              variant='contained'
            >
              保存
            </Button>
            <Button
              type='button'
              variant='outlined'
              onClick={() => reset()}
            >
              重置
            </Button>
          </Box>
        </Box>
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2 }}>
        <Typography
          variant='caption'
          color='text.secondary'
        >
          使用了 zodResolver 进行表单验证
        </Typography>
      </CardActions>
    </Card>
  );
}
