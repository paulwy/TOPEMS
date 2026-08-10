import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils';

import NodeLibrary from '../NodeLibrary';
import NodeEditDialog from '../NodeEditDialog';
import PropertiesPanel from '../PropertiesPanel';
import DesignerCanvas from '../DesignerCanvas';
import type { DesignerCanvasEdge, DesignerNodeItem } from '../../shared';

const triggerNode: DesignerNodeItem = {
  id: 'node-trigger',
  type: 'trigger',
  name: '订单创建触发',
  position: { x: 120, y: 140 },
  config: { event: 'order.created' },
  next_nodes: ['node-action'],
  isNew: true,
};

const actionNode: DesignerNodeItem = {
  id: 'node-action',
  type: 'api_action',
  name: '调用 API',
  position: { x: 420, y: 140 },
  config: { url: '/api/orders' },
};

const defaultPanelProps = {
  selectedNode: triggerNode,
  nodes: [triggerNode, actionNode],
  configDraft: '{\n  "event": "order.created"\n}',
  setConfigDraft: vi.fn(),
  onDuplicateNode: vi.fn(),
  onDeleteNode: vi.fn(),
  onUpdateNodeName: vi.fn(),
  onUpdateNodePosition: vi.fn(),
  onApplyConfig: vi.fn(),
  onToggleNextNode: vi.fn(),
};

const canvasHandlers = {
  onCanvasScroll: vi.fn(),
  onCanvasWheel: vi.fn(),
  onDragOver: vi.fn(),
  onDrop: vi.fn(),
  onNodeMouseDown: vi.fn(),
  onZoomIn: vi.fn(),
  onZoomOut: vi.fn(),
  onZoomFit: vi.fn(),
  onZoomReset: vi.fn(),
};

const edges: DesignerCanvasEdge[] = [
  {
    id: 'edge-1',
    source: 'node-trigger',
    target: 'node-action',
    sourcePos: triggerNode.position,
    targetPos: actionNode.position,
  },
];

