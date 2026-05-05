/**
 * FSMView.tsx
 * Main FSM visualiser component built on React Flow.
 *
 * Props:
 *   organizer  {object}   – the `organizer` block from a Method JSON entry
 *   methodName {string}   – displayed in the toolbar breadcrumb
 *   onUpdate   {function} – called with updated organizer when graph is edited
 *                           signature: (updatedOrganizer: object) => void
 *
 * Internal state:
 *   nodes / edges   – React Flow node & edge arrays (derived from organizer)
 *   direction       – 'LR' | 'TB' layout direction
 *
 * Interactive features:
 *   • Drag nodes to reposition them
 *   • Drag from a Handle to create a new transition
 *   • Delete key removes selected nodes/edges
 *   • RMB on node → context menu: set state type OR rename
 *   • LMB on edge → inline popover to edit dataCondition
 *   • Undo/redo via Ctrl+Z / Ctrl+Shift+Z (history stored locally)
 *
 * Data flow (current):
 *   organizer prop → organizerToFlow() → { nodes, edges } → React Flow
 *
 * Data flow (future, interactive):
 *   user gesture → local nodes/edges update
 *               → flowToOrganizer() (to be written in fsm.utils.js)
 *               → onUpdate(updatedOrganizer)
 */

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Connection,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  addEdge,
  useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';

import {
  Box, Menu, MenuItem, ListItemIcon, ListItemText,
  Popover, TextField, Button, Typography, Divider
} from '@mui/material';
import { Flag, CheckCircle, Error, PlayArrow, Edit as EditIcon } from '@mui/icons-material';
import FSMNode    from './FSMNode';
import FSMEdge    from './FSMEdge';
import FSMToolbar from './FSMToolbar';
import { organizerToFlow, removeStateFromOrganizer } from './fsm.utils';
import {
  Organizer, FlowGraph, FSMNodeData, FSMEdgeData, FSMState, FSMTransition,
  LayoutDirection, addStateToOrganizer, addTransitionToOrganizer,
  removeTransitionFromOrganizer
} from './fsm.utils';

// ---------------------------------------------------------------------------
// Undo/redo history — a simple stack pair kept inside FSMCanvas.
// We only store organizer snapshots (plain objects, cheap to copy).
// Max depth is 64 steps — more than enough for any real editing session.
// ---------------------------------------------------------------------------
const HISTORY_LIMIT = 64;

function useOrganizerHistory(initial: Organizer) {
  const past   = useRef<Organizer[]>([]);
  const future = useRef<Organizer[]>([]);

  const push = useCallback((snapshot: Organizer) => {
    past.current = [...past.current.slice(-(HISTORY_LIMIT - 1)), snapshot];
    future.current = []; // branching clears the redo stack
  }, []);

  const undo = useCallback((current: Organizer, onUpdate: (o: Organizer) => void) => {
    if (past.current.length === 0) return;
    const prev = past.current[past.current.length - 1];
    past.current = past.current.slice(0, -1);
    future.current = [current, ...future.current.slice(0, HISTORY_LIMIT - 1)];
    onUpdate(prev);
  }, []);

  const redo = useCallback((current: Organizer, onUpdate: (o: Organizer) => void) => {
    if (future.current.length === 0) return;
    const next = future.current[0];
    future.current = future.current.slice(1);
    past.current = [...past.current.slice(-(HISTORY_LIMIT - 1)), current];
    onUpdate(next);
  }, []);

  const canUndo = () => past.current.length > 0;
  const canRedo = () => future.current.length > 0;

  return { push, undo, redo, canUndo, canRedo };
}

// ---------------------------------------------------------------------------

interface FSMCanvasProps {
  organizer:   Organizer;
  methodName?: string | undefined;
  onUpdate?:   ((updated: Organizer) => void) | undefined;
}

interface FSMViewProps {
  organizer?:  Organizer | null;
  methodName?: string;
  onUpdate?:   (updated: Organizer) => void;
}

