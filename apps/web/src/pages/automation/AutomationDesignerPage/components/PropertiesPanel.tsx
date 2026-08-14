import React from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Copy as DuplicateIcon, Trash2 as DeleteIcon } from 'lucide-react';
import { NODE_TYPE_COLOR, NODE_TYPE_LABEL, type DesignerNodeItem } from '../shared';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

export interface PropertiesPanelProps {
  selectedNode: DesignerNodeItem | null;
  nodes: DesignerNodeItem[];
  configDraft: string;
  setConfigDraft: (v: string) => void;
  onDuplicateNode: (id: string) => void;
  onDeleteNode: (id: string) => void;
  onUpdateNodeName: (id: string, name: string) => void;
  onUpdateNodePosition: (id: string, x: number, y: number) => void;
  onApplyConfig: () => void;
  onToggleNextNode: (nodeId: string, nextId: string) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedNode,
  nodes,
  configDraft,
  setConfigDraft,
  onDuplicateNode,
  onDeleteNode,
  onUpdateNodeName,
  onUpdateNodePosition,
  onApplyConfig,
  onToggleNextNode,
}) => {
  const { t } = useTranslation('automation');
  return (
    <Paper
      variant='outlined'
      sx={{ p: 2, height: '100%', minHeight: 600 }}
    >
      {selectedNode ? (
        <Stack spacing={2}>
          <Stack
            direction='row'
            spacing={1}
            sx={{ alignItems: 'center' }}
          >
            <Typography
              variant='subtitle2'
              sx={{ flex: 1 }}
            >
              {t('automation.automation_designer_page_components_properties_panel.e1')}
            </Typography>
            <Tooltip title={t('automation.automation_designer_page_components_properties_panel.m1')}>
              <IconButton
                size='small'
                onClick={() => onDuplicateNode(selectedNode.id)}
                aria-label={i18n.t('automation.properties_panel.k0')}
              >
                <DuplicateIcon size={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title={i18n.t('automation.properties_panel.delete_1')}>
              <IconButton
                size='small'
                color='error'
                onClick={() => onDeleteNode(selectedNode.id)}
                aria-label={i18n.t('automation.properties_panel.k2')}
              >
                <DeleteIcon size={18} />
              </IconButton>
            </Tooltip>
          </Stack>
          <Divider />
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {t('automation.automation_designer_page_components_properties_panel.e2')}
            </Typography>
            <Typography
              variant='body2'
              sx={{ fontFamily: 'monospace' }}
            >
              {selectedNode.id}
            </Typography>
          </Box>
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
              sx={{ mb: 0.5, display: 'block' }}
            >
              {t('automation.automation_designer_page_components_node_library.e1')}
            </Typography>
            <Chip
              size='small'
              color={NODE_TYPE_COLOR[selectedNode.type]}
              label={NODE_TYPE_LABEL[selectedNode.type]}
            />
          </Box>
          <TextField
            label={t('automation.properties_panel.k3')}
            value={selectedNode.name}
            onChange={(e) => onUpdateNodeName(selectedNode.id, e.target.value)}
            size='small'
            fullWidth
          />
          <Stack
            direction='row'
            spacing={1}
          >
            <TextField
              label={t('automation.automation_designer_page_components_properties_panel.m2')}
              type='number'
              value={Math.round(selectedNode.position.x)}
              onChange={(e) =>
                onUpdateNodePosition(
                  selectedNode.id,
                  Number(e.target.value),
                  selectedNode.position.y
                )
              }
              size='small'
              fullWidth
            />
            <TextField
              label={t('automation.automation_designer_page_components_properties_panel.m3')}
              type='number'
              value={Math.round(selectedNode.position.y)}
              onChange={(e) =>
                onUpdateNodePosition(
                  selectedNode.id,
                  selectedNode.position.x,
                  Number(e.target.value)
                )
              }
              size='small'
              fullWidth
            />
          </Stack>
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
              sx={{ mb: 0.5, display: 'block' }}
            >
              {t('automation.automation_designer_page_components_properties_panel.e4')}
            </Typography>
            <TextField
              value={configDraft}
              onChange={(e) => setConfigDraft(e.target.value)}
              multiline
              rows={6}
              size='small'
              fullWidth
              sx={{ fontFamily: 'monospace' }}
            />
            <Button
              size='small'
              onClick={onApplyConfig}
              sx={{ mt: 0.5 }}
            >
              {t('automation.automation_designer_page_components_properties_panel.e5')}
            </Button>
          </Box>
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
              sx={{ mb: 0.5, display: 'block' }}
            >
              {t('automation.automation_designer_page_components_properties_panel.e6')}
            </Typography>
            <Stack spacing={0.5}>
              {nodes
                .filter((n) => n.id !== selectedNode.id)
                .map((n) => {
                  const checked = (selectedNode.next_nodes ?? []).includes(n.id);
                  return (
                    <Stack
                      key={n.id}
                      direction='row'
                      spacing={1}
                      sx={{
                        p: 0.5,
                        borderRadius: 1,
                        cursor: 'pointer',
                        alignItems: 'center',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                      onClick={() => onToggleNextNode(selectedNode.id, n.id)}
                    >
                      <Chip
                        size='small'
                        variant={checked ? 'filled' : 'outlined'}
                        color={checked ? 'primary' : 'default'}
                        label={checked ? '✓' : '○'}
                        sx={{ height: 18, minWidth: 24 }}
                      />
                      <Typography
                        variant='body2'
                        noWrap
                      >
                        {n.name}
                      </Typography>
                    </Stack>
                  );
                })}
              {nodes.filter((n) => n.id !== selectedNode.id).length === 0 && (
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('automation.automation_designer_page_components_properties_panel.e7')}
                </Typography>
              )}
            </Stack>
          </Box>
        </Stack>
      ) : (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography color='text.secondary'>{t('automation.properties_panel.k4')}</Typography>
        </Box>
      )}
    </Paper>
  );
};

export default PropertiesPanel;
