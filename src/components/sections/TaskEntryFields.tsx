import React, { useCallback, memo } from 'react';
import {
  Paper, Box, Typography, IconButton, Tooltip,
  Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { replaceAt, removeAt } from '../../utils/helpers';
import DebouncedTextField from '../common/DebouncedTextField';
import StringListField from '../common/StringListField';

interface EntryProps<T> {
  index?: number;
  onChange: (updated: T) => void;
  onRemove: () => void;
}

/**
 * Renders a single 'means' entry (mechanism reference + actual arguments).
 */
const MeansEntryFields = memo(function MeansEntryFields({ means, onChange, onRemove }: EntryProps<any> & { means: any }) {
  const update = useCallback((field: string, value: any) => {
    onChange({ ...means, [field]: value });
  }, [means, onChange]);

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 1 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle2" color="textSecondary">Means Entry</Typography>
        <Tooltip title="Remove this means entry">
          <IconButton size="small" onClick={onRemove} color="error">
            <RemoveCircleOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Box mt={1}>
        <DebouncedTextField
          label="Mechanism Reference"
          size="small"
          fullWidth
          value={means.mechanismReference || ''}
          onChange={(val: string) => update('mechanismReference', val)}
          sx={{ mb: 1 }}
        />
        <StringListField
          label="Actual Arguments"
          values={means.actualArguments || []}
          onChange={(v: string[]) => update('actualArguments', v)}
          placeholder="Argument"
        />
      </Box>
    </Paper>
  );
});

/**
 * Renders the form fields for a single Task object.
 */
const TaskEntryFields = memo(function TaskEntryFields({ task, onChange, onRemove, index }: EntryProps<any> & { task: any, index: number }) {
  const update = useCallback((field: string, value: any) => {
    onChange({ ...task, [field]: value });
  }, [task, onChange]);

  const addMeans = useCallback(() => {
    update('means', [...(task.means || []), { mechanismReference: '', actualArguments: [] }]);
  }, [task, update]);

  return (
    <Accordion defaultExpanded={false} TransitionProps={{ unmountOnExit: true }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
          <Typography variant="subtitle1">
            Task #{index + 1}{task.name ? `: ${task.name}` : ''}
          </Typography>
          <Tooltip title="Remove this task">
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
          value={task.name || ''}
          onChange={(val: string) => update('name', val)}
          sx={{ mb: 2 }}
        />
        <DebouncedTextField
          label="Description"
          size="small"
          fullWidth
          multiline
          minRows={2}
          value={task.description || ''}
          onChange={(val: string) => update('description', val)}
          sx={{ mb: 2 }}
        />
        <StringListField
          label="Input Parameters"
          values={task.inputParameters || []}
          onChange={(v: string[]) => update('inputParameters', v)}
          placeholder="Parameter name"
        />
        <StringListField
          label="Output Parameters"
          values={task.outputParameters || []}
          onChange={(v: string[]) => update('outputParameters', v)}
          placeholder="Parameter name"
        />
        <DebouncedTextField
          label="Given (precondition)"
          size="small"
          fullWidth
          value={task.given || ''}
          onChange={(val: string) => update('given', val)}
          sx={{ mb: 2 }}
        />
        <DebouncedTextField
          label="Makes (postcondition)"
          size="small"
          fullWidth
          value={task.makes || ''}
          onChange={(val: string) => update('makes', val)}
          sx={{ mb: 2 }}
        />

        {/* Means: a dynamic list of mechanism invocations */}
        <Box mb={2}>
          <Box display="flex" alignItems="center" mb={1}>
            <Typography variant="subtitle2" color="textSecondary">Means</Typography>
            <Tooltip title="Add a means entry">
              <IconButton size="small" color="primary" onClick={addMeans}>
                <AddCircleOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          {(task.means || []).map((m: any, mIdx: number) => (
            <MeansEntryFields
              key={mIdx}
              means={m}
              onChange={(updated: any) => update('means', replaceAt(task.means || [], mIdx, updated))}
              onRemove={() => update('means', removeAt(task.means || [], mIdx))}
            />
          ))}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
});

export default TaskEntryFields;
