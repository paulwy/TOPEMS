import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Rating,
} from '@mui/material';
import i18n from '@/i18n';
import { Send, Star } from 'lucide-react';
import FileUpload from '@/components/common/FileUpload';

import type { FeedbackType, CreateFeedbackRequest } from '@/api/feedback/types';
import { FEEDBACK_TYPE_LABELS } from '@/api/feedback/types';

const schema = z.object({
  type: z.enum(['bug', 'feature', 'improvement', 'question', 'other']),
  title: z.string().min(1, i18n.t('components.feedback_form.k1')).max(100, i18n.t('components.feedback_form.100_0')),
  description: z.string().min(1, i18n.t('components.feedback_form.k3')).max(2000, i18n.t('components.feedback_form.2000_2')),
  screenshots: z.array(z.string()).optional(),
  satisfaction: z.number().min(1).max(5),
});

type FormData = z.infer<typeof schema>;

export interface FeedbackFormProps {
  onSubmit: (data: CreateFeedbackRequest) => void;
  loading?: boolean;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({ onSubmit, loading }) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'improvement',
      title: '',
      description: '',
      screenshots: [],
      satisfaction: 3,
    },
  });

  const [images, setImages] = useState<string[]>([]);

  const handleImageChange = (files: string[]) => {
    setImages(files);
  };

  const handleFormSubmit = (data: FormData) => {
    onSubmit({
      type: data.type as FeedbackType,
      title: data.title,
      description: data.description,
      screenshots: images.length > 0 ? images : undefined,
      satisfaction: data.satisfaction,
    });
  };

  return (
    <Box
      component='form'
      onSubmit={handleSubmit(handleFormSubmit)}
    >
      <FormControl
        fullWidth
        required
        sx={{ mb: 3 }}
      >
        <InputLabel>{i18n.t('components.feedback_form.k4')}</InputLabel>
        <Controller
          name='type'
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              label={i18n.t('components.feedback_form.k5')}
            >
              {(Object.keys(FEEDBACK_TYPE_LABELS) as FeedbackType[]).map((type) => (
                <MenuItem
                  key={type}
                  value={type}
                >
                  {FEEDBACK_TYPE_LABELS[type]}
                </MenuItem>
              ))}
            </Select>
          )}
        />
        {errors.type && (
          <Typography
            variant='caption'
            color='error'
          >
            {errors.type.message}
          </Typography>
        )}
      </FormControl>

      <TextField
        label={i18n.t('components.feedback_form.k6')}
        required
        fullWidth
        sx={{ mb: 3 }}
        error={!!errors.title}
        helperText={errors.title?.message}
        {...control.register('title')}
      />

      <TextField
        label={i18n.t('components.feedback_form.k7')}
        required
        fullWidth
        multiline
        rows={4}
        sx={{ mb: 3 }}
        error={!!errors.description}
        helperText={errors.description?.message}
        {...control.register('description')}
      />

      <FormControl
        fullWidth
        sx={{ mb: 3 }}
      >
        <FormLabel>{i18n.t('components.feedback_form.k8')}</FormLabel>
        <FileUpload
          value={images}
          onChange={handleImageChange}
          maxCount={5}
          accept={['image/jpeg', 'image/png', 'image/gif']}
          maxSize={5}
        />
      </FormControl>

      <FormControl
        fullWidth
        sx={{ mb: 4 }}
      >
        <FormLabel>{i18n.t('components.feedback_form.k9')}</FormLabel>
        <Controller
          name='satisfaction'
          control={control}
          render={({ field }) => (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
              <Rating
                {...field}
                value={field.value}
                onChange={(_, value) => field.onChange(value)}
                icon={<Star size={24} />}
                emptyIcon={<Star size={24} />}
                max={5}
                precision={1}
              />
              <Typography variant='body1'>{i18n.t('components.feedback_form.fieldvalue_0')}</Typography>
            </Box>
          )}
        />
      </FormControl>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          type='submit'
          disabled={loading}
          variant='contained'
          endIcon={<Send />}
        >
          {loading ? i18n.t('components.feedback_form.k0') : i18n.t('components.feedback_form.k10')}
        </Button>
      </Box>
    </Box>
  );
};

export default FeedbackForm;
