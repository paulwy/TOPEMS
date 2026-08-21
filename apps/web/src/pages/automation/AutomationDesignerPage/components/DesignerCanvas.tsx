import React from 'react';
import { Box, Chip, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material';
import {
  Network as CanvasModeIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Maximize as FitIcon,
  RotateCcw as ResetIcon,
} from 'lucide-react';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  NODE_HEIGHT,
  NODE_TYPE_BORDER_COLOR,
  NODE_TYPE_COLOR,
  NODE_TYPE_ICON,
  NODE_TYPE_LABEL,
  NODE_WIDTH,
  computeEdgePath,
  type DesignerCanvasEdge,
  type DesignerNodeItem,
} from '../shared';
import { designTokens, semanticTokens } from '@topems/tokens';
import { useTranslation } from 'react-i18next';

interface DesignerCanvasProps {
  nodes: DesignerNodeItem[];
  edges: DesignerCanvasEdge[];
  selectedNodeId: string | null;
  canvasZoom: number;
  viewport: { x: number; y: number; w: number; h: number };
  ZOOM_MIN: number;
  ZOOM_MAX: number;
  canvasViewportRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onCanvasScroll: () => void;
  onCanvasWheel: (e: React.WheelEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onNodeMouseDown: (e: React.MouseEvent, node: DesignerNodeItem) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  onZoomReset: () => void;
}

export const DesignerCanvas: React.FC<DesignerCanvasProps> = ({
  nodes,
  edges,
  selectedNodeId,
  canvasZoom,
  viewport,
  ZOOM_MIN,
  ZOOM_MAX,
  canvasViewportRef,
  canvasRef,
  onCanvasScroll,
  onCanvasWheel,
  onDragOver,
  onDrop,
  onNodeMouseDown,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  onZoomReset,
}) => {
  const { t } = useTranslation('automation');
  return (
    <Paper
      ref={canvasViewportRef}
      onScroll={onCanvasScroll}
      onWheel={onCanvasWheel}
      variant='outlined'
      sx={{
        position: 'relative',
        height: 600,
        overflow: 'auto',
        bgcolor: 'grey.50',
        backgroundImage: `radial-gradient(circle, ${designTokens.colors.grey['300']} 1px, transparent 1px)`,
        backgroundSize: `${20 * canvasZoom}px ${20 * canvasZoom}px`,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: CANVAS_WIDTH * canvasZoom,
          height: CANVAS_HEIGHT * canvasZoom,
        }}
      >
        <Box
          ref={canvasRef}
          onDragOver={onDragOver}
          onDrop={onDrop}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            transform: `scale(${canvasZoom})`,
            transformOrigin: '0 0',
          }}
        >
          <svg
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
          >
            <defs>
              <marker
                id='dag-arrowhead'
                markerWidth='10'
                markerHeight='7'
                refX='9'
                refY='3.5'
                orient='auto'
              >
                <polygon
                  points='0 0, 10 3.5, 0 7'
                  fill='colors.grey.500'
                />
              </marker>
            </defs>
            {edges.map((edge) => {
              const path = computeEdgePath(edge.sourcePos, edge.targetPos);
              return (
                <path
                  key={edge.id}
                  d={path}
                  stroke='colors.grey.500'
                  strokeWidth={2}
                  fill='none'
                  markerEnd='url(#dag-arrowhead)'
                />
              );
            })}
          </svg>

          {nodes.map((node) => {
            const Icon = NODE_TYPE_ICON[node.type];
            const isSelected = selectedNodeId === node.id;
            return (
              <Paper
                key={node.id}
                elevation={isSelected ? 4 : 1}
                onMouseDown={(e) => onNodeMouseDown(e, node)}
                sx={{
                  position: 'absolute',
                  left: node.position.x,
                  top: node.position.y,
                  width: NODE_WIDTH,
                  minHeight: NODE_HEIGHT,
                  p: 1,
                  cursor: 'move',
                  border: isSelected ? 2 : 1,
                  borderColor: isSelected ? 'primary.main' : NODE_TYPE_BORDER_COLOR[node.type],
                  bgcolor: 'background.paper',
                  zIndex: isSelected ? 2 : 1,
                  userSelect: 'none',
                }}
              >
                <Stack
                  direction='row'
                  spacing={1}
                  sx={{ mb: 0.5, alignItems: 'center' }}
                >
                  {Icon && <Icon size={18} />}
                  <Typography
                    variant='body2'
                    noWrap
                    sx={{ flex: 1, fontWeight: isSelected ? 600 : 400 }}
                  >
                    {node.name}
                  </Typography>
                </Stack>
                <Stack
                  direction='row'
                  spacing={0.5}
                  sx={{ alignItems: 'center' }}
                >
                  <Chip
                    size='small'
                    color={NODE_TYPE_COLOR[node.type]}
                    label={NODE_TYPE_LABEL[node.type]}
                    sx={{ height: 18, fontSize: 10 }}
                  />
                  {node.isNew && (
                    <Typography
                      variant='caption'
                      color='warning.main'
                    >
                      {t('automation.automation_designer_page_components_designer_canvas.e1')}
                    </Typography>
                  )}
                </Stack>
              </Paper>
            );
          })}