describe('AutomationDesigner components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('NodeLibrary', () => {
    it('renders available node type labels', () => {
      renderWithProviders(
        <NodeLibrary
          availableNodeTypes={['trigger', 'api_action', 'condition']}
          nodesCount={0}
          onAddNodeAt={vi.fn()}
        />
      );

      expect(screen.getByText('节点类型')).toBeInTheDocument();
      expect(screen.getByText('触发器')).toBeInTheDocument();
      expect(screen.getByText('API 动作')).toBeInTheDocument();
      expect(screen.getByText('条件分支')).toBeInTheDocument();
    });

    it('adds a node at a deterministic offset when clicked', () => {
      const onAddNodeAt = vi.fn();
      renderWithProviders(
        <NodeLibrary
          availableNodeTypes={['trigger']}
          nodesCount={2}
          onAddNodeAt={onAddNodeAt}
        />
      );

      fireEvent.click(screen.getByText('触发器'));

      expect(onAddNodeAt).toHaveBeenCalledWith('trigger', 180, 180);
    });

    it('passes the node type through drag data', () => {
      const setData = vi.fn();
      renderWithProviders(
        <NodeLibrary
          availableNodeTypes={['api_action']}
          nodesCount={0}
          onAddNodeAt={vi.fn()}
        />
      );

      fireEvent.dragStart(screen.getByText('API 动作').closest('.MuiPaper-root') as HTMLElement, {
        dataTransfer: {
          setData,
          effectAllowed: '',
        },
      });

      expect(setData).toHaveBeenCalledWith('application/node-type', 'api_action');
    });
  });

  describe('NodeEditDialog', () => {
    it('renders nothing when no node is selected', () => {
      renderWithProviders(
        <NodeEditDialog
          node={null}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      );

      expect(screen.queryByText('编辑节点')).not.toBeInTheDocument();
    });

    it('shows selected node values', () => {
      renderWithProviders(
        <NodeEditDialog
          node={triggerNode}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      );

      expect(screen.getByText('编辑节点')).toBeInTheDocument();
      expect(screen.getByLabelText('节点名称')).toHaveValue('订单创建触发');
      expect(screen.getByLabelText('节点配置（JSON）')).toHaveValue(
        JSON.stringify(triggerNode.config, null, 2)
      );
      expect(screen.getByLabelText('下游节点 ID（逗号分隔）')).toHaveValue('node-action');
    });

    it('saves edited node values and parses JSON config', () => {
      const onSave = vi.fn();
      renderWithProviders(
        <NodeEditDialog
          node={triggerNode}
          onClose={vi.fn()}
          onSave={onSave}
        />
      );

      fireEvent.change(screen.getByLabelText('节点名称'), {
        target: { value: '客户创建触发' },
      });
      fireEvent.change(screen.getByLabelText('节点配置（JSON）'), {
        target: { value: '{"event":"customer.created"}' },
      });
      fireEvent.change(screen.getByLabelText('下游节点 ID（逗号分隔）'), {
        target: { value: 'node-action, node-extra' },
      });
      fireEvent.click(screen.getByText('保存'));

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'node-trigger',
          name: '客户创建触发',
          config: { event: 'customer.created' },
          next_nodes: ['node-action', 'node-extra'],
        })
      );
    });

    it('falls back to empty config for invalid JSON', () => {
      const onSave = vi.fn();
      renderWithProviders(
        <NodeEditDialog
          node={triggerNode}
          onClose={vi.fn()}
          onSave={onSave}
        />
      );

      fireEvent.change(screen.getByLabelText('节点配置（JSON）'), {
        target: { value: '{invalid' },
      });
      fireEvent.click(screen.getByText('保存'));

      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ config: {} }));
    });

    it('calls onClose from cancel button', () => {
      const onClose = vi.fn();
      renderWithProviders(
        <NodeEditDialog
          node={triggerNode}
          onClose={onClose}
          onSave={vi.fn()}
        />
      );

      fireEvent.click(screen.getByText('取消'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('PropertiesPanel', () => {
    it('renders empty hint when no node is selected', () => {
      renderWithProviders(
        <PropertiesPanel
          {...defaultPanelProps}
          selectedNode={null}
        />
      );

      expect(screen.getByText('点击画布中的节点查看并编辑属性')).toBeInTheDocument();
    });

    it('renders selected node details', () => {
      renderWithProviders(<PropertiesPanel {...defaultPanelProps} />);

      expect(screen.getByText('节点属性')).toBeInTheDocument();
      expect(screen.getByText('node-trigger')).toBeInTheDocument();
      expect(screen.getByText('触发器')).toBeInTheDocument();
      expect(screen.getByDisplayValue('订单创建触发')).toBeInTheDocument();
      expect(screen.getByDisplayValue('120')).toBeInTheDocument();
      expect(screen.getByDisplayValue('140')).toBeInTheDocument();
    });

    it('calls duplicate and delete handlers', () => {
      renderWithProviders(<PropertiesPanel {...defaultPanelProps} />);

      fireEvent.click(screen.getByLabelText('复制'));
      fireEvent.click(screen.getByLabelText('删除'));

      expect(defaultPanelProps.onDuplicateNode).toHaveBeenCalledWith('node-trigger');
      expect(defaultPanelProps.onDeleteNode).toHaveBeenCalledWith('node-trigger');
    });

    it('updates node name and position fields', () => {
      renderWithProviders(<PropertiesPanel {...defaultPanelProps} />);

      fireEvent.change(screen.getByLabelText('节点名称'), {
        target: { value: '更新后的节点' },
      });
      fireEvent.change(screen.getByLabelText('X 坐标'), {
        target: { value: '220' },
      });
      fireEvent.change(screen.getByLabelText('Y 坐标'), {
        target: { value: '260' },
      });

      expect(defaultPanelProps.onUpdateNodeName).toHaveBeenCalledWith(
        'node-trigger',
        '更新后的节点'
      );
      expect(defaultPanelProps.onUpdateNodePosition).toHaveBeenCalledWith('node-trigger', 220, 140);
      expect(defaultPanelProps.onUpdateNodePosition).toHaveBeenCalledWith('node-trigger', 120, 260);
    });

    it('updates config draft and applies config', () => {
      const { container } = renderWithProviders(<PropertiesPanel {...defaultPanelProps} />);

      const configTextarea = container.querySelector('textarea') as HTMLTextAreaElement;
      expect(configTextarea).toHaveValue(defaultPanelProps.configDraft);

      fireEvent.change(configTextarea, {
        target: { value: '{"event":"changed"}' },
      });
      fireEvent.click(screen.getByText('应用配置'));

      expect(defaultPanelProps.setConfigDraft).toHaveBeenCalledWith('{"event":"changed"}');
      expect(defaultPanelProps.onApplyConfig).toHaveBeenCalledTimes(1);
    });

    it('toggles downstream node connection', () => {
      renderWithProviders(<PropertiesPanel {...defaultPanelProps} />);

      fireEvent.click(screen.getByText('调用 API'));

      expect(defaultPanelProps.onToggleNextNode).toHaveBeenCalledWith(
        'node-trigger',
        'node-action'
      );
    });

    it('shows no-connection hint when there are no other nodes', () => {
      renderWithProviders(
        <PropertiesPanel
          {...defaultPanelProps}
          nodes={[triggerNode]}
        />
      );

      expect(screen.getByText('暂无其他节点可连接')).toBeInTheDocument();
    });
  });

  describe('DesignerCanvas', () => {
    const refs = {
      canvasViewportRef: React.createRef<HTMLDivElement>(),
      canvasRef: React.createRef<HTMLDivElement>(),
    };

    it('renders empty canvas hint', () => {
      renderWithProviders(
        <DesignerCanvas
          nodes={[]}
          edges={[]}
          selectedNodeId={null}
          canvasZoom={1}
          viewport={{ x: 0, y: 0, w: 600, h: 400 }}
          ZOOM_MIN={0.5}
          ZOOM_MAX={2}
          {...refs}
          {...canvasHandlers}
        />
      );

      expect(screen.getByText('画布为空，从左侧拖拽节点类型到此处')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('renders nodes, edges and minimap when nodes exist', () => {
      renderWithProviders(
        <DesignerCanvas
          nodes={[triggerNode, actionNode]}
          edges={edges}
          selectedNodeId='node-trigger'
          canvasZoom={1.25}
          viewport={{ x: 10, y: 20, w: 500, h: 300 }}
          ZOOM_MIN={0.5}
          ZOOM_MAX={2}
          {...refs}
          {...canvasHandlers}
        />
      );

      expect(screen.getByText('订单创建触发')).toBeInTheDocument();
      expect(screen.getByText('调用 API')).toBeInTheDocument();
      expect(screen.getByText('未保存')).toBeInTheDocument();
      expect(screen.getByText('缩略图')).toBeInTheDocument();
      expect(screen.getByText('125%')).toBeInTheDocument();
    });

    it('calls node mouse down and zoom handlers', () => {
      const { container } = renderWithProviders(
        <DesignerCanvas
          nodes={[triggerNode]}
          edges={[]}
          selectedNodeId='node-trigger'
          canvasZoom={1}
          viewport={{ x: 0, y: 0, w: 600, h: 400 }}
          ZOOM_MIN={0.5}
          ZOOM_MAX={2}
          {...refs}
          {...canvasHandlers}
        />
      );

      fireEvent.mouseDown(screen.getByText('订单创建触发'));
      const buttons = container.querySelectorAll('button');
      fireEvent.click(buttons[0]);
      fireEvent.click(buttons[1]);
      fireEvent.click(buttons[2]);
      fireEvent.click(buttons[3]);

      expect(canvasHandlers.onNodeMouseDown).toHaveBeenCalledWith(expect.any(Object), triggerNode);
      expect(canvasHandlers.onZoomIn).toHaveBeenCalledTimes(1);
      expect(canvasHandlers.onZoomOut).toHaveBeenCalledTimes(1);
      expect(canvasHandlers.onZoomFit).toHaveBeenCalledTimes(1);
      expect(canvasHandlers.onZoomReset).toHaveBeenCalledTimes(1);
    });
  });
});
