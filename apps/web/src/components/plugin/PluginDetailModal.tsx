import React, { useState, useEffect } from 'react';
import { Package, X, ShoppingCart, CheckCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Rating,
  Dialog,
  DialogTitle,
  DialogContent,
  Divider,
  TextField,
  Avatar,
} from '@mui/material';
import type { Plugin, PluginReview, PluginVersion } from '@/api/plugin';
import { getPluginReviews, getPluginVersions, submitPluginReview } from '@/api/plugin';
import { usePluginStore } from '@/store/pluginStore';
import { useNotificationStore } from '@/store';

interface PluginDetailModalProps {
  plugin: Plugin;
  onClose: () => void;
}

export const PluginDetailModal: React.FC<PluginDetailModalProps> = ({ plugin, onClose }) => {
  const [reviews, setReviews] = useState<PluginReview[]>([]);
  const [versions, setVersions] = useState<PluginVersion[]>([]);
  const [rating, setRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewContent, setReviewContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isPluginInstalled, installPlugin, loading } = usePluginStore();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const installed = isPluginInstalled(plugin.code);

  useEffect(() => {
    getPluginReviews(plugin.code).then((res) => {
      if (res.success && res.data) {
        setReviews(res.data.reviews);
      }
    });
    getPluginVersions(plugin.code).then((res) => {
      if (res.success && res.data) {
        setVersions(res.data);
      }
    });
  }, [plugin.code]);

  const handleSubmitReview = async () => {
    if (rating === 0) return;
    setIsSubmitting(true);
    try {
      await submitPluginReview(plugin.code, {
        rating,
        title: reviewTitle || undefined,
        content: reviewContent || undefined,
      });
      addNotification({
        title: '评价成功',
        message: '感谢您的评价',
        type: 'success',
      });
      setRating(0);
      setReviewTitle('');
      setReviewContent('');
      getPluginReviews(plugin.code).then((res) => {
        if (res.success && res.data) {
          setReviews(res.data.reviews);
        }
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInstall = async () => {
    const success = await installPlugin(plugin.code);
    if (success) {
      addNotification({
        title: '安装成功',
        message: `${plugin.name} 插件已安装`,
        type: 'success',
      });
      onClose();
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth='lg'
      fullWidth
      sx={{ borderRadius: 3 }}
    >
      <DialogTitle className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <div className='w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center'>
            <Package className='w-6 h-6 text-white' />
          </div>
          <div>
            <Typography
              variant='h5'
              sx={{ fontWeight: 'bold' }}
            >
              {plugin.name}
            </Typography>
            <Typography
              variant='body2'
              color='textSecondary'
            >
              v{plugin.version}
            </Typography>
          </div>
        </div>
        <Button
          onClick={onClose}
          startIcon={<X className='w-5 h-5' />}
        >
          关闭
        </Button>
      </DialogTitle>

      <DialogContent className='max-h-[70vh] overflow-y-auto'>
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          <div className='lg:col-span-2 space-y-6'>
            <div>
              <Typography
                variant='h6'
                sx={{ fontWeight: 'bold' }}
              >
                描述
              </Typography>
              <Typography
                variant='body1'
                color='textSecondary'
              >
                {plugin.description || '暂无描述'}
              </Typography>
            </div>

            <div>
              <Typography
                variant='h6'
                sx={{ fontWeight: 'bold' }}
              >
                版本历史
              </Typography>
              <div className='space-y-2'>
                {versions.length > 0 ? (
                  versions.map((v) => (
                    <div
                      key={v.id}
                      className='p-3 bg-gray-50 rounded-lg'
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <Typography sx={{ fontWeight: 'medium' }}>{v.version}</Typography>
                          {v.is_latest && (
                            <Chip
                              label='最新'
                              size='small'
                              color='primary'
                              variant='outlined'
                            />
                          )}
                          {v.is_stable && (
                            <Chip
                              label='稳定'
                              size='small'
                              color='success'
                              variant='outlined'
                            />
                          )}
                        </div>
                        <Typography
                          variant='body2'
                          color='textSecondary'
                        >
                          {new Date(v.created_at).toLocaleDateString()}
                        </Typography>
                      </div>
                      {v.release_notes && (
                        <Typography
                          variant='body2'
                          color='textSecondary'
                          className='mt-1'
                        >
                          {v.release_notes}
                        </Typography>
                      )}
                    </div>
                  ))
                ) : (
                  <Typography
                    variant='body2'
                    color='textSecondary'
                  >
                    暂无版本信息
                  </Typography>
                )}
              </div>
            </div>

            <div>
              <Typography
                variant='h6'
                sx={{ fontWeight: 'bold' }}
              >
                用户评价 ({reviews.length})
              </Typography>
              <div className='space-y-4'>
                {reviews.length > 0 ? (
                  reviews.map((review) => (
                    <div
                      key={review.id}
                      className='p-4 bg-gray-50 rounded-lg'
                    >
                      <div className='flex items-center justify-between mb-2'>
                        <div className='flex items-center gap-2'>
                          <Avatar>{review.user_name?.charAt(0) || 'U'}</Avatar>
                          <div>
                            <Typography sx={{ fontWeight: 'medium' }}>
                              {review.user_name || '匿名用户'}
                            </Typography>
                            <Typography
                              variant='body2'
                              color='textSecondary'
                            >
                              {new Date(review.created_at).toLocaleDateString()}
                            </Typography>
                          </div>
                        </div>
                        <Rating
                          value={review.rating || 0}
                          readOnly
                          size='small'
                        />
                      </div>
                      {review.title && (
                        <Typography sx={{ fontWeight: 'medium' }}>{review.title}</Typography>
                      )}
                      {review.content && (
                        <Typography
                          variant='body2'
                          color='textSecondary'
                        >
                          {review.content}
                        </Typography>
                      )}
                      {review.is_verified_purchase && (
                        <Chip
                          label='已购买'
                          size='small'
                          color='primary'
                          variant='outlined'
                          sx={{ mt: 2 }}
                        />
                      )}
                    </div>
                  ))
                ) : (
                  <Typography
                    variant='body2'
                    color='textSecondary'
                  >
                    暂无评价
                  </Typography>
                )}
              </div>
            </div>
          </div>

          <div className='space-y-6'>
            <Card>
              <CardContent className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 'bold' }}
                  >
                    评分
                  </Typography>
                  <div style={{ textAlign: 'center' }}>
                    <Typography
                      variant='h3'
                      sx={{ fontWeight: 'bold' }}
                    >
                      {plugin.rating || 0}
                    </Typography>
                    <Rating
                      value={plugin.rating || 0}
                      readOnly
                    />
                  </div>
                </div>

                <Divider />

                <div className='flex items-center justify-between'>
                  <span style={{ color: 'var(--mui-palette-text-secondary)' }}>下载量</span>
                  <Typography sx={{ fontWeight: 'medium' }}>
                    {plugin.install_count?.toLocaleString() || 0}
                  </Typography>
                </div>

                <div className='flex items-center justify-between'>
                  <span style={{ color: 'var(--mui-palette-text-secondary)' }}>分类</span>
                  <Typography sx={{ fontWeight: 'medium' }}>{plugin.category}</Typography>
                </div>

                <div className='flex items-center justify-between'>
                  <span style={{ color: 'var(--mui-palette-text-secondary)' }}>作者</span>
                  <Typography sx={{ fontWeight: 'medium' }}>
                    {plugin.author_name || '未知'}
                  </Typography>
                </div>

                <Divider />

                <Button
                  variant='contained'
                  fullWidth
                  size='large'
                  disabled={installed || loading}
                  onClick={handleInstall}
                  startIcon={
                    installed ? (
                      <CheckCircle className='w-5 h-5' />
                    ) : (
                      <ShoppingCart className='w-5 h-5' />
                    )
                  }
                >
                  {installed ? '已安装' : plugin.is_free ? '免费安装' : '购买'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 'bold', mb: 4 }}
                >
                  发表评价
                </Typography>
                <div className='space-y-3'>
                  <Rating
                    value={rating}
                    onChange={(_, newValue) => setRating(newValue || 0)}
                  />
                  <TextField
                    label='标题'
                    value={reviewTitle}
                    onChange={(e) => setReviewTitle(e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label='评价内容'
                    value={reviewContent}
                    onChange={(e) => setReviewContent(e.target.value)}
                    fullWidth
                    multiline
                    rows={3}
                  />
                  <Button
                    variant='contained'
                    fullWidth
                    onClick={handleSubmitReview}
                    disabled={rating === 0 || isSubmitting}
                  >
                    {isSubmitting ? '提交中...' : '提交评价'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PluginDetailModal;
