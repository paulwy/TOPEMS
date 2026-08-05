/**
 * DesignerPage — 页面设计器主组件
 *
 * 整合 ComponentPalette + DesignCanvas + PropertyPanel + ComponentTree
 * 提供完整的可视化页面设计体验。
 */

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Button,
  Divider,
  Snackbar,
  Alert,
} from '@mui/material';
import * as LucideIcons from 'lucide-react';
import { useDesigner } from './useDesigner';
import { ComponentPalette } from './ComponentPalette';
import { DesignCanvas } from './DesignCanvas';
import { PropertyPanel } from './PropertyPanel';
import { ComponentTree } from './ComponentTree';
import { BUILTIN_COMPONENTS } from './types';
import type { EntitySchema } from '@/schema';

interface DesignerPageProps {
  /** 初始 Schema（编辑现有页面时使用） */
  initialSchema?: EntitySchema;
  /** 保存回调 */
  onSave?: (schema: EntitySchema) => void;
  /** 取消回调 */
  onCancel?: () => void;
}

export function DesignerPage({ initialSchema, onSave, onCancel }: DesignerPageProps) {
  const designer = useDesigner({ initialSchema });
  const [snack, setSnack] = React.useState<{ msg: string; severity: 'success' | 'error' } | null>(
    null
  );

  const handleDrop = (type: string) => {
    const comp = BUILTIN_COMPONENTS.find((c) => c.type === type);
    if (!comp) return;

    designer.addNode({
      type: comp.type,
      label: comp.label,
      props: comp.defaultProps ?? {},
    });
  };

  const handleSave = () => {
    if (!initialSchema) {
      setSnack({ msg: '缺少基础 Schema，无法保存', severity: 'error' });
      return;
    }
    const output = designer.exportSchema(initialSchema);
    onSave?.(output.schema);
    setSnack({ msg: 'Schema 已导出', severity: 'success' });
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'grey.50' }}>
      {/* 顶部工具栏 */}
      <Paper
        elevation={1}
        sx={{
          px: 2,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          borderRadius: 0,
        }}
      >
        <Typography
          variant='subtitle1'
          sx={{ fontWeight: 600, flex: 1 }}
        >
          <LucideIcons.Layout
            style={{ marginRight: 8, verticalAlign: 'middle' }}
            size={18}
          />
          页面设计器
        </Typography>

        <Tooltip title='撤销 (Ctrl+Z)'>
          <span>
            <IconButton
              onClick={designer.undo}
              disabled={!designer.canUndo}
              size='small'
              aria-label='撤销'
            >
              <LucideIcons.Undo2 size={18} />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title='重做 (Ctrl+Y)'>
          <span>
            <IconButton
              onClick={designer.redo}
              disabled={!designer.canRedo}
              size='small'
              aria-label='重做'
            >
              <LucideIcons.Redo2 size={18} />
            </IconButton>
          </span>
        </Tooltip>

        <Divider
          orientation='vertical'
          flexItem
          sx={{ mx: 1 }}
        />

        <Tooltip title='清空画布'>
          <IconButton
            onClick={designer.clear}
            size='small'
            color='error'
            aria-label='清空画布'
          >
            <LucideIcons.Trash2 size={18} />
          </IconButton>
        </Tooltip>

        <Divider
          orientation='vertical'
          flexItem
          sx={{ mx: 1 }}
        />

        {onCancel && (
          <Button
            variant='outlined'
            size='small'
            onClick={onCancel}
          >
            取消
          </Button>
        )}

        <Button
          variant='contained'
          size='small'
          startIcon={<LucideIcons.Save size={16} />}
          onClick={handleSave}
        >
          导出 Schema
        </Button>
      </Paper>

      {/* 主体区域 */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* 左侧：组件面板 */}
        <Box sx={{ p: 1 }}>
          <ComponentPalette />
        </Box>

        {/* 中间：画布 + 组件树 */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1, gap: 1 }}>
          <Box sx={{ flex: 1, display: 'flex', gap: 1, overflow: 'hidden' }}>
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <DesignCanvas
                nodes={designer.nodes}
                selectedNodeId={designer.state.selectedNodeId}
                onSelectNode={designer.selectNode}
                onDrop={handleDrop}
                onRemove={designer.removeNode}
                onMoveUp={(id) => designer.moveNode(id, 'up')}
                onMoveDown={(id) => designer.moveNode(id, 'down')}
                onAddNode={() => {}}
              />
            </Box>
            <ComponentTree
              nodes={designer.nodes}
              selectedNodeId={designer.state.selectedNodeId}
              onSelectNode={designer.selectNode}
            />
          </Box>
        </Box>

        {/* 右侧：属性面板 */}
        <Box sx={{ p: 1 }}>
          <PropertyPanel
            node={designer.selectedNode}
            onUpdateProp={(key, value) => {
              designer.updateNode(designer.state.selectedNodeId!, { [key]: value });
            }}
            onUpdateLabel={(label) => {
              designer.updateNodeLabel(designer.state.selectedNodeId!, label);
            }}
          />
        </Box>
      </Box>

      <Snackbar
        open={!!snack}
        autoHideDuration={3000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snack ? (
          <Alert
            severity={snack.severity}
            onClose={() => setSnack(null)}
          >
            {snack.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
