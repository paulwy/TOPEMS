/**
 * @done V79 Phase 2 split
 * ProfileShortcuts - My shortcuts (Tab 4).
 * Top: Addable shortcuts grid (click to toggle selected state)
 * Bottom: Currently added shortcuts Chip list
 */
import React from 'react';
import { Activity, FileText, GitBranch, Bell, Bot, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Chip } from '@mui/material';
import { designTokens } from '@/theme/tokens';
import { IM_PATHS } from '@/modules/im/config';
import type { UseProfileReturn } from '../hooks/useProfile';

const ct = designTokens.colors;

interface ShortcutOption {
  id: string;
  title: string;
  icon: typeof Activity;
  iconName: string;
  path: string;
  color: string;
}

interface ProfileShortcutsProps {
  profile: UseProfileReturn;
}

const ProfileShortcuts: React.FC<ProfileShortcutsProps> = ({ profile }) => {
  const { t } = useTranslation();
  const { shortcuts, handleShortcutToggle } = profile;

  const shortcutOptions: ShortcutOption[] = [
    {
      id: '1',
      title: t('shared.profile.shortcut_dashboard'),
      icon: Activity,
      iconName: 'Activity',
      path: '/dashboard',
      color: 'primary.main',
    },
    {
      id: '2',
      title: t('shared.profile.shortcut_docs'),
      icon: FileText,
      iconName: 'FileText',
      path: '/documents',
      color: 'success.dark',
    },
    {
      id: '3',
      title: t('shared.profile.shortcut_workflow'),
      icon: GitBranch,
      iconName: 'GitBranch',
      path: '/flow/definitions',
      color: ct.purple[500],
    },
    {
      id: '4',
      title: t('shared.profile.shortcut_notifications'),
      icon: Bell,
      iconName: 'Bell',
      path: '/notifications',
      color: 'warning.main',
    },
    {
      id: '5',
      title: t('shared.profile.shortcut_ai'),
      icon: Bot,
      iconName: 'Bot',
      path: '/ai',
      color: ct.pink[500],
    },
    {
      id: '6',
      title: t('shared.profile.shortcut_messages'),
      icon: MessageSquare,
      iconName: 'MessageSquare',
      path: IM_PATHS.root,
      color: 'primary.light',
    },
  ];

  return (
    <Box>
      <Typography
        variant='subtitle1'
        sx={{ fontWeight: 500, mb: 2 }}
      >
        {t('shared.profile.my_shortcuts')}
      </Typography>
      <Typography
        variant='body2'
        color='text.secondary'
        sx={{ mb: 2 }}
      >
        {t('shared.profile.select_shortcuts')}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
          },
          gap: 2,
        }}
      >
        {shortcutOptions.map((item) => {
          const isSelected = shortcuts.some((s) => s.id === item.id);
          const Icon = item.icon;
          return (
            <Box
              key={item.id}
              onClick={() =>
                handleShortcutToggle({
                  id: item.id,
                  title: item.title,
                  icon: item.iconName,
                  path: item.path,
                })
              }
              sx={{
                p: 2,
                borderRadius: 1,
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: 2,
                borderColor: isSelected ? 'primary.main' : 'transparent',
                bgcolor: isSelected ? 'primary.50' : 'grey.100',
                '&:hover': {
                  borderColor: isSelected ? 'primary.main' : 'primary.light',
                },
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 1.5,
                    bgcolor: item.color,
                  }}
                >
                  <Icon
                    size={24}
                    style={{ color: 'common.white' }}
                  />
                </Box>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500 }}
                >
                  {item.title}
                </Typography>
                {isSelected && (
                  <Chip
                    label={t('shared.profile.added')}
                    size='small'
                    sx={{ mt: 1 }}
                  />
                )}
              </Box>
            </Box>
          );
        })}
      </Box>

      {shortcuts.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 500, mb: 2 }}
          >
            {t('shared.profile.current_shortcuts')}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {shortcuts.map((shortcut) => (
              <Chip
                key={shortcut.id}
                label={`${shortcut.title} ×`}
                variant='outlined'
                onClick={() => handleShortcutToggle(shortcut)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ProfileShortcuts;
