import React from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Save as SaveIcon,
  AlertTriangle as AlertIcon,
  RefreshCw as RefreshIcon,
  Plus as AddIcon,
  Trash2 as DeleteIcon,
  Eye as EyeIcon,
  Eraser as ClearIcon,
  ListTree as FormModeIcon,
  Network as CanvasModeIcon,
} from 'lucide-react';
import type { AutomationNodeType, AutomationRule } from '@/api/automation';
import {
  NODE_TYPE_COLOR,
  NODE_TYPE_LABEL,
  type DesignerMode,
  type DesignerNodeItem,
} from '../shared';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

export interface DesignerToolbarProps {
  mode: DesignerMode;
  setMode: (m: DesignerMode) => void;
  loading: boolean;
  saving: boolean;
  validating: boolean;
  error: string | null;
  rules: AutomationRule[];
  selectedRuleId: string;
  setSelectedRuleId: (id: string) => void;
  validationErrors: Array<{ node_id?: string; message: string; severity: 'error' | 'warning' }>;
  nodes: DesignerNodeItem[];
  availableNodeTypes: AutomationNodeType[];
  setEditNode: (n: DesignerNodeItem | null) => void;
  onLoadCanvas: () => void;
  onValidate: () => void;
  onClear: () => void;
  onSave: () => void;
  onSyncToRule: () => void;
  onAddNode: (type: AutomationNodeType) => void;
  onDeleteNode: (id: string) => void;
}

