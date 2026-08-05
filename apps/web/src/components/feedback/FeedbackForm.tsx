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
import { Send, Star } from 'lucide-react';
import FileUpload from '@/components/common/FileUpload';

import type { FeedbackType, CreateFeedbackRequest } from '@/api/feedback/types';
import { FEEDBACK_TYPE_LABELS } from '@/api/feedback/types';

const schema = z.object({
  type: z.enum(['bug', 'feature', 'improvement', 'question', 'other']),
  title: z.string().min(1, '请输入标题').max(100, '标题不能超过100个字符'),
  description: z.string().min(1, '请输入描述').max(2000, '描述不能超过2000个字符'),
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
        <InputLabel>反馈类型</InputLabel>
        <Controller
          name='type'
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              label='反馈类型'
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
        label='标题'
        required
        fullWidth
        sx={{ mb: 3 }}
        error={!!errors.title}
        helperText={errors.title?.message}
        {...control.register('title')}
      />

      <TextField
        label='详细描述'
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
        <FormLabel>截图上传</FormLabel>
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
        <FormLabel>满意度评分</FormLabel>
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
              <Typography variant='body1'>{field.value} 分</Typography>
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
          {loading ? '提交中...' : '提交反馈'}
        </Button>
      </Box>
    </Box>
  );
};

export default FeedbackForm;
