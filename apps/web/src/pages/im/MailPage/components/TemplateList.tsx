import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import {
  Search,
  Eye,
  Edit,
  Play,
  Pause,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react';
import type { EmailTemplate } from '@/api/mail';
import { TEMPLATE_CATEGORIES } from '@/api/mail';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

interface TemplateListProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  setCurrentPage: (page: number) => void;
  templates: EmailTemplate[];
  totalTemplates: number;
  currentPage: number;
  pageSize: number;
  loading: boolean;
  handleEyeTemplate: (template: EmailTemplate) => void;
  openEditTemplate: (template: EmailTemplate) => void;
  handleToggleTemplateStatus: (template: EmailTemplate) => void;
  openDeleteTemplateDialog: (templateId: string) => void;
  handlePrevPage: () => void;
  handleNextPage: () => void;
  getCategoryLabel: (category: string) => string;
}

const TemplateList: React.FC<TemplateListProps> = ({
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  setCurrentPage,
  templates,
  totalTemplates,
  currentPage,
  pageSize,
  loading,
  handleEyeTemplate,
  openEditTemplate,
  handleToggleTemplateStatus,
  openDeleteTemplateDialog,
  handlePrevPage,
  handleNextPage,
  getCategoryLabel,
}) => {
  const { t } = useTranslation('im');
  return (
    <Box sx={{ mt: 0 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ flex: 1, position: 'relative' }}>
          <Box
            sx={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 1,
              pointerEvents: 'none',
            }}
          >
            <Search
              size={20}
              color='text.disabled'
            />
          </Box>
          <TextField
            type='text'
            placeholder={t('im.mail_page_components_template_list.m1')}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            size='small'
            sx={{ pl: 5, width: '100%' }}
          />
        </Box>
        <FormControl
          size='small'
          sx={{ minWidth: 120 }}
        >
          <InputLabel>{i18n.t('im.template_list.k0')}</InputLabel>
          <Select
            value={categoryFilter || 'all'}
            label={i18n.t('im.template_list.k1')}
            onChange={(e) => {
              setCategoryFilter(e.target.value === 'all' ? '' : e.target.value);
              setCurrentPage(1);
            }}
          >
            <MenuItem value='all'>{i18n.t('im.template_list.k2')}</MenuItem>
            {TEMPLATE_CATEGORIES.map((cat) => (
              <MenuItem
                key={cat.value}
                value={cat.value}
              >
                {cat.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Box
                sx={{
                  display: 'inline-block',
                  animation: 'spin 1s linear infinite',
                  borderRadius: '50%',
                  height: 32,
                  width: 32,
                  border: 4,
                  borderColor: 'primary.main',
                  borderTopColor: 'transparent',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                  },
                }}
              />
              <Typography sx={{ mt: 1, color: 'grey.500' }}>
                {t('im.mail_page_components_email_list.m2')}
              </Typography>
            </Box>
          ) : templates.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <FileText
                size={48}
                color='text.disabled'
                style={{ margin: '0 auto 12px' }}
              />
              <Typography sx={{ color: 'grey.500' }}>{t('im.template_list.k3')}</Typography>
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Box
                component='table'
                sx={{ width: '100%', borderCollapse: 'collapse' }}
              >
                <Box component='thead'>
                  <Box
                    component='tr'
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                  >
                    <Box
                      component='th'
                      sx={{
                        textAlign: 'left',
                        px: 3,
                        py: 1.5,
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: 'grey.500',
                      }}
                    >
                      {t('im.mail_page_components_template_list.e1')}
                    </Box>
                    <Box
                      component='th'
                      sx={{
                        textAlign: 'left',
                        px: 3,
                        py: 1.5,
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: 'grey.500',
                      }}
                    >
                      {t('im.mail_page_components_template_list.e2')}
                    </Box>
                    <Box
                      component='th'
                      sx={{
                        textAlign: 'left',
                        px: 3,
                        py: 1.5,
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: 'grey.500',
                      }}
                    >
                      {t('im.mail_page_components_template_list.e3')}
                    </Box>
                    <Box
                      component='th'
                      sx={{
                        textAlign: 'left',
                        px: 3,
                        py: 1.5,
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: 'grey.500',
                      }}
                    >
                      {t('im.mail_page_components_template_list.e4')}
                    </Box>
                    <Box
                      component='th'
                      sx={{
                        textAlign: 'left',
                        px: 3,
                        py: 1.5,
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: 'grey.500',
                      }}
                    >
                      {t('im.mail_page_components_email_list.e6')}
                    </Box>
                    <Box
                      component='th'
                      sx={{
                        textAlign: 'left',
                        px: 3,
                        py: 1.5,
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: 'grey.500',
                      }}
                    >
                      {t('im.mail_page_components_email_detail_dialog.e6')}
                    </Box>
                    <Box
                      component='th'
                      sx={{
                        textAlign: 'right',
                        px: 3,
                        py: 1.5,
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: 'grey.500',
                      }}
                    >
                      {t('im.mail_page_components_email_list.e9')}
                    </Box>
                  </Box>
                </Box>
                <Box component='tbody'>
                  {templates.map((template) => (
                    <Box
                      component='tr'
                      key={template.id}
                      sx={{
                        borderBottom: 1,
                        borderColor: 'divider',
                        '&:hover': { bgcolor: 'grey.50' },
                      }}
                    >
                      <Box
                        component='td'
                        sx={{ px: 3, py: 2 }}
                      >
                        <Typography
                          sx={{
                            fontWeight: 500,
                            color: 'text.primary',
                          }}
                        >
                          {template.name}
                        </Typography>
                      </Box>
                      <Box
                        component='td'
                        sx={{
                          px: 3,
                          py: 2,
                          fontSize: '0.875rem',
                          color: 'grey.600',
                          fontFamily: 'monospace',
                        }}
                      >
                        {template.code}
                      </Box>
                      <Box
                        component='td'
                        sx={{ px: 3, py: 2 }}
                      >
                        <Chip
                          size='small'
                          variant='outlined'
                          label={getCategoryLabel(template.category)}
                        />
                      </Box>
                      <Box
                        component='td'
                        sx={{
                          px: 3,
                          py: 2,
                          fontSize: '0.875rem',
                          color: 'grey.600',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: 384,
                        }}
                      >
                        {template.subject_template}
                      </Box>
                      <Box
                        component='td'
                        sx={{ px: 3, py: 2 }}
                      >
                        <Chip
                          size='small'
                          variant={template.status === 'active' ? 'filled' : 'outlined'}
                          label={
                            template.status === 'active'
                              ? t('im.template_list.k5')
                              : t('im.template_list.k4')
                          }
                        />
                      </Box>
                      <Box
                        component='td'
                        sx={{
                          px: 3,
                          py: 2,
                          fontSize: '0.875rem',
                          color: 'grey.600',
                        }}
                      >
                        {new Date(template.created_at).toLocaleString('zh-CN')}
                      </Box>
                      <Box
                        component='td'
                        sx={{ px: 3, py: 2 }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: 0.5,
                          }}
                        >
                          <Button
                            variant='text'
                            size='small'
                            onClick={() => handleEyeTemplate(template)}
                            title={t('im.template_list.k6')}
                          >
                            <Eye size={16} />
                          </Button>
                          <Button
                            variant='text'
                            size='small'
                            onClick={() => openEditTemplate(template)}
                            title={t('im.template_list.k7')}
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            variant='text'
                            size='small'
                            onClick={() => handleToggleTemplateStatus(template)}
                            title={
                              template.status === 'active'
                                ? t('im.template_list.k9')
                                : t('im.template_list.k8')
                            }
                            sx={
                              template.status === 'active'
                                ? {
                                    color: 'warning.main',
                                    '&:hover': {
                                      color: 'warning.dark',
                                    },
                                  }
                                : {
                                    color: 'success.main',
                                    '&:hover': {
                                      color: 'success.dark',
                                    },
                                  }
                            }
                          >
                            {template.status === 'active' ? (
                              <Pause size={16} />
                            ) : (
                              <Play size={16} />
                            )}
                          </Button>
                          <Button
                            variant='text'
                            size='small'
                            sx={{
                              color: 'error.main',
                              '&:hover': { color: 'error.dark' },
                            }}
                            onClick={() => openDeleteTemplateDialog(template.id)}
                            title={t('im.template_list.k10')}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          )}
        </CardContent>
        {!loading && templates.length > 0 && (
          <CardContent
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: 1,
              borderColor: 'divider',
            }}
          >
            <Typography
              variant='body2'
              sx={{ color: 'grey.500' }}
            >
              {t('im.mail_page_components_email_list.r2', { v1: totalTemplates })}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                variant='text'
                size='small'
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                aria-label={t('im.template_list.k11')}
              >
                <ChevronLeft size={16} />
              </Button>
              <Typography
                variant='body2'
                sx={{ color: 'grey.600' }}
              >
                {currentPage} / {Math.ceil(totalTemplates / pageSize)}
              </Typography>
              <Button
                variant='text'
                size='small'
                onClick={handleNextPage}
                disabled={currentPage >= Math.ceil(totalTemplates / pageSize)}
              >
                <ChevronRight size={16} />
              </Button>
            </Box>
          </CardContent>
        )}
      </Card>
    </Box>
  );
};

export default TemplateList;
