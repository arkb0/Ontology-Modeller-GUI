/**
 * FSMEdge.tsx
 * Custom React Flow edge for FSM transitions.
 *
 * Shows the (shortened) dataCondition as a floating label mid-edge.
 * Full condition visible on hover via Tooltip.
 *
 * Edge colours:
 *   success → green
 *   failure → red
 *   normal  → muted blue/grey
 *
 * Uses getBezierPath from React Flow for smooth curves.
 * The label is rendered as a <foreignObject> so we can use MUI Typography.
 */

import React, { memo } from 'react';
import {
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
} from 'reactflow';
import { Tooltip, Box } from '@mui/material';
import { EdgeProps } from 'reactflow';
import { FSMEdgeData } from './fsm.utils';

// --- Colour map ---------------------------------------------------------------
const EDGE_COLOURS = {
  success: '#a6e3a1',   // Catppuccin green
  failure: '#f38ba8',   // Catppuccin red
  normal:  '#89b4fa',   // Catppuccin blue
} as const; // makes the keys literal types rather than just 'string'

// --- Component ----------------------------------------------------------------
function FSMEdge({
  id,
  sourceX, sourceY,
  targetX, targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  style = {},
}: EdgeProps<FSMEdgeData>) {
  const edgeType = data?.edgeType ?? 'normal';
  const colour = EDGE_COLOURS[edgeType as keyof typeof EDGE_COLOURS];

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  const tooltipContent = (
    <Box sx={{ fontSize: '0.72rem', maxWidth: 320, lineHeight: 1.5 }}>
      <strong>Condition:</strong>
      <br />
      <code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {data?.condition || '(none)'}
      </code>
    </Box>
  );

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        {...(markerEnd && { markerEnd })} // Removed the direct prop assignment and spread it instead
        style={{
          stroke:      colour,
          strokeWidth: 1.5,
          ...style,
        }}
      />

      {/* Floating label rendered outside the SVG so it can use HTML/MUI */}
      <EdgeLabelRenderer>
        <Tooltip title={tooltipContent} placement="top" arrow enterDelay={400}>
          <div
            style={{
              // EdgeLabelRenderer positions are absolute within the RF canvas
              position:  'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
              // Visual pill
              background:    'rgba(24, 24, 37, 0.88)',
              border:        `1px solid ${colour}`,
              borderRadius:  '4px',
              padding:       '1px 6px',
              fontSize:      '0.6rem',
              fontFamily:    'monospace',
              color:         colour,
              maxWidth:      '130px',
              whiteSpace:    'nowrap',
              overflow:      'hidden',
              textOverflow:  'ellipsis',
              cursor:        'default',
              userSelect:    'none',
            }}
          >
            {data?.conditionShort || ''}
          </div>
        </Tooltip>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(FSMEdge);
