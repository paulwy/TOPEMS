import React, { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import type { DesignerNodeItem } from '../shared';
import { useTranslation } from 'react-i18next';

export interface NodeEditDialogProps {
  node: DesignerNodeItem | null;
  onClose: () => void;
  onSave: (node: DesignerNodeItem) => void;
}

export const NodeEditDialog: React.FC<NodeEditDialogProps> = ({ node, onClose, onSave }) => {
  const { t } = useTranslation('automation');
  const [name, setName] = useState('');
  const [configText, setConfigText] = useState('{}');
  const [nextNodes, setNextNodes] = useState('');

  useEffect(() => {
    if (node) {
      setName(node.name);
      setConfigText(JSON.stringify(node.config ?? {}, null, 2));
      setNextNodes((node.next_nodes ?? []).join(','));
    }
  }, [node]);

  if (!node) return null;

  const handleSave = () => {
    let config: Record<string, unknown> = {};
    try {
      config = JSON.parse(configText);
    } catch {
      // keep empty config
    }
    onSave({
      ...node,
      name,
      config,
      next_nodes: nextNodes
        ? nextNodes
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
    });
  };

  return (
    <Dialog
      open={Boolean(node)}
      onClose={onClose}
      maxWidth='sm'
      fullWidth
    >
      <DialogTitle>{t('automation.node_edit_dialog.k0')}</DialogTitle>
      <DialogContent>
        <Stack
          spacing={2}
          sx={{ mt: 1 }}
        >
          <TextField
            label={t('automation.node_edit_dialog.k1')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
          <TextField
            label={t('automation.node_edit_dialog.json_2')}
            value={configText}
            onChange={(e) => setConfigText(e.target.value)}
            fullWidth
            multiline
            rows={6}
          />
          <TextField
            label={t('automation.node_edit_dialog.id_3')}
            value={nextNodes}
            onChange={(e) => setNextNodes(e.target.value)}
            fullWidth
            helperText={t('automation.node_edit_dialog.k4')}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('automation.node_edit_dialog.k5')}</Button>
        <Button
          onClick={handleSave}
          variant='contained'
        >
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NodeEditDialog;
