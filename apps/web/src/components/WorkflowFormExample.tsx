import { useForm, Controller, type Resolver } from 'react-hook-form';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  TextField,
  Box,
  Switch,
  FormControlLabel,
  Button,
} from '@mui/material';
import i18n from '@/i18n';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNotificationStore } from '@/store';
import { logger } from '@/utils/logger';

// 定义表单验证 schema
const workflowFormSchema = z.object({
  name: z.string().min(2, {
    message: i18n.t('components.workflow_form_example.2_0'),
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
  const addNotification = useNotificationStore((state) => state.addNotification);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WorkflowFormValues>({
    resolver: zodResolver(workflowFormSchema) as Resolver<WorkflowFormValues>,
    defaultValues: {
      name: initialValues?.name || '',
      description: initialValues?.description || '',
      isActive: initialValues?.isActive ?? true,
    },
  });

  function onFormSubmit(values: WorkflowFormValues) {
    logger.info(i18n.t('components.workflow_form_example.k0'), values);
    onSubmit?.(values);

    addNotification({
      title: i18n.t('components.workflow_form_example.k1'),
      message: i18n.t('components.workflow_form_example.k2'),
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
          {i18n.t('components.workflow_form_example.k1')}
        </Typography>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary', mb: 3 }}
        >
          {i18n.t('components.workflow_form_example.k2')}
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
                label={i18n.t('components.workflow_form_example.k3')}
                placeholder={i18n.t('components.workflow_form_example.k4')}
                fullWidth
                size='small'
                error={!!errors.name}
                helperText={errors.name?.message || i18n.t('components.workflow_form_example.k5')}
              />
            )}
          />

          <Controller
            name='description'
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={i18n.t('components.workflow_form_example.k6')}
                placeholder={i18n.t('components.workflow_form_example.k7')}
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
                label={i18n.t('components.workflow_form_example.k8')}
              />
            )}
          />

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              type='submit'
              variant='contained'
            >
              {i18n.t('components.workflow_form_example.k3')}
            </Button>
            <Button
              type='button'
              variant='outlined'
              onClick={() => reset()}
            >
              {i18n.t('components.workflow_form_example.k4')}
            </Button>
          </Box>
        </Box>
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2 }}>
        <Typography
          variant='caption'
          color='text.secondary'
        >
          {i18n.t('components.workflow_form_example.k5')}
        </Typography>
      </CardActions>
    </Card>
  );
}
