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

export interface NodeEditDialogProps {
  node: DesignerNodeItem | null;
  onClose: () => void;
  onSave: (node: DesignerNodeItem) => void;
}

export const NodeEditDialog: React.FC<NodeEditDialogProps> = ({ node, onClose, onSave }) => {
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
      <DialogTitle>编辑节点</DialogTitle>
      <DialogContent>
        <Stack
          spacing={2}
          sx={{ mt: 1 }}
        >
          <TextField
            label='节点名称'
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
          <TextField
            label='节点配置（JSON）'
            value={configText}
            onChange={(e) => setConfigText(e.target.value)}
            fullWidth
            multiline
            rows={6}
          />
          <TextField
            label='下游节点 ID（逗号分隔）'
            value={nextNodes}
            onChange={(e) => setNextNodes(e.target.value)}
            fullWidth
            helperText='多个节点用英文逗号分隔'
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
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
