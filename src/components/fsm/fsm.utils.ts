/**
 * fsm.utils.ts
 * Converts an FSM organizer object (from the Method JSON) into
 * React Flow nodes and edges, with automatic dagre layout.
 *
 * Layout strategy: left-to-right dagre (TB also works — see LAYOUT_DIRECTION).
 * All positional values are in pixels; React Flow handles the canvas transform.
 */

import dagre from 'dagre';

import { Node, Edge } from 'reactflow';

// --- Domain types -------------------------------------------------------------

export type LayoutDirection = 'LR' | 'TB';

export interface GoalInvocation {
  goalReference: string;
  type:          string;
  actualArguments: string[];
}

export interface FSMState {
  name:            string;
  goalInvocation?: GoalInvocation;
}

export interface FSMTransition {
  sourceState:   string;
  targetState:   string;
  dataCondition?: string;
}

export interface Organizer {
  startState:   string;
  successState: string;
  failureState: string;
  states:       FSMState[];
  transitions:  FSMTransition[];
}

export interface MethodEntry {
  name:          string;
  description?:  string;
  organizer?:    Organizer;
  [key: string]: unknown;   // allow other Method fields through
}

export interface MethodDocument {
  model:   'Method';
  methods: MethodEntry[];
}

// --- React Flow data payloads -------------------------------------------------

export type StateType = 'start' | 'success' | 'failure' | 'default';
export type EdgeType  = 'success' | 'failure' | 'normal';

export interface FSMNodeData {
  stateName:  string;
  stateType:  StateType;
  label:      string;
  goalRef:    string;
  goalType:   string;
  args:       string[];
}

export interface FSMEdgeData {
  condition:      string;
  conditionShort: string;
  edgeType:       EdgeType;
}

export interface FlowGraph {
  nodes: Node<FSMNodeData>[];
  edges: Edge<FSMEdgeData>[];
}

// --- Layout constants --------------------------------------------------------
const LAYOUT_DIRECTION = 'LR';   // 'LR' = left-to-right, 'TB' = top-to-bottom
const NODE_WIDTH       = 172;
const NODE_HEIGHT      = 60;
const RANK_SEP         = 80;     // horizontal gap between ranks (LR)
const NODE_SEP         = 40;     // vertical gap between nodes in same rank

// --- Node type classification -------------------------------------------------
/**
 * Returns one of: 'start' | 'success' | 'failure' | 'default'
 * Used by FSMNode to pick the correct visual style.
 */
export function classifyState(stateName: string, organizer: Organizer): StateType {
  if (stateName === organizer.startState)   return 'start';
  if (stateName === organizer.successState) return 'success';
  if (stateName === organizer.failureState) return 'failure';
  return 'default';
}

// --- Core converter -----------------------------------------------------------
/**
 * organizerToFlow(organizer)
 *
 * @param {object} organizer  – the `organizer` block from a Method entry
 * @returns {{ nodes: RFNode[], edges: RFEdge[] }}
 *
 * Nodes carry:
 *   data.label        – display name (state name, possibly shortened)
 *   data.stateType    – 'start' | 'success' | 'failure' | 'default'
 *   data.goalRef      – goalReference string from goalInvocation
 *   data.goalType     – type string ('task' | 'method' | …)
 *   data.args         – actualArguments array
 *   data.stateName    – raw state name (stable identifier for updates)
 *
 * Edges carry:
 *   data.condition    – raw dataCondition string
 *   data.conditionShort – truncated label for display
 */
export function organizerToFlow(organizer: Organizer | null | undefined, direction: LayoutDirection = LAYOUT_DIRECTION): FlowGraph {
  // 1. Guard against null organizer
  if (!organizer) return { nodes: [], edges: [] };

  const { states = [], transitions = [] } = organizer;

  // 2. Extract valid state names into a Set for O(1) lookup
  // This ensures we only attempt to draw edges between existing nodes.
  const existingStateNames = new Set(states.map(s => s.name).filter(Boolean));

  // Build a lookup: stateName → state object
  // const stateMap = Object.fromEntries(states.map(s => [s.name, s]));

  // -- Raw nodes (no positions yet) ------------------------------------------
  const rawNodes = states
    .filter(state => state && state.name) // Ensure the state has a name before rendering
    .map(state => ({
      id:   state.name,
      type: 'fsmNode',                          // maps to our custom node type
      data: {
        stateName:  state.name,
        stateType:  classifyState(state.name, organizer),
        label:      shortenStateName(state.name),
        goalRef:    state.goalInvocation?.goalReference  ?? 'Unassigned',
        goalType:   state.goalInvocation?.type            ?? 'task',
        args:       state.goalInvocation?.actualArguments ?? [],
      },
      // position is filled in by layoutNodes()
      position: { x: 0, y: 0 },
    }));

  // -- Raw edges -------------------------------------------------------------
  const rawEdges = transitions
    .filter(t => 
      t.sourceState && 
      t.targetState && 
      existingStateNames.has(t.sourceState) && 
      existingStateNames.has(t.targetState)
    ) // CRITICAL: Only render edges if BOTH source and target states exist
    .map((t, i) => {
      const cond = t.dataCondition ?? '';
      return {
        id:      `e-${t.sourceState}-${t.targetState}-${i}`,
        source: t.sourceState,
        target: t.targetState,
        type:    'fsmEdge',                       // maps to our custom edge type
        // React Flow uses markerEnd for arrowheads; defined in FSMView
        markerEnd: { type: 'arrowclosed' },
        data: {
          condition:      cond,
          conditionShort: shortenCondition(cond),
          // Classify edge for colouring: failure branches are red, success green
          edgeType: deriveEdgeType(t.targetState, organizer),
        },
      };
    });

  // 3. Prevent layout engine crashes if there are no nodes
  if (rawNodes.length === 0) return { nodes: [], edges: [] };

  // -- Apply dagre layout ----------------------------------------------------
  const positioned = layoutNodes(rawNodes, rawEdges as Edge<FSMEdgeData>[], direction);

  return positioned;
}

