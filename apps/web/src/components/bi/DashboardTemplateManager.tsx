import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Copy, LayoutDashboard, FolderOpen } from 'lucide-react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  IconButton,
  Tooltip,
  Skeleton,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
} from '@mui/material';
import i18n from '@/i18n';
import {
  fetchDashboardTemplates,
  createDashboardTemplate,
  updateDashboardTemplate,
  deleteDashboardTemplate,
  createDashboardFromTemplate,
  type DashboardTemplate,
} from '@/api/bi';
import { logger } from '@/utils/logger';

export const DashboardTemplateManager: React.FC<{
  onDashboardCreated?: () => void;
}> = ({ onDashboardCreated }) => {
  const [templates, setTemplates] = useState<DashboardTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [_showEditModal, setShowEditModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DashboardTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    category: i18n.t('components.dashboard_template_manager.k0'),
    tags: [] as string[],
    isactive: true,
  });

  const categories = [
    'all',
    i18n.t('components.dashboard_template_manager.k5'),
    i18n.t('components.dashboard_template_manager.k4'),
    i18n.t('components.dashboard_template_manager.k3'),
    i18n.t('components.dashboard_template_manager.k2'),
    i18n.t('components.dashboard_template_manager.k1'),
  ];

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetchDashboardTemplates();
      if (res.success && res.data) {
        setTemplates(res.data.items || []);
      }
    } catch (error: unknown) {
      logger.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleCreateTemplate = async () => {
    try {
      const res = await createDashboardTemplate(newTemplate);
      if (res.success) {
        loadTemplates();
        setShowCreateModal(false);
        setNewTemplate({
          name: '',
          description: '',
          category: i18n.t('components.dashboard_template_manager.k6'),
          tags: [],
          isactive: true,
        });
      }
    } catch (error: unknown) {
      logger.error('Failed to create template:', error);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;
    try {
      const res = await updateDashboardTemplate(editingTemplate.id, newTemplate);
      if (res.success) {
        loadTemplates();
        setShowEditModal(false);
        setEditingTemplate(null);
        setNewTemplate({
          name: '',
          description: '',
          category: i18n.t('components.dashboard_template_manager.k7'),
          tags: [],
          isactive: true,
        });
      }
    } catch (error: unknown) {
      logger.error('Failed to update template:', error);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm(i18n.t('components.dashboard_template_manager.k8'))) return;
    try {
      const res = await deleteDashboardTemplate(id);
      if (res.success) {
        loadTemplates();
      }
    } catch (error: unknown) {
      logger.error('Failed to delete template:', error);
    }
  };

  const handleCreateDashboard = async (templateId: string) => {
    try {
      const template = templates.find((t) => t.id === templateId);
      const name = template
        ? `${template.name} ${i18n.t('components.dashboard_template_manager.k0')}`
        : i18n.t('components.dashboard_template_manager.k9');
      const res = await createDashboardFromTemplate(templateId, { name, is_public: false });
      if (res.success) {
        onDashboardCreated?.();
      }
    } catch (error: unknown) {
      logger.error('Failed to create dashboard from template:', error);
    }
  };

  const handleOpenEditModal = (template: DashboardTemplate) => {
    setEditingTemplate(template);
    setNewTemplate({
      name: template.name,
      description: template.description || '',
      category: template.category || i18n.t('components.dashboard_template_manager.k10'),
      tags: template.tags || [],
      isactive: template.isactive || true,
    });
    setShowEditModal(true);
  };

  const addTag = (tag: string) => {
    if (tag && !newTemplate.tags.includes(tag)) {
      setNewTemplate((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
    }
  };

  const removeTag = (tag: string) => {
    setNewTemplate((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  const filteredTemplates = templates.filter((t) => {
    const matchSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = selectedCategory === 'all' || t.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <TextField
            placeholder={i18n.t('components.dashboard_template_manager.k1')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size='small'
            sx={{ width: 250 }}
          />
          <FormControl
            size='small'
            sx={{ minWidth: 120 }}
          >
            <InputLabel>{i18n.t('components.dashboard_template_manager.k11')}</InputLabel>
            <Select
              value={selectedCategory}
              label={i18n.t('components.dashboard_template_manager.k12')}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map((cat) => (
                <MenuItem
                  key={cat}
                  value={cat}
                >
                  {cat === 'all' ? i18n.t('components.dashboard_template_manager.k13') : cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Button
          variant='contained'
          startIcon={<Plus />}
          onClick={() => setShowCreateModal(true)}
        >
          {i18n.t('components.dashboard_template_manager.k2')}
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent>
                <Skeleton sx={{ width: '60%', mb: 2 }} />
                <Skeleton sx={{ width: '100%', height: 120 }} />
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : filteredTemplates.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 12,
            color: 'text.secondary',
          }}
        >
          <FolderOpen sx={{ width: 64, height: 64, mb: 3, opacity: 0.5 }} />
          <Typography variant='h6'>
            {i18n.t('components.dashboard_template_manager.k14')}
          </Typography>
          <Typography variant='body2'>
            {i18n.t('components.dashboard_template_manager.k15')}
          </Typography>
          <Button
            variant='contained'
            startIcon={<Plus />}
            sx={{ mt: 3 }}
            onClick={() => setShowCreateModal(true)}
          >
            {i18n.t('components.dashboard_template_manager.k3')}
          </Button>
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
          {filteredTemplates.map((template) => (
            <Card
              key={template.id}
              sx={{
                position: 'relative',
                transition: 'all 0.3s',
                '&:hover': {
                  boxShadow: 3,
                  transform: 'translateY(-2px)',
                },
              }}
            >
              {!template.isactive && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    bgcolor: 'grey.300',
                  }}
                />
              )}
              <CardContent sx={{ pb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1,
                      bgcolor: template.isactive ? 'primary.lightest' : 'grey.100',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <LayoutDashboard
                      sx={{ color: template.isactive ? 'primary.main' : 'text.disabled' }}
                    />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant='h6'
                      sx={{
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: template.isactive ? 'text.primary' : 'text.disabled',
                      }}
                    >
                      {template.name}
                    </Typography>
                    <Typography
                      variant='caption'
                      sx={{ color: 'text.secondary' }}
                    >
                      {new Date(template.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>
                {template.description && (
                  <Typography
                    variant='body2'
                    sx={{
                      color: 'text.secondary',
                      mb: 2,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {template.description}
                  </Typography>
                )}
                <Box
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 2 }}
                >
                  {template.category && (
                    <Chip
                      label={template.category}
                      size='small'
                      variant='outlined'
                      color='primary'
                    />
                  )}
                  {template.tags?.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      size='small'
                      variant='outlined'
                    />
                  ))}
                </Box>
                {!template.isactive && (
                  <Typography
                    variant='caption'
                    sx={{ color: 'error' }}
                  >
                    {i18n.t('components.dashboard_template_manager.k4')}
                  </Typography>
                )}
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end', gap: 1 }}>
                <Tooltip title={i18n.t('components.dashboard_template_manager.k16')}>
                  <IconButton
                    size='small'
                    onClick={() => handleCreateDashboard(template.id)}
                    disabled={!template.isactive}
                    aria-label={i18n.t('components.dashboard_template_manager.k17')}
                  >
                    <Copy sx={{ width: 18, height: 18 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title={i18n.t('components.dashboard_template_manager.k18')}>
                  <IconButton
                    size='small'
                    onClick={() => handleOpenEditModal(template)}
                    aria-label={i18n.t('components.dashboard_template_manager.k19')}
                  >
                    <Edit2 sx={{ width: 18, height: 18 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title={i18n.t('components.dashboard_template_manager.k20')}>
                  <IconButton
                    size='small'
                    color='error'
                    onClick={() => handleDeleteTemplate(template.id)}
                    aria-label={i18n.t('components.dashboard_template_manager.k21')}
                  >
                    <Trash2 sx={{ width: 18, height: 18 }} />
                  </IconButton>
                </Tooltip>
              </CardActions>
            </Card>
          ))}
        </Box>
      )}

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>
          {editingTemplate
            ? i18n.t('components.dashboard_template_manager.k23')
            : i18n.t('components.dashboard_template_manager.k22')}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <TextField
            label={i18n.t('components.dashboard_template_manager.k24')}
            fullWidth
            value={newTemplate.name}
            onChange={(e) => setNewTemplate((prev) => ({ ...prev, name: e.target.value }))}
            sx={{ mb: 3 }}
            autoFocus
          />
          <TextField
            label={i18n.t('components.dashboard_template_manager.k25')}
            fullWidth
            multiline
            rows={3}
            value={newTemplate.description}
            onChange={(e) => setNewTemplate((prev) => ({ ...prev, description: e.target.value }))}
            sx={{ mb: 3 }}
          />
          <FormControl
            fullWidth
            sx={{ mb: 3 }}
          >
            <InputLabel>{i18n.t('components.dashboard_template_manager.k26')}</InputLabel>
            <Select
              value={newTemplate.category}
              label={i18n.t('components.dashboard_template_manager.k27')}
              onChange={(e) => setNewTemplate((prev) => ({ ...prev, category: e.target.value }))}
            >
              {categories
                .filter((c) => c !== 'all')
                .map((cat) => (
                  <MenuItem
                    key={cat}
                    value={cat}
                  >
                    {cat}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
          <Box sx={{ mb: 3 }}>
            <Typography
              variant='body2'
              sx={{ fontWeight: 500, mb: 1.5 }}
            >
              {i18n.t('components.dashboard_template_manager.k5')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {newTemplate.tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size='small'
                  onDelete={() => removeTag(tag)}
                />
              ))}
            </Box>
            <TextField
              placeholder={i18n.t('components.dashboard_template_manager.k28')}
              fullWidth
              size='small'
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag(e.currentTarget.value.trim());
                  e.currentTarget.value = '';
                }
              }}
            />
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={newTemplate.isactive}
                onChange={(e) =>
                  setNewTemplate((prev) => ({ ...prev, isactive: e.target.checked }))
                }
              />
            }
            label={i18n.t('components.dashboard_template_manager.k29')}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              setEditingTemplate(null);
            }}
          >
            {i18n.t('components.dashboard_template_manager.k6')}
          </Button>
          <Button
            variant='contained'
            onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
            disabled={!newTemplate.name.trim()}
          >
            {editingTemplate
              ? i18n.t('components.dashboard_template_manager.k31')
              : i18n.t('components.dashboard_template_manager.k30')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DashboardTemplateManager;