export const DesignerToolbar: React.FC<DesignerToolbarProps> = ({
  mode,
  setMode,
  loading,
  saving,
  validating,
  error,
  rules,
  selectedRuleId,
  setSelectedRuleId,
  validationErrors,
  nodes,
  availableNodeTypes,
  setEditNode,
  onLoadCanvas,
  onValidate,
  onClear,
  onSave,
  onSyncToRule,
  onAddNode,
  onDeleteNode,
}) => {
  const { t } = useTranslation('automation');
  return (
    <>
      <Stack
        direction='row'
        spacing={2}
        sx={{
          mb: 2,
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Stack
          direction='row'
          spacing={2}
          sx={{ alignItems: 'center' }}
        >
          <Typography variant='h5'>{i18n.t('automation.designer_toolbar.k0')}</Typography>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={(_, value: DesignerMode | null) => value && setMode(value)}
            size='small'
          >
            <ToggleButton value='canvas'>
              <CanvasModeIcon
                size={16}
                style={{ marginRight: 4 }}
              />
              {t('automation.automation_designer_page_components_designer_toolbar.e1')}
            </ToggleButton>
            <ToggleButton value='form'>
              <FormModeIcon
                size={16}
                style={{ marginRight: 4 }}
              />
              {t('automation.automation_designer_page_components_designer_toolbar.e2')}
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        <Stack
          direction='row'
          spacing={1}
          sx={{ alignItems: 'center' }}
        >
          <Button
            startIcon={<RefreshIcon />}
            onClick={onLoadCanvas}
            size='small'
            disabled={!selectedRuleId || loading}
          >
            {t('automation.automation_designer_page_components_designer_toolbar.e3')}
          </Button>
          <Button
            startIcon={<EyeIcon />}
            onClick={onValidate}
            size='small'
            disabled={!selectedRuleId || validating || nodes.length === 0}
          >
            {validating
              ? t('automation.automation_designer_page_components_designer_toolbar.r1')
              : t('automation.designer_toolbar.k1')}
          </Button>
          <Button
            startIcon={<ClearIcon />}
            onClick={onClear}
            size='small'
            color='warning'
            disabled={nodes.length === 0}
          >
            {t('automation.automation_designer_page_components_designer_toolbar.e4')}
          </Button>
          <Button
            startIcon={<SaveIcon />}
            onClick={onSave}
            size='small'
            variant='contained'
            disabled={!selectedRuleId || saving || nodes.length === 0}
          >
            {saving
              ? t('automation.automation_designer_page_components_designer_toolbar.r2')
              : t('automation.designer_toolbar.k2')}
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Typography
          color='error'
          variant='body2'
          sx={{ mb: 1 }}
        >
          {error}
        </Typography>
      )}

      <Stack
        direction='row'
        spacing={2}
        sx={{ mb: 2, alignItems: 'center' }}
      >
        <TextField
          select
          label={t('automation.designer_toolbar.k3')}
          value={selectedRuleId}
          onChange={(e) => setSelectedRuleId(e.target.value)}
          size='small'
          sx={{ minWidth: 300 }}
        >
          <MenuItem value=''>
            <em>{t('automation.designer_toolbar.k4')}</em>
          </MenuItem>
          {rules.map((r) => (
            <MenuItem
              key={r.id}
              value={r.id}
            >
              {r.name} ({r.code})
            </MenuItem>
          ))}
        </TextField>
        <Button
          size='small'
          onClick={onSyncToRule}
          disabled={!selectedRuleId}
          variant='outlined'
        >
          {t('automation.automation_designer_page_components_designer_toolbar.e5')}
        </Button>
      </Stack>

      {validationErrors.length > 0 && (
        <Paper
          variant='outlined'
          sx={{ p: 1.5, mb: 2, bgcolor: 'warning.lighter' }}
        >
          <Stack
            direction='row'
            spacing={1}
            sx={{ alignItems: 'center', mb: 0.5 }}
          >
            <AlertIcon size={16} />
            <Typography variant='subtitle2'>{t('automation.designer_toolbar.k5')}</Typography>
          </Stack>
          {validationErrors.map((e, idx) => (
            <Typography
              key={idx}
              variant='body2'
              color={e.severity === 'error' ? 'error.main' : 'warning.main'}
            >
              [{e.severity}] {e.node_id ? `[${e.node_id}] ` : ''}
              {e.message}
            </Typography>
          ))}
        </Paper>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : !selectedRuleId ? (
        <Paper
          variant='outlined'
          sx={{ p: 4, textAlign: 'center' }}
        >
          <Typography color='text.secondary'>{t('automation.designer_toolbar.k6')}</Typography>
        </Paper>
      ) : mode === 'form' ? (
        <Box>
          <Paper
            variant='outlined'
            sx={{ p: 1, mb: 2 }}
          >
            <Stack
              direction='row'
              spacing={1}
              sx={{ flexWrap: 'wrap' }}
            >
              {availableNodeTypes.map((t) => (
                <Button
                  key={t}
                  size='small'
                  startIcon={<AddIcon />}
                  onClick={() => onAddNode(t)}
                >
                  {NODE_TYPE_LABEL[t]}
                </Button>
              ))}
            </Stack>
          </Paper>

          <Paper
            variant='outlined'
            sx={{ p: 2, minHeight: 400 }}
          >
            {nodes.length === 0 ? (
              <Typography
                color='text.secondary'
                sx={{ textAlign: 'center', mt: 4 }}
              >
                {t('automation.automation_designer_page_components_designer_toolbar.e6')}
              </Typography>
            ) : (
              <Stack spacing={1}>
                {nodes.map((node) => (
                  <Paper
                    key={node.id}
                    variant='outlined'
                    sx={{
                      p: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      borderStyle: node.isNew ? 'dashed' : 'solid',
                    }}
                  >
                    <Chip
                      size='small'
                      color={NODE_TYPE_COLOR[node.type]}
                      label={NODE_TYPE_LABEL[node.type]}
                    />
                    <Typography
                      variant='body2'
                      sx={{ flex: 1 }}
                    >
                      {node.name}
                      {node.isNew && (
                        <Typography
                          component='span'
                          color='warning.main'
                          sx={{ ml: 1 }}
                        >
                          ({t('automation.automation_designer_page_components_designer_toolbar.l1')})
                        </Typography>
                      )}
                    </Typography>
                    <Button
                      size='small'
                      onClick={() => setEditNode(node)}
                    >
                      {t('automation.automation_designer_page_components_designer_toolbar.e7')}
                    </Button>
                    <IconButton
                      size='small'
                      color='error'
                      onClick={() => onDeleteNode(node.id)}
                      aria-label={t('automation.designer_toolbar.k7')}
                    >
                      <DeleteIcon size={18} />
                    </IconButton>
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>
        </Box>
      ) : null}
    </>
  );
};

export default DesignerToolbar;