          {nodes.length === 0 && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none',
              }}
            >
              <CanvasModeIcon
                size={48}
                style={{ opacity: 0.3 }}
              />
              <Typography
                color='text.secondary'
                sx={{ mt: 1 }}
              >
                {t('automation.automation_designer_page_components_designer_canvas.e2')}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      <Stack
        direction='row'
        spacing={0.5}
        sx={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          alignItems: 'center',
          px: 0.5,
          py: 0.25,
          borderRadius: 1,
          bgcolor: designTokens.colors.common.white,
          boxShadow: 1,
          zIndex: 10,
        }}
      >
        <Tooltip title={t('automation.automation_designer_page_components_designer_canvas.r1')}>
          <IconButton
            size='small'
            onClick={onZoomIn}
            disabled={canvasZoom >= ZOOM_MAX}
          >
            <ZoomInIcon size={18} />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('automation.automation_designer_page_components_designer_canvas.r2')}>
          <IconButton
            size='small'
            onClick={onZoomOut}
            disabled={canvasZoom <= ZOOM_MIN}
          >
            <ZoomOutIcon size={18} />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('automation.designer_canvas.k0')}>
          <IconButton
            size='small'
            onClick={onZoomFit}
            disabled={nodes.length === 0}
          >
            <FitIcon size={18} />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('automation.designer_canvas.100_1')}>
          <IconButton
            size='small'
            onClick={onZoomReset}
          >
            <ResetIcon size={18} />
          </IconButton>
        </Tooltip>
        <Typography
          variant='caption'
          sx={{ minWidth: 38, textAlign: 'center' }}
        >
          {Math.round(canvasZoom * 100)}%
        </Typography>
      </Stack>

      {nodes.length > 0 && (
        <Paper
          elevation={2}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            p: 0.5,
            bgcolor: designTokens.colors.common.white,
            pointerEvents: 'none',
          }}
        >
          <svg
            width={168}
            height={112}
            viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
            preserveAspectRatio='xMidYMid meet'
          >
            {edges.map((edge) => {
              const sx = edge.sourcePos.x + NODE_WIDTH;
              const sy = edge.sourcePos.y + NODE_HEIGHT / 2;
              const tx = edge.targetPos.x;
              const ty = edge.targetPos.y + NODE_HEIGHT / 2;
              return (
                <line
                  key={edge.id}
                  x1={sx}
                  y1={sy}
                  x2={tx}
                  y2={ty}
                  stroke={designTokens.colors.grey['400']}
                  strokeWidth={6}
                />
              );
            })}
            {nodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              return (
                <rect
                  key={node.id}
                  x={node.position.x}
                  y={node.position.y}
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  rx={8}
                  fill={isSelected ? designTokens.colors.primary.dark : 'colors.grey.500'}
                />
              );
            })}
            <rect
              x={Math.max(0, viewport.x)}
              y={Math.max(0, viewport.y)}
              width={Math.min(CANVAS_WIDTH, viewport.w)}
              height={Math.min(CANVAS_HEIGHT, viewport.h)}
              fill='none'
              stroke={designTokens.colors.primary.dark}
              strokeWidth={24}
              strokeDasharray='48 24'
            />
          </svg>
          <Typography
            variant='caption'
            sx={{ display: 'block', textAlign: 'center', lineHeight: 1, fontSize: 9 }}
          >
            {t('automation.automation_designer_page_components_designer_canvas.e3')}
          </Typography>
        </Paper>
      )}
    </Paper>
  );
};

export default DesignerCanvas;
