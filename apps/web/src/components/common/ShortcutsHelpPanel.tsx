import { designTokens } from '@topems/tokens';
import React from 'react';
import { Keyboard } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Box,
  Typography,
  Chip,
} from '@mui/material';

import { GLOBAL_SHORTCUTS, getShortcutsByCategory, getShortcutKeyLabel } from '@/hooks/shortcuts';
import i18n from '@/i18n';

interface ShortcutsHelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const ShortcutsHelpPanel = ({ isOpen, onClose }: ShortcutsHelpPanelProps) => {
  const groupedShortcuts = getShortcutsByCategory(GLOBAL_SHORTCUTS);

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth='md'
    >
      <DialogContent sx={{ padding: 4 }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1,
              bgcolor: 'primary.light',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Keyboard
              size={20}
              color='primary.main'
            />
          </Box>
          {i18n.t('components.shortcuts_help_panel.k0')}
        </DialogTitle>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 3 }}
        >
          {i18n.t('components.shortcuts_help_panel.k0')}{' '}
          <Chip
            size='small'
            label={getShortcutKeyLabel(GLOBAL_SHORTCUTS.OPEN_HELP)}
          />{' '}
          {i18n.t('components.shortcuts_help_panel.k1')}
        </Typography>

        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
              <Box
                sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}
                key={category}
              >
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600, mb: 2, color: 'text.secondary' }}
                >
                  {category}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {shortcuts.map((shortcut, index) => (
                    <Box
                      key={`${category}-${index}`}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 1.5,
                        borderRadius: 0.5,
                        bgcolor: 'background.default',
                      }}
                    >
                      <Typography variant='body2'>{shortcut.description}</Typography>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {getShortcutKeyLabel(shortcut)
                          .split(' + ')
                          .map((part, i) => (
                            <React.Fragment key={i}>
                              {i > 0 && (
                                <span style={{ margin: `0 ${designTokens.spacing.xs}px` }}>+</span>
                              )}
                              <Chip
                                size='small'
                                label={part}
                                sx={{
                                  fontWeight: 600,
                                  fontFamily: 'monospace',
                                  bgcolor: 'action.active',
                                  color: 'common.white',
                                  height: 22,
                                }}
                              />
                            </React.Fragment>
                          ))}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        <DialogActions sx={{ mt: 4, justifyContent: 'center' }}>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {i18n.t('components.shortcuts_help_panel.k2')}
          </Typography>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
};

export default ShortcutsHelpPanel;
