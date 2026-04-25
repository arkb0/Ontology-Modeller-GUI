/**
 * FSMToolbar.tsx
 * Toolbar rendered above the React Flow canvas.
 *
 * Current controls:
 *   • Fit view        – centres and scales the graph to fill the viewport
 *   • Zoom in / out   – ±0.2 step
 *   • Direction toggle – LR ↔ TB layout (triggers re-layout via callback)
 *
 * Future controls (stubs included, disabled):
 *   • Add State       – enters "add node" mode; click on canvas to place
 *   • Delete mode     – selected node/edge is deleted on [Del] key
 *   • Add Transition  – drag from source handle to target to create edge
 *     (React Flow supports this natively once we wire onConnect)
 */

import React from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  FitScreen,
  ZoomIn,
  ZoomOut,
  SwapHoriz,
  SwapVert,
  // Future icons — imported but used only in disabled stubs
  AddCircleOutline,
  DeleteOutline,
} from '@mui/icons-material';
import { useReactFlow } from 'reactflow';
// Direction type is shared — import from utils or define inline
import { FlowGraph } from './fsm.utils';  // not needed here; just direction

type LayoutDirection = 'LR' | 'TB';

interface FSMToolbarProps {
  direction:          LayoutDirection;
  onDirectionChange:  (dir: LayoutDirection) => void;
  methodName?:        string | undefined;
  onAddNode?: () => void;
  onDeleteSelected?: () => void;
}

export default function FSMToolbar({direction, onDirectionChange, methodName, onAddNode, onDeleteSelected}: FSMToolbarProps) {
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  return (
    <Box
      display="flex"
      alignItems="center"
      gap={0.5}
      px={1}
      py={0.5}
      sx={{
        background:   'rgba(30,30,46,0.95)',
        borderBottom: '1px solid #313244',
        flexShrink:   0,
      }}
    >
      {/* Method name breadcrumb */}
      {methodName && (
        <>
          <Typography
            variant="caption"
            sx={{
              fontFamily: 'monospace',
              color:      '#cdd6f4',
              opacity:    0.7,
              mr:         1,
              userSelect: 'none',
            }}
          >
            {methodName}
          </Typography>
          <Divider orientation="vertical" flexItem sx={{ borderColor: '#313244' }} />
        </>
      )}

      {/* Fit view */}
      <Tooltip title="Fit view">
        <IconButton
          size="small"
          onClick={() => fitView({ padding: 0.15, duration: 300 })}
          sx={{ color: '#89b4fa' }}
        >
          <FitScreen fontSize="small" />
        </IconButton>
      </Tooltip>

      {/* Zoom out */}
      <Tooltip title="Zoom out">
        <IconButton
          size="small"
          onClick={() => zoomOut({ duration: 200 })}
          sx={{ color: '#89b4fa' }}
        >
          <ZoomOut fontSize="small" />
        </IconButton>
      </Tooltip>

      {/* Zoom in */}
      <Tooltip title="Zoom in">
        <IconButton
          size="small"
          onClick={() => zoomIn({ duration: 200 })}
          sx={{ color: '#89b4fa' }}
        >
          <ZoomIn fontSize="small" />
        </IconButton>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ borderColor: '#313244', mx: 0.5 }} />

      {/* Layout direction toggle */}
      <Tooltip title="Toggle layout direction">
        <ToggleButtonGroup
          value={direction}
          exclusive
          onChange={(_e, val) => val && onDirectionChange(val)}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              color:       '#7f849c',
              border:      '1px solid #313244',
              padding:     '2px 6px',
              '&.Mui-selected': {
                color:      '#89b4fa',
                background: 'rgba(137,180,250,0.12)',
              },
            },
          }}
        >
          <ToggleButton value="LR">
            <Tooltip title="Left → Right">
              <SwapHoriz fontSize="small" />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="TB">
            <Tooltip title="Top → Bottom">
              <SwapVert fontSize="small" />
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
      </Tooltip>

      {/*
       * -- Future: Edit mode controls --------------------------------------
       * These are intentionally disabled/stubbed now.
       * When interactive editing is implemented:
       *   1. AddCircleOutline  → set editMode='addNode'; click on canvas creates a
       *      new state via onPaneClick in ReactFlow, then calls onUpdate()
       *   2. DeleteOutline     → selected node/edge deleted on [Del] keydown;
       *      wire up onNodesDelete / onEdgesDelete callbacks in FSMView
       *   3. Drag-to-connect   → already implicit in React Flow via Handle drag;
       *      wire up onConnect callback → addTransitionToOrganizer → onUpdate()
       */}
      <Divider orientation="vertical" flexItem sx={{ borderColor: '#313244', mx: 0.5 }} />

      <Tooltip title="Add state">
        <span>
          <IconButton size="small" onClick={onAddNode} color="primary">
            <AddCircleOutline fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Delete selected">
        <span>
          <IconButton size="small" onClick={onDeleteSelected} color="error">
            <DeleteOutline fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}