// --- Custom type registration -------------------------------------------------
// Defined OUTSIDE the component to avoid re-registering on every render,
// which causes React Flow to remount all nodes unnecessarily.
const NODE_TYPES = { fsmNode: FSMNode };
const EDGE_TYPES = { fsmEdge: FSMEdge };

// --- Inner canvas (needs ReactFlowProvider context for useReactFlow) ----------
function FSMCanvas({ organizer, methodName, onUpdate }: FSMCanvasProps) {
  const [direction, setDirection] = useState<LayoutDirection>('TB');

  // -- State for node context menu (RMB on node) ----------------------------
  const [menuAnchor, setMenuAnchor]   = useState<{ mouseX: number; mouseY: number } | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // -- State for rename popover (triggered from node context menu) ----------
  const [renameAnchorEl, setRenameAnchorEl] = useState<HTMLElement | null>(null);
  const [renameValue, setRenameValue]       = useState('');
  const [renameOldName, setRenameOldName]   = useState('');
  // We anchor the rename popover to a stable div positioned at the menu coords
  const renameAnchorRef = useRef<HTMLDivElement>(null);
  const [renamePos, setRenamePos] = useState<{ top: number; left: number } | null>(null);

  // -- State for edge condition popover (LMB on edge) -----------------------
  const [conditionEdge, setConditionEdge]   = useState<Edge<FSMEdgeData> | null>(null);
  const [conditionValue, setConditionValue] = useState('');
  const [conditionPos, setConditionPos]     = useState<{ top: number; left: number } | null>(null);

  // -- Undo / redo ----------------------------------------------------------
  const history = useOrganizerHistory(organizer);

  // Wrap onUpdate so that every outbound change is pushed to history first.
  const commitUpdate = useCallback((updated: Organizer) => {
    if (!onUpdate) return;
    history.push(organizer); // snapshot the state BEFORE the change
    onUpdate(updated);
  }, [organizer, onUpdate, history]);

  // Keyboard shortcuts: Ctrl+Z / Ctrl+Shift+Z
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!onUpdate) return;
      // Don't steal from Monaco or any <input> / <textarea>
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        history.undo(organizer, onUpdate);
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        history.redo(organizer, onUpdate);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [organizer, onUpdate, history]);

  // Track previous direction to detect toggle vs form edit
  const prevDirRef = useRef<LayoutDirection>(direction);

  // Derive nodes and edges whenever organizer or direction changes.
  // organizerToFlow re-runs dagre layout on every call, so memoize it.
  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(
    () => organizerToFlow(organizer, direction),
    [organizer, direction]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  // When the organizer prop or direction changes from outside, re-sync.
  useEffect(() => {
    // Check if the update was triggered by a direction toggle
    const isDirectionChange = prevDirRef.current !== direction;
    prevDirRef.current = direction;

    // We don't simply `setNodes(layoutNodes);` so we may preserve user-modified positions
    setNodes((nds) => {
      return layoutNodes.map((newNode) => {
        // Look for the existing node in the current state to preserve its position
        const existingNode = nds.find((n) => n.id === newNode.id);

        // ONLY preserve position if it's a form update. 
        // If it's a direction toggle, use the new Dagre positions.
        if (existingNode && !isDirectionChange) {
          return {
            ...newNode,
            position: existingNode.position,
          };
        }

        return newNode;
      });
    });
    setEdges(layoutEdges);
  }, [layoutNodes, layoutEdges, setNodes, setEdges]);

  const { screenToFlowPosition } = useReactFlow();

  // -- Handle new connection drawn by user ---------------------------
  // When interactive editing is enabled:
  //   1. Convert the React Flow connection to a transition object.
  //   2. Call addTransitionToOrganizer() from fsm.utils.
  //   3. Call onUpdate() with the new organizer.
  const onConnect = useCallback(
    (params: Connection) => {
      if (!onUpdate || !params.source || !params.target) return;

      const newTransition: FSMTransition = {
        sourceState: params.source,
        targetState: params.target,
        dataCondition: ''
      };

      // Sync back to webform
      commitUpdate(addTransitionToOrganizer(organizer, newTransition));
    },
    [organizer, commitUpdate]
  );

  // -- Handle node deletion -----------------------------------------
  const onNodesDelete = useCallback((deleted: Node[]) => {
    if (!onUpdate || deleted.length === 0) return;

    // Process deletions sequentially on the organiser object
    let updatedOrg = organizer;
    deleted.forEach(node => {
      updatedOrg = removeStateFromOrganizer(updatedOrg, node.id);
    });

    commitUpdate(updatedOrg);
  }, [organizer, commitUpdate]);

  // -- Handle edge deletion -----------------------------------------
  const onEdgesDelete = useCallback((deleted: Edge[]) => {
    if (!onUpdate || deleted.length === 0) return;

    let updatedOrg = organizer;
    deleted.forEach(edge => {
      updatedOrg = removeTransitionFromOrganizer(updatedOrg, edge.source, edge.target);
    });
    
    commitUpdate(updatedOrg);
  }, [organizer, commitUpdate]);

  // -- Add node logic (triggered by Toolbar button) ------------------
  const handleAddNode = useCallback(() => {
    if (!onUpdate) return;
    
    const newStateName = `State_${organizer.states.length + 1}`;
    const newState: FSMState = {
      name: newStateName,
      goalInvocation: { goalReference: '', type: 'task', actualArguments: [] }
    };

    commitUpdate(addStateToOrganizer(organizer, newState));
  }, [organizer, commitUpdate]);

  // -- Add node on canvas right-click -------------------------------
  const onPaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    if (!onUpdate) return;

    // Convert screen coords → flow coords using screenToFlowPosition()
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const newStateName = `State_${organizer.states.length}`;

    // Build a new state skeleton, call addStateToOrganizer(), call onUpdate()
    const newState: FSMState = {
      name: newStateName,
      goalInvocation: { goalReference: '', type: 'task', actualArguments: [] }
    };

    commitUpdate(addStateToOrganizer(organizer, newState));
  }, [organizer, commitUpdate, screenToFlowPosition]);

  // -- Node RMB context menu ----------------------------------------
  const handleMenuClose = useCallback(() => {
    setMenuAnchor(null);
    setSelectedNode(null);
  }, []);

  const handleSetStateType = useCallback((type: 'start' | 'success' | 'failure') => {
    if (selectedNode && onUpdate) {
      const updatedOrg = { ...organizer };
      const nodeId = selectedNode.id;

      // 1. Clear this specific node if it currently occupies another role
      if (updatedOrg.startState   === nodeId) updatedOrg.startState   = '';
      if (updatedOrg.successState === nodeId) updatedOrg.successState = '';
      if (updatedOrg.failureState === nodeId) updatedOrg.failureState = '';

      // 2. Assign the new role (overwriting whoever had it previously)
      if (type === 'start')   updatedOrg.startState   = nodeId;
      if (type === 'success') updatedOrg.successState = nodeId;
      if (type === 'failure') updatedOrg.failureState = nodeId;

      commitUpdate(updatedOrg);
    }
    handleMenuClose();
  }, [selectedNode, organizer, commitUpdate, handleMenuClose]);

  // -- Rename state -------------------------------------------------
  const handleOpenRename = useCallback(() => {
    if (!selectedNode) return;
    const pos = menuAnchor ? { top: menuAnchor.mouseY, left: menuAnchor.mouseX } : null;
    // Capture the id before closing:
    setRenameOldName(selectedNode.id); // stable — won't be cleared by handleMenuClose
    setRenameValue(selectedNode.id);
    setRenamePos(pos);
    handleMenuClose();                 // this nulls selectedNode
  }, [selectedNode, menuAnchor, handleMenuClose]);

  const handleRenameConfirm = useCallback(() => {
    if (!renameOldName || !onUpdate || !renameValue.trim()) {
      setRenamePos(null);
      return;
    }

    const oldName = renameOldName;
    const newName = renameValue.trim();
    if (oldName === newName) { setRenamePos(null); return; }

    // Rename everywhere: states array, transitions, and the special name fields
    const updatedOrg: Organizer = {
      ...organizer,
      startState:   organizer.startState   === oldName ? newName : organizer.startState,
      successState: organizer.successState === oldName ? newName : organizer.successState,
      failureState: organizer.failureState === oldName ? newName : organizer.failureState,
      states: (organizer.states || []).map(s =>
        s.name === oldName ? { ...s, name: newName } : s
      ),
      transitions: (organizer.transitions || []).map(t => ({
        ...t,
        sourceState: t.sourceState === oldName ? newName : t.sourceState,
        targetState: t.targetState === oldName ? newName : t.targetState,
      })),
    };

    commitUpdate(updatedOrg);
    setRenamePos(null);
    setRenameOldName('');
  }, [renameOldName, renameValue, organizer, commitUpdate]);

  // -- Handle node right-click to set state type --------------------
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      if (!onUpdate) return;

      setSelectedNode(node);
      setMenuAnchor({
        mouseX: event.clientX,
        mouseY: event.clientY,
      });
    },
    [onUpdate]
  );

  // -- LMB on edge → open condition editor popover ------------------
  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      if (!onUpdate) return;
      setConditionEdge(edge as Edge<FSMEdgeData>);
      setConditionValue((edge.data as FSMEdgeData)?.condition ?? '');
      setConditionPos({ top: event.clientY, left: event.clientX });
    },
    [onUpdate]
  );

  const handleConditionConfirm = useCallback(() => {
    if (!conditionEdge || !onUpdate) { setConditionPos(null); return; }

    // Find the matching transition and update its dataCondition
    const updatedOrg: Organizer = {
      ...organizer,
      transitions: (organizer.transitions || []).map(t => {
        if (t.sourceState === conditionEdge.source && t.targetState === conditionEdge.target) {
          return { ...t, dataCondition: conditionValue };
        }
        return t;
      }),
    };

    commitUpdate(updatedOrg);
    setConditionPos(null);
    setConditionEdge(null);
  }, [conditionEdge, conditionValue, organizer, commitUpdate]);

  const handleDirectionChange = useCallback((newDir: LayoutDirection) => {
    setDirection(newDir);
    // The useEffect above will re-sync nodes/edges automatically
    // because direction is part of the organizerToFlow memo dependency.
  }, []);

  // If we have an organizer but no valid states yet, 
  // show a friendlier message than a blank grid.
  if (nodes.length === 0) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7f849c' }}>
        Add states in the form to begin visualization.
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display:       'flex',
        flexDirection: 'column',
        width:         '100%',
        height:        '100%',
        background:    '#181825',   // Catppuccin Mocha base
        borderRadius:  '8px',
        overflow:      'hidden',
      }}
    >
      {/* Toolbar sits above the canvas, inside the ReactFlowProvider */}
      <FSMToolbar
        direction={direction}
        onDirectionChange={handleDirectionChange}
        methodName={methodName}
        onAddNode={handleAddNode}
        onDeleteSelected={() => {
          // React Flow's internal state handles selection; 
          // we trigger deletion via keyboard or a UI button calling nodes.filter(n => n.selected)
          const selectedNodes = nodes.filter(n => n.selected);
          const selectedEdges = edges.filter(e => e.selected);
          onNodesDelete(selectedNodes);
          onEdgesDelete(selectedEdges);
        }}
      />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onPaneContextMenu={onPaneContextMenu} // Added for right-click to add node
        onNodeContextMenu={onNodeContextMenu} // For right-click node type selection & rename
        onEdgeClick={onEdgeClick}             // LMB on edge → edit condition
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        // Prevent accidental node deletion with keyboard in read-only mode.
        // Set to true when interactive editing is enabled.
        deleteKeyCode="Delete" // Enable keyboard deletion
        selectionKeyCode="Shift" // Good for bulk delete
        // Snap to grid gives a cleaner look when dragging nodes (future).
        snapToGrid
        snapGrid={[16, 16]}
        // Styling overrides
        style={{ background: '#181825' }}
        proOptions={{ hideAttribution: true }}  // remove RF watermark (requires license or self-host)
      >
        {/* Built-in controls (zoom buttons, fullscreen) */}
        <Controls
          style={{
            background: '#1e1e2e',
            border:     '1px solid #313244',
            borderRadius: '6px',
          }}
        />

        {/* Mini-map — useful once graphs grow large */}
        <MiniMap
          nodeColor={(n) => {
            switch (n.data?.stateType) {
              case 'start':   return '#a6e3a1';
              case 'success': return '#2e7d32';
              case 'failure': return '#c62828';
              default:        return '#89b4fa';
            }
          }}
          maskColor="rgba(24,24,37,0.75)"
          style={{
            background: '#1e1e2e',
            border:     '1px solid #313244',
          }}
        />

        {/* Dot-grid background */}
        <Background
          color="#313244"
          gap={20}
          size={1}
          variant={BackgroundVariant.Dots}
        />
      </ReactFlow>

      {/* --- Node RMB context menu --- */}
      <Menu
        open={menuAnchor !== null}
        onClose={handleMenuClose}
        anchorReference="anchorPosition"
        // Spread the property only if it exists so the key is missing when null.
        // This satisfies 'exactOptionalPropertyTypes: true'.
        {...(menuAnchor && { 
          anchorPosition: { top: menuAnchor.mouseY, left: menuAnchor.mouseX } 
        })}
        slotProps={{
          paper: {
            sx: { 
              background: '#1e1e2e', 
              color: '#cdd6f4',
              border: '1px solid #313244',
              minWidth: 200,
            }
          }
        }}
      >
        {/* Rename */}
        <MenuItem onClick={handleOpenRename}>
          <ListItemIcon><EditIcon sx={{ color: '#89b4fa' }} fontSize="small" /></ListItemIcon>
          <ListItemText primary="Rename state" />
        </MenuItem>

        <Divider sx={{ borderColor: '#313244', my: 0.5 }} />

        <MenuItem onClick={() => handleSetStateType('start')}>
          <ListItemIcon><PlayArrow sx={{ color: '#a6e3a1' }} fontSize="small" /></ListItemIcon>
          <ListItemText primary="Set as Start State" />
        </MenuItem>
        <MenuItem onClick={() => handleSetStateType('success')}>
          <ListItemIcon><CheckCircle sx={{ color: '#2e7d32' }} fontSize="small" /></ListItemIcon>
          <ListItemText primary="Set as Success State" />
        </MenuItem>
        <MenuItem onClick={() => handleSetStateType('failure')}>
          <ListItemIcon><Error sx={{ color: '#c62828' }} fontSize="small" /></ListItemIcon>
          <ListItemText primary="Set as Failure State" />
        </MenuItem>
      </Menu>

      {/* --- Rename popover (anchored to a positioned ghost div) --- */}
      {renamePos && (
        <div
          style={{
            position: 'fixed',
            top:      renamePos.top,
            left:     renamePos.left,
            width:    1,
            height:   1,
            pointerEvents: 'none',
          }}
          ref={renameAnchorRef}
        />
      )}
      <Popover
        open={renamePos !== null}
        anchorReference="anchorPosition"
        {...(renamePos && {
          anchorPosition: { top: renamePos.top, left: renamePos.left }
        })}
        onClose={() => setRenamePos(null)}
        PaperProps={{
          sx: {
            background: '#1e1e2e',
            border: '1px solid #313244',
            p: 2,
            minWidth: 260,
          }
        }}
      >
        <Typography variant="caption" sx={{ color: '#7f849c', display: 'block', mb: 1 }}>
          Rename state
        </Typography>
        <TextField
          size="small"
          fullWidth
          autoFocus
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter')  handleRenameConfirm();
            if (e.key === 'Escape') setRenamePos(null);
          }}
          inputProps={{ style: { fontFamily: 'monospace', color: '#cdd6f4' } }}
          sx={{
            mb: 1,
            '& .MuiOutlinedInput-root': {
              '& fieldset':        { borderColor: '#313244' },
              '&:hover fieldset':  { borderColor: '#89b4fa' },
              '&.Mui-focused fieldset': { borderColor: '#89b4fa' },
            },
          }}
        />
        <Box display="flex" gap={1} justifyContent="flex-end">
          <Button size="small" onClick={() => setRenamePos(null)}
            sx={{ color: '#7f849c' }}>
            Cancel
          </Button>
          <Button size="small" variant="contained" onClick={handleRenameConfirm}
            sx={{ background: '#89b4fa', color: '#1e1e2e', '&:hover': { background: '#cdd6f4' } }}>
            Rename
          </Button>
        </Box>
      </Popover>

      {/* --- Edge LMB condition editor popover --- */}
      <Popover
        open={conditionPos !== null}
        anchorReference="anchorPosition"
        {...(conditionPos && {
          anchorPosition: { top: conditionPos.top, left: conditionPos.left }
        })}
        onClose={() => { setConditionPos(null); setConditionEdge(null); }}
        PaperProps={{
          sx: {
            background: '#1e1e2e',
            border: '1px solid #313244',
            p: 2,
            minWidth: 300,
          }
        }}
      >
        <Typography variant="caption" sx={{ color: '#7f849c', display: 'block', mb: 0.5 }}>
          Data condition
        </Typography>
        {conditionEdge && (
          <Typography variant="caption" sx={{ color: '#89b4fa', fontFamily: 'monospace', display: 'block', mb: 1 }}>
            {conditionEdge.source} → {conditionEdge.target}
          </Typography>
        )}
        <TextField
          size="small"
          fullWidth
          autoFocus
          multiline
          minRows={2}
          placeholder="e.g. !diagnosis.confirmed && retryCount < 3"
          value={conditionValue}
          onChange={(e) => setConditionValue(e.target.value)}
          onKeyDown={(e) => {
            // Ctrl+Enter confirms; plain Enter allows newlines in the condition
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleConditionConfirm();
            if (e.key === 'Escape') { setConditionPos(null); setConditionEdge(null); }
          }}
          inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.8rem', color: '#cdd6f4' } }}
          sx={{
            mb: 1,
            '& .MuiOutlinedInput-root': {
              '& fieldset':        { borderColor: '#313244' },
              '&:hover fieldset':  { borderColor: '#89b4fa' },
              '&.Mui-focused fieldset': { borderColor: '#89b4fa' },
            },
          }}
        />
        <Typography variant="caption" sx={{ color: '#585b70', display: 'block', mb: 1 }}>
          Ctrl+Enter to confirm
        </Typography>
        <Box display="flex" gap={1} justifyContent="flex-end">
          <Button size="small" onClick={() => { setConditionPos(null); setConditionEdge(null); }}
            sx={{ color: '#7f849c' }}>
            Cancel
          </Button>
          <Button size="small" variant="contained" onClick={handleConditionConfirm}
            sx={{ background: '#89b4fa', color: '#1e1e2e', '&:hover': { background: '#cdd6f4' } }}>
            Save
          </Button>
        </Box>
      </Popover>
    </Box>
  );
}

// --- Public export — wraps canvas in a ReactFlowProvider ---------------------
export default function FSMView({ organizer, methodName, onUpdate }: FSMViewProps) {
  if (!organizer) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        height="100%"
        sx={{ color: '#7f849c', fontFamily: 'monospace', fontSize: '0.85rem' }}
      >
        No organizer data to display.
      </Box>
    );
  }

  return (
    // ReactFlowProvider makes useReactFlow() available to children
    // (specifically FSMToolbar's fitView / zoomIn / zoomOut calls).
    <ReactFlowProvider>
      <FSMCanvas
        organizer={organizer}
        methodName={methodName}
        onUpdate={onUpdate}
      />
    </ReactFlowProvider>
  );
}
