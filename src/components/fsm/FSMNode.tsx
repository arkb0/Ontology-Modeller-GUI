/**
 * FSMNode.tsx
 * Custom React Flow node for FSM states.
 *
 * Visual conventions:
 *   start   → double-outlined circle  (green border)
 *   success → filled green circle
 *   failure → filled red circle
 *   default → plain rounded rectangle
 *
 * Each node shows:
 *   • State name (top, monospace)
 *   • Goal reference (bottom, smaller italic)
 *
 * Handles (connection points) are rendered on all four sides so that
 * the interactive drag-to-connect feature (future) works from any angle.
 */

import React, { memo, CSSProperties } from 'react';
import { Handle, Position } from 'reactflow';
import { Tooltip, Box, Typography } from '@mui/material';
import { NodeProps } from 'reactflow';
import { StateType, FSMNodeData } from './fsm.utils';

// --- Per-type style maps ------------------------------------------------------
const TYPE_STYLES: Record<StateType, CSSProperties> = {
  start: {
    background: '#e8f5e9',
    border: '3px double #2e7d32',
    color: '#1b5e20',
  },
  success: {
    background: '#2e7d32',
    border: '2px solid #1b5e20',
    color: '#ffffff',
  },
  failure: {
    background: '#c62828',
    border: '2px solid #7f0000',
    color: '#ffffff',
  },
  default: {
    background: '#1e1e2e',          // dark card — matches app dark theme
    border: '1px solid #444466',
    color: '#cdd6f4',
  },
};

const BASE_NODE_STYLE: CSSProperties = {
  borderRadius:  '8px',
  padding:       '8px 12px',
  minWidth:      '140px',
  maxWidth:      '172px',
  boxSizing:     'border-box',
  textAlign:     'center',
  userSelect:    'none',
  cursor:        'default',
  boxShadow:     '0 2px 8px rgba(0,0,0,0.4)',
  transition:    'box-shadow 0.15s ease',
};

const HANDLE_STYLE = {
  width:      '8px',
  height:     '8px',
  background: '#7f849c',
  border:     '1px solid #313244',
};

// --- Component ----------------------------------------------------------------
function FSMNode({ data, selected }: NodeProps<FSMNodeData>) {
  const typeStyle  = TYPE_STYLES[data.stateType] ?? TYPE_STYLES.default;
  const nodeStyle  = {
    ...BASE_NODE_STYLE,
    ...typeStyle,
    boxShadow: selected
      ? '0 0 0 2px #89b4fa, 0 2px 8px rgba(0,0,0,0.4)'
      : BASE_NODE_STYLE.boxShadow,
  };

  const tooltipContent = (
    <Box sx={{ fontSize: '0.75rem', lineHeight: 1.6 }}>
      <div><strong>State:</strong> {data.stateName}</div>
      <div><strong>Goal:</strong>  {data.goalRef || '—'}</div>
      <div><strong>Type:</strong>  {data.goalType || '—'}</div>
      {data.args?.length > 0 && (
        <div><strong>Args:</strong> {data.args.join(', ')}</div>
      )}
    </Box>
  );

  return (
    <Tooltip
      title={tooltipContent}
      placement="top"
      arrow
      // Delay so it doesn't fire during drag
      enterDelay={600}
      enterNextDelay={400}
    >
      <div style={nodeStyle}>
        {/* Connection handles — all four sides */}
        <Handle type="target" position={Position.Left}  style={HANDLE_STYLE} />
        <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />
        <Handle type="target" position={Position.Top}   style={HANDLE_STYLE} />
        <Handle type="source" position={Position.Bottom} style={HANDLE_STYLE} />

        {/* State name */}
        <Typography
          variant="caption"
          component="div"
          sx={{
            fontFamily: 'monospace',
            fontWeight: 700,
            fontSize:   '0.78rem',
            letterSpacing: '0.02em',
            color: typeStyle.color,
            lineHeight: 1.3,
          }}
        >
          {data.label}
        </Typography>

        {/* Goal reference (secondary line) */}
        {data.goalRef && (
          <Typography
            variant="caption"
            component="div"
            sx={{
              fontSize:   '0.65rem',
              fontStyle:  'italic',
              color:      typeStyle.color,
              opacity:    0.78,
              mt:         '2px',
              lineHeight: 1.2,
              // Clamp to two lines maximum
              display:        '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow:       'hidden',
            }}
          >
            {data.goalRef}
          </Typography>
        )}
      </div>
    </Tooltip>
  );
}

export default memo(FSMNode);
