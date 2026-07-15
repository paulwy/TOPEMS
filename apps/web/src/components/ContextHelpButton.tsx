import React, { useState, useEffect } from 'react';
import {
  Fab,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  Stack,
} from '@mui/material';
import {
  HelpCircle,
  X,
  BookOpen,
  FileQuestion,
  ExternalLink,
  MessageCircle,
  ChevronRight,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { findHelpByPath } from '@/config/help-mapping';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import { useTranslation } from 'react-i18next';

export interface ContextHelpButtonProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  offset?: { x?: number; y?: number };
  showOnMobile?: boolean;
}

export const ContextHelpButton: React.FC<ContextHelpButtonProps> = ({
  position = 'bottom-right',
  offset = { x: 24, y: 24 },
  showOnMobile = false,
}) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [helpInfo, setHelpInfo] = useState<ReturnType<typeof findHelpByPath>>(undefined);

  useEffect(() => {
    const info = findHelpByPath(location.pathname);
    setHelpInfo(info);
  }, [location.pathname]);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleViewGuide = () => {
    navigate(DASHBOARD_PATHS.helpGuide);
    handleClose();
  };

  const handleViewFaq = () => {
    navigate(DASHBOARD_PATHS.helpFaq);
    handleClose();
  };

  const handleContactSupport = () => {
    window.location.href = 'mailto:support@topems.com';
    handleClose();
  };

  const positionStyles: Record<string, React.CSSProperties> = {
    'bottom-right': { bottom: offset.y, right: offset.x },
    'bottom-left': { bottom: offset.y, left: offset.x },
    'top-right': { top: offset.y, right: offset.x },
    'top-left': { top: offset.y, left: offset.x },
  };

  return (
    <>
      <Tooltip title={t('help.context_help', '上下文帮助')}>
        <Fab
          color='primary'
          size='medium'
          onClick={handleOpen}
          sx={{
            position: 'fixed',
            zIndex: 1000,
            ...positionStyles[position],
            display: showOnMobile ? 'flex' : { xs: 'none', md: 'flex' },
            boxShadow: 3,
            '&:hover': {
              transform: 'scale(1.05)',
              transition: 'transform 0.2s',
            },
          }}
        >
          <HelpCircle size={24} />
        </Fab>
      </Tooltip>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth='sm'
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pr: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1.5,
                bgcolor: 'primary.50',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <HelpCircle
                size={20}
                sx={{ color: 'primary.main' }}
              />
            </Box>
            <Box>
              <Typography
                variant='h6'
                sx={{ fontWeight: 600 }}
              >
                {helpInfo?.title || t('help.help_center', '帮助中心')}
              </Typography>
              {helpInfo?.description && (
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {helpInfo.description}
                </Typography>
              )}
            </Box>
          </Box>
          <Button
            size='small'
            onClick={handleClose}
            sx={{ minWidth: 'auto', p: 1 }}
          >
            <X size={20} />
          </Button>
        </DialogTitle>

        <DialogContent
          dividers
          sx={{ p: 0 }}
        >
          <List sx={{ py: 0 }}>
            <ListItem
              onClick={handleViewGuide}
              sx={{
                cursor: 'pointer',
                py: 2,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <ListItemIcon>
                <BookOpen
                  size={20}
                  sx={{ color: 'primary.main' }}
                />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 500 }}
                  >
                    {t('help.view_guide', '查看操作指南')}
                  </Typography>
                }
                secondary={t('help.view_guide_desc', '完整的用户手册和操作教程')}
              />
              <ChevronRight
                size={18}
                sx={{ color: 'text.disabled' }}
              />
            </ListItem>

            <Divider />

            <ListItem
              onClick={handleViewFaq}
              sx={{
                cursor: 'pointer',
                py: 2,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <ListItemIcon>
                <FileQuestion
                  size={20}
                  sx={{ color: 'success.main' }}
                />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 500 }}
                  >
                    {t('help.view_faq', '浏览常见问题')}
                  </Typography>
                }
                secondary={t('help.view_faq_desc', '高频问题解答，快速找到答案')}
              />
              <ChevronRight
                size={18}
                sx={{ color: 'text.disabled' }}
              />
            </ListItem>

            <Divider />

            <ListItem
              onClick={handleContactSupport}
              sx={{
                cursor: 'pointer',
                py: 2,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <ListItemIcon>
                <MessageCircle
                  size={20}
                  sx={{ color: 'info.main' }}
                />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 500 }}
                  >
                    {t('help.contact_support', '联系技术支持')}
                  </Typography>
                }
                secondary={t('help.contact_support_desc', '工作时间 9:00-18:00，工作日')}
              />
              <ChevronRight
                size={18}
                sx={{ color: 'text.disabled' }}
              />
            </ListItem>
          </List>
        </DialogContent>

        <DialogActions
          sx={{ p: 2, bgcolor: 'grey.50', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}
        >
          <Stack
            direction='row'
            spacing={1}
            sx={{ width: '100%', justifyContent: 'center' }}
          >
            <Chip
              label={t('help.shortcut', '快捷键: ?')}
              size='small'
              variant='outlined'
              sx={{ bgcolor: 'background.paper' }}
            />
            <Chip
              label={t('help.all_docs', '全部文档')}
              size='small'
              variant='outlined'
              onClick={() => {
                navigate(DASHBOARD_PATHS.helpCenter);
                handleClose();
              }}
              sx={{
                bgcolor: 'background.paper',
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' },
              }}
              deleteIcon={<ExternalLink size={14} />}
              onDelete={() => {}}
            />
          </Stack>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ContextHelpButton;
