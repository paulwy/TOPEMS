import React from 'react';
import { Grid } from '@mui/material';
import { DesignerTemplate } from '@/components/templates';
import { DesignerToolbar } from './components/DesignerToolbar';
import { NodeLibrary } from './components/NodeLibrary';
import { DesignerCanvas } from './components/DesignerCanvas';
import { PropertiesPanel } from './components/PropertiesPanel';
import { NodeEditDialog } from './components/NodeEditDialog';
import { useAutomationDesigner } from './useAutomationDesigner';
import { useTranslation } from 'react-i18next';

export const AutomationDesignerPage: React.FC = () => {
  const { t } = useTranslation('automation');
  const s = useAutomationDesigner();

  const showCanvasLayout = s.selectedRuleId && !s.loading && s.mode === 'canvas';

  return (
    <>
      <DesignerTemplate
        mode='fullscreen'
        title={t('automation.index.k0')}
        toolbar={
          <DesignerToolbar
            mode={s.mode}
            setMode={s.setMode}
            loading={s.loading}
            saving={s.saving}
            validating={s.validating}
            error={s.error}
            rules={s.rules}
            selectedRuleId={s.selectedRuleId}
            setSelectedRuleId={s.setSelectedRuleId}
            validationErrors={s.validationErrors}
            nodes={s.nodes}
            availableNodeTypes={s.availableNodeTypes}
            setEditNode={s.setEditNode}
            onLoadCanvas={() => s.selectedRuleId && s.loadCanvasById(s.selectedRuleId)}
            onValidate={s.handleValidate}
            onClear={s.handleClear}
            onSave={s.handleSave}
            onSyncToRule={s.handleSyncToRule}
            onAddNode={s.handleAddNode}
            onDeleteNode={s.handleDeleteNode}
          />
        }
      >
        {showCanvasLayout && (
          <Grid
            container
            spacing={2}
            sx={{ flex: 1, minHeight: 0 }}
          >
            <Grid size={{ xs: 12, md: 2 }}>
              <NodeLibrary
                availableNodeTypes={s.availableNodeTypes}
                nodesCount={s.nodes.length}
                onAddNodeAt={s.handleAddNodeAt}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>
              <DesignerCanvas
                nodes={s.nodes}
                edges={s.edges}
                selectedNodeId={s.selectedNodeId}
                canvasZoom={s.canvasZoom}
                viewport={s.viewport}
                ZOOM_MIN={s.ZOOM_MIN}
                ZOOM_MAX={s.ZOOM_MAX}
                canvasViewportRef={s.canvasViewportRef}
                canvasRef={s.canvasRef}
                onCanvasScroll={s.handleCanvasScroll}
                onCanvasWheel={s.handleCanvasWheel}
                onDragOver={s.handleDragOver}
                onDrop={s.handleDrop}
                onNodeMouseDown={s.handleNodeMouseDown}
                onZoomIn={s.handleZoomIn}
                onZoomOut={s.handleZoomOut}
                onZoomFit={s.handleZoomFit}
                onZoomReset={s.handleZoomReset}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <PropertiesPanel
                selectedNode={s.selectedNode}
                nodes={s.nodes}
                configDraft={s.configDraft}
                setConfigDraft={s.setConfigDraft}
                onDuplicateNode={s.handleDuplicateNode}
                onDeleteNode={s.handleDeleteNode}
                onUpdateNodeName={s.handleUpdateNodeName}
                onUpdateNodePosition={s.handleUpdateNodePosition}
                onApplyConfig={s.handleApplyConfig}
                onToggleNextNode={s.handleToggleNextNode}
              />
            </Grid>
          </Grid>
        )}
      </DesignerTemplate>

      <NodeEditDialog
        node={s.editNode}
        onClose={() => s.setEditNode(null)}
        onSave={s.handleSaveNode}
      />
    </>
  );
};

export default AutomationDesignerPage;
