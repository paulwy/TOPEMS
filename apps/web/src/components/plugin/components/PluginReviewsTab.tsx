import React from 'react';
import { useTranslation } from 'react-i18next';
import { Star, ThumbsUp, Send, Loader2 } from 'lucide-react';
import {
  Box,
  Typography,
  Chip,
  Card,
  CardContent,
  Rating,
  TextField,
  Button,
  Avatar,
} from '@mui/material';
import type { PluginReview } from '@/api/plugin';

interface PluginReviewsTabProps {
  reviews: PluginReview[];
  averageRating: number;
  pluginRating: number;
  rating: number;
  onRatingChange: (value: number) => void;
  reviewTitle: string;
  onReviewTitleChange: (value: string) => void;
  reviewContent: string;
  onReviewContentChange: (value: string) => void;
  onSubmitReview: () => void;
  isSubmitting: boolean;
}

const PluginReviewsTab: React.FC<PluginReviewsTabProps> = ({
  reviews,
  rating,
  onRatingChange,
  reviewTitle,
  onReviewTitleChange,
  reviewContent,
  onReviewContentChange,
  onSubmitReview,
  isSubmitting,
}) => {
  const { t } = useTranslation();

  return (
    <Box>
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography
            variant='h6'
            sx={{ fontWeight: 'bold', mb: 2 }}
          >
            {t('plugin.detail_page.section.post_review')}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant='body2'>{t('plugin.common.rating_label')}</Typography>
              <Rating
                value={rating}
                onChange={(_, newValue) => onRatingChange(newValue || 0)}
                size='large'
              />
            </Box>
            <TextField
              label={t('plugin.field.review_title')}
              value={reviewTitle}
              onChange={(e) => onReviewTitleChange(e.target.value)}
              fullWidth
            />
            <TextField
              label={t('plugin.field.review_content')}
              value={reviewContent}
              onChange={(e) => onReviewContentChange(e.target.value)}
              fullWidth
              multiline
              rows={4}
            />
            <Button
              variant='contained'
              onClick={onSubmitReview}
              disabled={rating === 0 || isSubmitting}
              startIcon={
                isSubmitting ? (
                  <Loader2 sx={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Send sx={{ width: 18, height: 18 }} />
                )
              }
              sx={{ alignSelf: 'flex-end' }}
            >
              {isSubmitting
                ? ` + ${t('plugin.common.submitting')} + `
                : t('plugin.common.submit_review')}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Typography
        variant='h6'
        sx={{ fontWeight: 'bold', mb: 3 }}
      >
        {t('plugin.detail_page.section.all_reviews', { count: reviews.length })}
      </Typography>
      {reviews.length > 0 ? (
        reviews.map((review) => (
          <Card
            key={review.id}
            sx={{ mb: 2 }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                <Avatar>{review.user_name?.charAt(0) || 'U'}</Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
                    <Typography sx={{ fontWeight: 'medium' }}>
                      {review.user_name || ` + ${t('plugin.common.anonymous_user')}`}
                    </Typography>
                    {review.is_verified_purchase && (
                      <Chip
                        label={t('plugin.common.purchased')}
                        size='small'
                        color='primary'
                        variant='outlined'
                      />
                    )}
                    {review.is_featured && (
                      <Chip
                        label={t('plugin.common.featured')}
                        size='small'
                        color='warning'
                        variant='outlined'
                      />
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Rating
                      value={review.rating || 0}
                      readOnly
                      size='small'
                    />
                    <Typography
                      variant='caption'
                      color='textSecondary'
                    >
                      {new Date(review.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>
                {review.helpful_count !== undefined && review.helpful_count > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <ThumbsUp sx={{ width: 14, height: 14, color: 'grey.500' }} />
                    <Typography
                      variant='caption'
                      color='textSecondary'
                    >
                      {review.helpful_count}
                    </Typography>
                  </Box>
                )}
              </Box>
              {review.title && (
                <Typography sx={{ fontWeight: 'medium', mb: 1 }}>{review.title}</Typography>
              )}
              {review.content && (
                <Typography
                  variant='body2'
                  color='textSecondary'
                >
                  {review.content}
                </Typography>
              )}
            </CardContent>
          </Card>
        ))
      ) : (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Star sx={{ width: 48, height: 48, color: 'grey.300', mx: 'auto', mb: 2 }} />
          <Typography>{t('plugin.common.no_reviews')}</Typography>
          <Typography
            variant='body2'
            color='textSecondary'
          >
            {t('plugin.detail_page.review.first_reviewer')}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default PluginReviewsTab;