// --- Dagre auto-layout --------------------------------------------------------
function layoutNodes(nodes: Node<FSMNodeData>[], edges: Edge<FSMEdgeData>[], direction: LayoutDirection): FlowGraph {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    ranksep: RANK_SEP,
    nodesep: NODE_SEP,
  });

  // 1. Register all valid nodes
  nodes.forEach(n => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));

  // 2. Only add edges if both ends exist in the graph
  edges.forEach(e => {
    if (g.hasNode(e.source) && g.hasNode(e.target)) {
      g.setEdge(e.source, e.target);
    } else {
      console.warn(`Skipping edge ${e.id}: Source (${e.source}) or Target (${e.target}) not found.`);
    }
  });

  dagre.layout(g);

  const positionedNodes = nodes.map(n => {
    const pos = g.node(n.id);
    return {
      ...n,
      position: {
        x: pos.x - NODE_WIDTH  / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: positionedNodes, edges };
}

// --- Helpers ------------------------------------------------------------------

/**
 * Strips common prefixes so node labels don't overflow.
 * e.g. "SNS_S0" → "SNS_S0"  (short enough already)
 *      "DeterminePrincipalCharacteristicGroup" → kept as-is (shown in tooltip)
 */
function shortenStateName(name: string): string {
  // State names in the JSON are already short identifiers like SNS_S0.
  // If someone uses long names, truncate with ellipsis.
  return name.length > 20 ? name.slice(0, 18) + '…' : name;
}

/**
 * Truncates a dataCondition string to a readable edge label.
 * Full condition is preserved in data.condition for tooltips/editing.
 */
function shortenCondition(cond: string): string {
  if (!cond) return '';
  // Remove leading negation bang for length calculation
  const stripped = cond.replace(/^!/, '');
  const prefix   = cond.startsWith('!') ? '¬ ' : '';
  // Keep first predicate before '&&' or '||'
  const first = stripped.split(/&&|\|\|/)[0]!.trim();
  const label = prefix + (first.length > 28 ? first.slice(0, 26) + '…' : first);
  return label;
}

/**
 * Classifies an edge as 'success', 'failure', or 'normal'
 * based on where it leads.
 */
function deriveEdgeType(targetState: string, organizer: Organizer): EdgeType {
  if (targetState === organizer.successState) return 'success';
  if (targetState === organizer.failureState) return 'failure';
  return 'normal';
}

// --- Incremental update helpers (used by future interactive mode) -------------

/**
 * addStateToOrganizer(organizer, newState)
 * Returns a new organizer object with the state appended.
 * Keeps the original immutable (React-friendly).
 */
export function addStateToOrganizer(organizer: Organizer, newState: FSMState): Organizer {
  return {
    ...organizer,
    states: [...(organizer.states ?? []), newState],
  };
}

/**
 * addTransitionToOrganizer(organizer, newTransition)
 */
export function addTransitionToOrganizer(organizer: Organizer, newTransition: FSMTransition): Organizer {
  return {
    ...organizer,
    transitions: [...(organizer.transitions ?? []), newTransition],
  };
}

/**
 * removeStateFromOrganizer(organizer, stateName)
 * Also removes any transitions that reference the deleted state.
 */
export function removeStateFromOrganizer(organizer: Organizer, stateName: string): Organizer {
  return {
    ...organizer,
    states: (organizer.states ?? []).filter(s => s.name !== stateName),
    transitions: (organizer.transitions ?? []).filter(
      t => t.sourceState !== stateName && t.targetState !== stateName
    ),
  };
}

/**
 * removeTransitionFromOrganizer(organizer, edgeId)
 * edgeId format: "e-{source}-{target}-{index}"
 * We match by source+target rather than fragile index.
 */
export function removeTransitionFromOrganizer(organizer: Organizer, sourceState: string, targetState: string): Organizer {
  return {
    ...organizer,
    transitions: (organizer.transitions ?? []).filter(
      t => !(t.sourceState === sourceState && t.targetState === targetState)
    ),
  };
}
