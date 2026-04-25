## TOADD

/src
|---- /components
|     |---- /fsm
|     |     |---- FSMView.js          Main FSM visualiser (React Flow wrapper)
|     |     |---- FSMNode.js          Custom node renderer (state circles)
|     |     |---- FSMEdge.js          Custom edge renderer (labelled transitions)
|     |     |---- FSMToolbar.js       Toolbar (zoom, fit, future: add/delete mode)
|     |     '---- fsm.utils.js        organizer JSON → React Flow nodes/edges
|     |
|     |---- /modals
|     |     '---- FSMModal.js         Modal wrapper for FSM view per-method
