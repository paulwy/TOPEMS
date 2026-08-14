/**
 * @done V79 Phase 2 split
 * ProfileHeader - User profile card header (left sticky card).
 * Includes: Avatar (with upload button), name, email, username/role/created time
 */
import React from 'react';
import { User, Shield, RefreshCw, Camera } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Box, Card, CardContent, Typography, Avatar, IconButton } from '@mui/material';
import type { UseProfileReturn } from '../hooks/useProfile';
import i18n from '@/i18n';

export interface ProfileHeaderProps {
  profile: UseProfileReturn;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ profile }) => {
  const { t } = useTranslation();
  const { user, avatarUrl, fileInputRef, handleAvatarUpload } = profile;

  if (!user) return null;

  return (
    <Card sx={{ position: 'sticky', top: 64 }}>
      <CardContent sx={{ p: 3 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <Box sx={{ position: 'relative' }}>
            <Avatar
              src={avatarUrl || undefined}
              sx={{
                width: 96,
                height: 96,
                mb: 2,
                bgcolor: 'primary.main',
                fontSize: 36,
              }}
            >
              {user.full_name?.charAt(0).toUpperCase() || user.username.charAt(0).toUpperCase()}
            </Avatar>
            <IconButton
              onClick={() => fileInputRef.current?.click()}
              sx={{
                position: 'absolute',
                bottom: 8,
                right: 0,
                bgcolor: 'primary.main',
                color: 'common.white',
                '&:hover': { bgcolor: 'primary.dark' },
                width: 32,
                height: 32,
              }}
              size='small'
              aria-label={i18n.t('pages.profile_header.k0')}
            >
              <Camera size={16} />
            </IconButton>
            <input
              ref={fileInputRef}
              type='file'
              accept='image/*'
              onChange={handleAvatarUpload}
              style={{ display: 'none' }}
            />
          </Box>
          <Typography
            variant='h6'
            sx={{ fontWeight: 600 }}
          >
            {user.full_name || user.username}
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ mt: 0.5 }}
          >
            {user.email}
          </Typography>
          <Box sx={{ mt: 2, width: '100%' }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                mb: 1,
              }}
            >
              <User size={16} />
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {t('shared.profile.username_prefix')} {user.username}
              </Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                mb: 1,
              }}
            >
              <Shield size={16} />
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {t('shared.profile.role_prefix')} {user.role || t('shared.profile.role_user')}
              </Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
              }}
            >
              <RefreshCw size={16} />
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {t('shared.profile.created_at_prefix')}{' '}
                {new Date(user.created_at).toLocaleDateString('zh-CN')}
              </Typography>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ProfileHeader;
