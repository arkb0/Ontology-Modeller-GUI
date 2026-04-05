import React, { useCallback, memo } from 'react';
import {
  Paper, Box, Typography, IconButton, Tooltip,
  Accordion, AccordionSummary, AccordionDetails,
  Divider, Switch, FormControlLabel
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { replaceAt, removeAt } from '../../utils/helpers';
import DebouncedTextField from '../common/DebouncedTextField';
import StringListField from '../common/StringListField';
import AssertionEntryFields from '../common/AssertionEntryFields';

interface StateEntryProps {
  state: any;
  onChange: (updated: any) => void;
  onRemove: () => void;
}

/**
 * Renders a single FSM state entry within the organiser.
 */
const StateEntryFields = memo(function StateEntryFields({ state, onChange, onRemove }: StateEntryProps) {
  const update = useCallback((field: string, value: any) => {
    onChange({ ...state, [field]: value });
  }, [state, onChange]);

  const updateGoalInvocation = useCallback((field: string, value: any) => {
    const gi = state.goalInvocation || { goalReference: '', type: '', actualArguments: [] };
    onChange({ ...state, goalInvocation: { ...gi, [field]: value } });
  }, [state, onChange]);

  const gi = state.goalInvocation || {};

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 1 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle2" color="textSecondary">State</Typography>
        <Tooltip title="Remove this state">
          <IconButton size="small" onClick={onRemove} color="error">
            <RemoveCircleOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <DebouncedTextField
        label="State Name"
        size="small"
        fullWidth
        value={state.name || ''}
        onChange={(val: string) => update('name', val)}
        sx={{ mb: 1, mt: 1 }}
      />
      <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
        Goal Invocation
      </Typography>
      <Box sx={{ pl: 2 }}>
        <DebouncedTextField
          label="Goal Reference"
          size="small"
          fullWidth
          value={gi.goalReference || ''}
          onChange={(val: string) => updateGoalInvocation('goalReference', val)}
          sx={{ mb: 1 }}
        />
        <DebouncedTextField
          label="Type"
          size="small"
          fullWidth
          value={gi.type || ''}
          onChange={(val: string) => updateGoalInvocation('type', val)}
          sx={{ mb: 1 }}
        />
        <StringListField
          label="Actual Arguments"
          values={gi.actualArguments || []}
          onChange={(v: string[]) => updateGoalInvocation('actualArguments', v)}
          placeholder="Argument"
        />
      </Box>
    </Paper>
  );
});

interface TransitionEntryProps {
  transition: any;
  onChange: (updated: any) => void;
  onRemove: () => void;
}

/**
 * Renders a single FSM transition entry within the organiser.
 */
const TransitionEntryFields = memo(function TransitionEntryFields({ transition, onChange, onRemove }: TransitionEntryProps) {
  const update = useCallback((field: string, value: any) => {
    onChange({ ...transition, [field]: value });
  }, [transition, onChange]);

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 1 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle2" color="textSecondary">Transition</Typography>
        <Tooltip title="Remove this transition">
          <IconButton size="small" onClick={onRemove} color="error">
            <RemoveCircleOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <DebouncedTextField
        label="Source State"
        size="small"
        fullWidth
        value={transition.sourceState || ''}
        onChange={(val: string) => update('sourceState', val)}
        sx={{ mb: 1, mt: 1 }}
      />
      <DebouncedTextField
        label="Target State"
        size="small"
        fullWidth
        value={transition.targetState || ''}
        onChange={(val: string) => update('targetState', val)}
        sx={{ mb: 1 }}
      />
      <DebouncedTextField
        label="Data Condition"
        size="small"
        fullWidth
        value={transition.dataCondition || ''}
        onChange={(val: string) => update('dataCondition', val)}
      />
    </Paper>
  );
});

interface OrganizerProps {
  organizer: any;
  onChange: (updated: any) => void;
}

/**
 * Renders the organiser (FSM) section for a non-atomic method.
 */
const OrganizerFields = memo(function OrganizerFields({ organizer, onChange }: OrganizerProps) {
  const org = organizer || {
    startState: '',
    successState: '',
    failureState: '',
    states: [],
    transitions: []
  };

  const update = useCallback((field: string, value: any) => {
    onChange({ ...org, [field]: value });
  }, [org, onChange]);

  const addState = useCallback(() => {
    update('states', [...(org.states || []), {
      name: '',
      goalInvocation: { goalReference: '', type: '', actualArguments: [] }
    }]);
  }, [org, update]);

  const addTransition = useCallback(() => {
    update('transitions', [...(org.transitions || []), {
      sourceState: '',
      targetState: '',
      dataCondition: ''
    }]);
  }, [org, update]);

  return (
    <Box sx={{ pl: 2, borderLeft: '3px solid', borderColor: 'primary.main', mb: 2 }}>
      <Typography variant="subtitle1" color="primary" gutterBottom>
        Organiser (Finite State Machine)
      </Typography>
      <DebouncedTextField
        label="Start State"
        size="small"
        fullWidth
        value={org.startState || ''}
        onChange={(val: string) => update('startState', val)}
        sx={{ mb: 1 }}
      />
      <DebouncedTextField
        label="Success State"
        size="small"
        fullWidth
        value={org.successState || ''}
        onChange={(val: string) => update('successState', val)}
        sx={{ mb: 1 }}
      />
      <DebouncedTextField
        label="Failure State"
        size="small"
        fullWidth
        value={org.failureState || ''}
        onChange={(val: string) => update('failureState', val)}
        sx={{ mb: 2 }}
      />

      {/* States */}
      <Box display="flex" alignItems="center" mb={1}>
        <Typography variant="subtitle2" color="textSecondary">States</Typography>
        <Tooltip title="Add a new state">
          <IconButton size="small" color="primary" onClick={addState}>
            <AddCircleOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      {(org.states || []).map((s: any, sIdx: number) => (
        <StateEntryFields
          key={sIdx}
          state={s}
          onChange={(updated) => update('states', replaceAt(org.states || [], sIdx, updated))}
          onRemove={() => update('states', removeAt(org.states || [], sIdx))}
        />
      ))}

      {/* Transitions */}
      <Box display="flex" alignItems="center" mb={1} mt={2}>
        <Typography variant="subtitle2" color="textSecondary">Transitions</Typography>
        <Tooltip title="Add a new transition">
          <IconButton size="small" color="primary" onClick={addTransition}>
            <AddCircleOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      {(org.transitions || []).map((t: any, tIdx: number) => (
        <TransitionEntryFields
          key={tIdx}
          transition={t}
          onChange={(updated) => update('transitions', replaceAt(org.transitions || [], tIdx, updated))}
          onRemove={() => update('transitions', removeAt(org.transitions || [], tIdx))}
        />
      ))}
    </Box>
  );
});

