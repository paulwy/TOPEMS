import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Divider,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { Edit3, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const AiModelProviderConfig: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Box>
      <Paper
        variant='outlined'
        sx={{ p: 3, borderRadius: 3, mb: 3 }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}
        >
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600 }}
          >
            {t('ai.model_settings.api.key_management')}
          </Typography>
          <Button
            variant='contained'
            startIcon={<Edit3 size={16} />}
            size='small'
          >
            {t('ai.model_settings.action.add_key')}
          </Button>
        </Box>
        <Divider sx={{ mb: 2 }} />

        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>{t('ai.model_settings.field.name')}</TableCell>
                <TableCell>{t('ai.model_settings.field.key')}</TableCell>
                <TableCell>{t('ai.model_settings.field.provider')}</TableCell>
                <TableCell>{t('ai.model_settings.field.status')}</TableCell>
                <TableCell>{t('ai.model_settings.field.created_at')}</TableCell>
                <TableCell align='right'>{t('ai.model_settings.field.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell sx={{ fontWeight: 500 }}>
                  {t('ai.model_settings.api.key_production')}
                </TableCell>
                <TableCell>
                  <code>sk-****************************</code>
                </TableCell>
                <TableCell>OpenAI</TableCell>
                <TableCell>
                  <Chip
                    label={t('ai.model_settings.api.status_enabled')}
                    size='small'
                    color='success'
                    sx={{ height: 22 }}
                  />
                </TableCell>
                <TableCell>2024-01-15</TableCell>
                <TableCell align='right'>
                  <IconButton
                    size='small'
                    aria-label={t('ai.model_settings.action.edit_key')}
                  >
                    <Edit3 size={16} />
                  </IconButton>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 500 }}>
                  {t('ai.model_settings.api.key_backup')}
                </TableCell>
                <TableCell>
                  <code>sk-****************************</code>
                </TableCell>
                <TableCell>OpenAI</TableCell>
                <TableCell>
                  <Chip
                    label={t('ai.model_settings.api.status_enabled')}
                    size='small'
                    color='success'
                    sx={{ height: 22 }}
                  />
                </TableCell>
                <TableCell>2024-03-20</TableCell>
                <TableCell align='right'>
                  <IconButton
                    size='small'
                    aria-label={t('ai.model_settings.action.edit_key')}
                  >
                    <Edit3 size={16} />
                  </IconButton>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 500 }}>
                  {t('ai.model_settings.api.key_ernie')}
                </TableCell>
                <TableCell>
                  <code>xx-****************************</code>
                </TableCell>
                <TableCell>{t('ai.model_settings.provider.baidu')}</TableCell>
                <TableCell>
                  <Chip
                    label={t('ai.model_settings.api.status_enabled')}
                    size='small'
                    color='success'
                    sx={{ height: 22 }}
                  />
                </TableCell>
                <TableCell>2024-02-10</TableCell>
                <TableCell align='right'>
                  <IconButton
                    size='small'
                    aria-label={t('ai.model_settings.action.edit_key')}
                  >
                    <Edit3 size={16} />
                  </IconButton>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper
        variant='outlined'
        sx={{ p: 3, borderRadius: 3 }}
      >
        <Typography
          variant='subtitle1'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {t('ai.model_settings.api.usage_tips')}
        </Typography>
        <List disablePadding>
          <ListItem sx={{ px: 0, py: 1 }}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              <AlertCircle
                size={16}
                style={{ color: ct.warning.main }}
              />
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography variant='body2'>{t('ai.model_settings.api.tip_keep_safe')}</Typography>
              }
            />
          </ListItem>
          <ListItem sx={{ px: 0, py: 1 }}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              <AlertCircle
                size={16}
                style={{ color: ct.warning.main }}
              />
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography variant='body2'>
                  {t('ai.model_settings.api.tip_rotate_keys')}
                </Typography>
              }
            />
          </ListItem>
          <ListItem sx={{ px: 0, py: 1 }}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              <AlertCircle
                size={16}
                style={{ color: ct.warning.main }}
              />
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography variant='body2'>{t('ai.model_settings.api.tip_multi_env')}</Typography>
              }
            />
          </ListItem>
        </List>
      </Paper>
    </Box>
  );
};
