/**
 * Visualiser.js
 * The right-pane visualisation host.
 *
 * When viewMode is 'graph' (selected via the Tabs in FormContainer),
 * this component is rendered in place of PreviewPane.
 *
 * Behaviour:
 *   • If `data` is a single organizer object → render FSMView directly.
 *   • If `data` is a full Method model ({ model:'Method', methods:[…] }) →
 *     show a picker list of non-atomic methods (those with organizers),
 *     each with a "View FSM" button that opens FSMModal.
 *
 * This dual mode means Visualiser works whether it receives a focused
 * organizer or the entire method document.
 *
 * Props:
 *   data     {object}   – organizer OR full Method document
 *   onUpdate {function} – propagates edits upward
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  Chip,
} from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';

import FSMView  from './fsm/FSMView';
import FSMModal from './modals/FSMModal';

import {
  Organizer,
  MethodEntry,
  MethodDocument,
} from './fsm/fsm.utils';

// Acceptable shapes for the `data` prop
type VisualisableData = Organizer | MethodEntry | MethodDocument | null | undefined;

// MethodPicker props interface
interface MethodPickerProps {
  methods:  MethodEntry[];
  onOpen:   (method: MethodEntry) => void;
}

interface VisualisserProps {
  data?:     VisualisableData;
  onUpdate?: (updated: VisualisableData) => void;
}

// ─── Helper: is this a raw organizer object? ──────────────────────────────────
function isOrganizer(data: unknown): data is Organizer {
  return data && typeof data === 'object' && 'states' in data && 'transitions' in data;
}

// ─── Helper: extract non-atomic methods from a Method document ────────────────
function extractNonAtomicMethods(data: VisualisableData): MethodEntry[] {
  if (!data) return [];
  // Full Method document
  if (data.model === 'Method' && Array.isArray(data.methods)) {
    return data.methods.filter(m => m.organizer);
  }
  // Single method object passed directly
  if (data.organizer) return [data];
  return [];
}

// ─── Sub-component: method list with "View FSM" buttons ──────────────────────
function MethodPicker({ methods, onOpen }: MethodPickerProps) {
  return (
    <Box sx={{ p: 2, overflowY: 'auto', height: '100%' }}>
      <Typography
        variant="caption"
        sx={{
          color:      '#7f849c',
          fontFamily: 'monospace',
          display:    'block',
          mb:         1,
        }}
      >
        Non-atomic methods with FSM organisers
      </Typography>

      <List dense disablePadding>
        {methods.map((method) => (
          <ListItem
            key={method.name}
            disableGutters
            sx={{
              mb:           0.5,
              background:   '#1e1e2e',
              borderRadius: '6px',
              px:           1.5,
              border:       '1px solid #313244',
            }}
          >
            <ListItemText
              primary={
                <Typography
                  variant="body2"
                  sx={{ fontFamily: 'monospace', color: '#cdd6f4', fontSize: '0.8rem' }}
                >
                  {method.name}
                </Typography>
              }
              secondary={
                <Box display="flex" gap={0.5} mt={0.25} flexWrap="wrap">
                  <Chip
                    label={`${method.organizer?.states?.length ?? 0} states`}
                    size="small"
                    sx={{
                      fontSize:   '0.6rem',
                      height:     '18px',
                      background: '#313244',
                      color:      '#89b4fa',
                    }}
                  />
                  <Chip
                    label={`${method.organizer?.transitions?.length ?? 0} transitions`}
                    size="small"
                    sx={{
                      fontSize:   '0.6rem',
                      height:     '18px',
                      background: '#313244',
                      color:      '#a6e3a1',
                    }}
                  />
                </Box>
              }
            />
            <ListItemSecondaryAction>
              <Button
                size="small"
                variant="outlined"
                startIcon={<AccountTreeIcon sx={{ fontSize: '0.85rem !important' }} />}
                onClick={() => onOpen(method)}
                sx={{
                  fontSize:      '0.65rem',
                  py:            0.25,
                  px:            1,
                  borderColor:   '#89b4fa',
                  color:         '#89b4fa',
                  '&:hover': {
                    borderColor: '#cdd6f4',
                    background:  'rgba(137,180,250,0.08)',
                  },
                }}
              >
                View FSM
              </Button>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function Visualiser({ data, onUpdate }: VisualisserProps) {
  const [modalMethod, setModalMethod] = useState(null);

  // ── Case 1: single organizer passed directly ──────────────────────────────
  if (isOrganizer(data)) {
    return (
      <Box sx={{ width: '100%', height: '100%' }}>
        <FSMView
          organizer={data}
          methodName="(current organizer)"
          onUpdate={onUpdate}
        />
      </Box>
    );
  }

  // ── Case 2: full Method document or method-with-organizer ─────────────────
  const nonAtomicMethods = extractNonAtomicMethods(data);

  if (nonAtomicMethods.length === 0) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        height="100%"
        gap={1}
        sx={{ color: '#7f849c' }}
      >
        <AccountTreeIcon sx={{ fontSize: '2rem', opacity: 0.4 }} />
        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
          No FSM organisers found in this data.
        </Typography>
        <Typography variant="caption" sx={{ fontFamily: 'monospace', opacity: 0.6 }}>
          Switch to the Method tab and add an organizer, or select Graph view there.
        </Typography>
      </Box>
    );
  }

  const handleUpdate = (updatedMethod: MethodEntry): void => {
    if (!onUpdate || !data) return;
    if (data.model === 'Method' && Array.isArray(data.methods)) {
      const updatedMethods = data.methods.map(m =>
        m.name === updatedMethod.name ? updatedMethod : m
      );
      onUpdate({ ...data, methods: updatedMethods });
    } else {
      onUpdate(updatedMethod);
    }
  };

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Show inline FSMView if only one method and no modal needed,
          or the picker list for multiple methods. */}
      {nonAtomicMethods.length === 1 ? (
        // Single method: render canvas directly (no need for modal)
        <FSMView
          organizer={nonAtomicMethods[0].organizer}
          methodName={nonAtomicMethods[0].name}
          onUpdate={(org) => handleUpdate({ ...nonAtomicMethods[0], organizer: org })}
        />
      ) : (
        // Multiple methods: show picker, open selected in modal
        <MethodPicker methods={nonAtomicMethods} onOpen={setModalMethod} />
      )}

      {/* FSMModal is always mounted (cheap) but only open when modalMethod is set */}
      <FSMModal
        open={Boolean(modalMethod)}
        onClose={() => setModalMethod(null)}
        method={modalMethod}
        onUpdate={(updated) => {
          handleUpdate(updated);
          // Optionally keep modal open after update; close for now
          setModalMethod(updated);
        }}
      />
    </Box>
  );
}
