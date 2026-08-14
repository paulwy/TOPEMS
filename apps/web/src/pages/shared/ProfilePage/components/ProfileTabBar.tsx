import React, { useRef } from 'react';
import { Card, CardContent, Tabs, Tab, Avatar, IconButton, Box, Typography } from '@mui/material';
import { User, Shield, Activity, Bell, Star, Camera, RefreshCw } from 'lucide-react';
import type { User as UserType } from '@/api/iam';
import i18n from '@/i18n';

interface UserCardProps {
  user: UserType;
  avatarUrl: string | null;
  onAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const UserCard: React.FC<UserCardProps> = ({ user, avatarUrl, onAvatarUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
              aria-label={i18n.t('pages.profile_tab_bar.k0')}
            >
              <Camera size={16} />
            </IconButton>
            <input
              ref={fileInputRef}
              type='file'
              accept='image/*'
              onChange={onAvatarUpload}
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
                [i18n.t('pages.profile_tab_bar.k0')]: {user.username}
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
                [i18n.t('pages.profile_tab_bar.k1')]: {user.role || i18n.t('pages.profile_tab_bar.k1')}
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
                [i18n.t('pages.profile_tab_bar.k2')]: {new Date(user.created_at).toLocaleDateString('zh-CN')}
              </Typography>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

interface TabBarProps {
  activeTab: number;
  onTabChange: (tab: number) => void;
}

const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange }) => {
  return (
    <Tabs
      value={activeTab}
      onChange={(_, v) => onTabChange(v)}
    >
      <Tab
        icon={<User size={16} />}
        iconPosition='start'
        label={i18n.t('pages.profile_tab_bar.k2')}
      />
      <Tab
        icon={<Shield size={16} />}
        iconPosition='start'
        label={i18n.t('pages.profile_tab_bar.k3')}
      />
      <Tab
        icon={<Activity size={16} />}
        iconPosition='start'
        label={i18n.t('pages.profile_tab_bar.k4')}
      />
      <Tab
        icon={<Bell size={16} />}
        iconPosition='start'
        label={i18n.t('pages.profile_tab_bar.k5')}
      />
      <Tab
        icon={<Star size={16} />}
        iconPosition='start'
        label={i18n.t('pages.profile_tab_bar.k6')}
      />
    </Tabs>
  );
};

interface ProfileTabBarProps {
  user: UserType;
  activeTab: number;
  avatarUrl: string | null;
  onTabChange: (tab: number) => void;
  onAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ProfileTabBar: React.FC<ProfileTabBarProps> = ({
  user,
  activeTab,
  avatarUrl,
  onTabChange,
  onAvatarUpload,
}) => {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: '1fr 2fr' },
        gap: 3,
      }}
    >
      <Box>
        <UserCard
          user={user}
          avatarUrl={avatarUrl}
          onAvatarUpload={onAvatarUpload}
        />
      </Box>
      <Box>
        <Card>
          <CardContent sx={{ pb: 0 }}>
            <TabBar
              activeTab={activeTab}
              onTabChange={onTabChange}
            />
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default ProfileTabBar;
export { ProfileTabBar, UserCard, TabBar };