interface MethodEntryProps {
  method: any;
  onChange: (updated: any) => void;
  onRemove: () => void;
  index: number;
}

/**
 * Renders the form fields for a single Method object.
 */
const MethodEntryFields = memo(function MethodEntryFields({ method, onChange, onRemove, index }: MethodEntryProps) {
  const hasOrganizer = !!method.organizer;

  const update = useCallback((field: string, value: any) => {
    onChange({ ...method, [field]: value });
  }, [method, onChange]);

  const addAssertion = useCallback(() => {
    update('assertions', [...(method.assertions || []), { name: '', description: '', equivalentTo: '' }]);
  }, [method, update]);

  const toggleOrganizer = useCallback(() => {
    if (hasOrganizer) {
      const { organizer, ...rest } = method;
      onChange(rest);
    } else {
      update('organizer', {
        startState: '',
        successState: '',
        failureState: '',
        states: [],
        transitions: []
      });
    }
  }, [hasOrganizer, method, onChange, update]);

  return (
    <Accordion defaultExpanded={false} TransitionProps={{ unmountOnExit: true }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
          <Typography variant="subtitle1">
            Method #{index + 1}{method.name ? `: ${method.name}` : ''}
            <Typography component="span" variant="caption" sx={{ ml: 1, opacity: 0.7 }}>
              ({hasOrganizer ? 'Non-atomic' : 'Atomic'})
            </Typography>
          </Typography>
          <Tooltip title="Remove this method">
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              color="error"
            >
              <RemoveCircleOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <DebouncedTextField
          label="Name"
          size="small"
          fullWidth
          value={method.name || ''}
          onChange={(val: string) => update('name', val)}
          sx={{ mb: 2 }}
        />
        <DebouncedTextField
          label="Description"
          size="small"
          fullWidth
          multiline
          minRows={2}
          value={method.description || ''}
          onChange={(val: string) => update('description', val)}
          sx={{ mb: 2 }}
        />
        <StringListField
          label="Input Parameters"
          values={method.inputParameters || []}
          onChange={(v: string[]) => update('inputParameters', v)}
          placeholder="Parameter name"
        />
        <StringListField
          label="Output Parameters"
          values={method.outputParameters || []}
          onChange={(v: string[]) => update('outputParameters', v)}
          placeholder="Parameter name"
        />
        <DebouncedTextField
          label="Requires (precondition)"
          size="small"
          fullWidth
          value={method.requires || ''}
          onChange={(val: string) => update('requires', val)}
          sx={{ mb: 2 }}
        />
        <DebouncedTextField
          label="Provides (postcondition)"
          size="small"
          fullWidth
          value={method.provides || ''}
          onChange={(val: string) => update('provides', val)}
          sx={{ mb: 2 }}
        />

        {/* Assertions */}
        <Box mb={2}>
          <Box display="flex" alignItems="center" mb={1}>
            <Typography variant="subtitle2" color="textSecondary">Assertions</Typography>
            <Tooltip title="Add an assertion">
              <IconButton size="small" color="primary" onClick={addAssertion}>
                <AddCircleOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          {(method.assertions || []).map((a: any, aIdx: number) => (
            <AssertionEntryFields
              key={aIdx}
              assertion={a}
              onChange={(updated: any) => update('assertions', replaceAt(method.assertions || [], aIdx, updated))}
              onRemove={() => update('assertions', removeAt(method.assertions || [], aIdx))}
            />
          ))}
        </Box>

        <Divider sx={{ my: 2 }} />

        <FormControlLabel
          control={<Switch checked={hasOrganizer} onChange={toggleOrganizer} />}
          label="Non-atomic (has FSM organiser)"
          sx={{ mb: 2 }}
        />

        {hasOrganizer && (
          <OrganizerFields
            organizer={method.organizer}
            onChange={(updated) => update('organizer', updated)}
          />
        )}
      </AccordionDetails>
    </Accordion>
  );
});

export default MethodEntryFields;
