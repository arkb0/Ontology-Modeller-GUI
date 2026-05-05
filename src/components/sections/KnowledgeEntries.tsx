import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  Paper, Box, Typography, TextField, IconButton, Tooltip,
  Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import { 
  AddCircleOutlined as AddCircleOutlineIcon, 
  ExpandMore as ExpandMoreIcon 
} from '@mui/icons-material';
import { replaceAt, removeAt } from '../../utils/helpers';
import DebouncedTextField from '../common/DebouncedTextField';
import StringListField from '../common/StringListField';
import ConfirmDeleteButton from '../common/ConfirmDeleteButton';

interface EntryProps<T> {
  index: number;
  onChange: (updated: T) => void;
  onRemove: () => void;
}

/**
 * Renders a single concept property entry (name + type pair).
 */
const ConceptPropertyFields = memo(function ConceptPropertyFields({ property, onChange, onRemove }: { property: any, onChange: (val: any) => void, onRemove: () => void }) {
  const update = useCallback((field: string, value: string) => {
    onChange({ ...property, [field]: value });
  }, [property, onChange]);

  return (
    <Box display="flex" alignItems="center" gap={1} mb={1}>
      <DebouncedTextField
        label="Property Name"
        size="small"
        value={property.name || ''}
        onChange={(val) => update('name', val)}
        sx={{ flex: 1 }}
      />
      <DebouncedTextField
        label="Type"
        size="small"
        value={property.type || ''}
        onChange={(val) => update('type', val)}
        sx={{ flex: 1 }}
      />
      <ConfirmDeleteButton
        onConfirm={onRemove}
        tooltip="Remove this property"
        message="Remove this property?"
      />
    </Box>
  );
});

/**
 * Renders the form fields for a single Concept object.
 */
export const ConceptEntryFields = memo(function ConceptEntryFields({ concept, onChange, onRemove, index }: EntryProps<any> & { concept: any }) {
  const update = useCallback((field: string, value: any) => {
    onChange({ ...concept, [field]: value });
  }, [concept, onChange]);

  const addProperty = useCallback(() => {
    update('properties', [...(concept.properties || []), { name: '', type: '' }]);
  }, [concept, update]);

  return (
    <Accordion defaultExpanded={false} TransitionProps={{ unmountOnExit: true }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
          <Typography variant="subtitle1">
            Concept #{index + 1}{concept.name ? `: ${concept.name}` : ''}
          </Typography>
          <ConfirmDeleteButton
            onConfirm={onRemove}
            tooltip="Remove this concept"
            message="Remove this concept and all its properties?"
          />
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <DebouncedTextField
          label="Name"
          size="small"
          fullWidth
          value={concept.name || ''}
          onChange={(val) => update('name', val)}
          sx={{ mb: 2 }}
        />
        <DebouncedTextField
          label="Description"
          size="small"
          fullWidth
          multiline
          minRows={2}
          value={concept.description || ''}
          onChange={(val) => update('description', val)}
          sx={{ mb: 2 }}
        />
        <StringListField
          label="Super Concepts"
          values={concept.superConcept || []}
          onChange={(v) => update('superConcept', v)}
          placeholder="Super concept name"
        />

        {/* Concept properties (name/type pairs) */}
        <Box mb={2}>
          <Box display="flex" alignItems="center" mb={1}>
            <Typography variant="subtitle2" color="textSecondary">Properties</Typography>
            <Tooltip title="Add a property">
              <IconButton size="small" color="primary" onClick={addProperty}>
                <AddCircleOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          {(concept.properties || []).map((p: any, pIdx: number) => (
            <ConceptPropertyFields
              key={pIdx}
              property={p}
              onChange={(updated) => update('properties', replaceAt(concept.properties || [], pIdx, updated))}
              onRemove={() => update('properties', removeAt(concept.properties || [], pIdx))}
            />
          ))}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
});

/**
 * Renders the form fields for a single Instance object.
 */
export const InstanceEntryFields = memo(function InstanceEntryFields({ instance, onChange, onRemove, index }: EntryProps<any> & { instance: any }) {
  const update = useCallback((field: string, value: any) => {
    onChange({ ...instance, [field]: value });
  }, [instance, onChange]);

  const [valuesText, setValuesText] = useState(
    instance.values ? JSON.stringify(instance.values, null, 2) : ''
  );
  const [valuesError, setValuesError] = useState(false);

  useEffect(() => {
    setValuesText(instance.values ? JSON.stringify(instance.values, null, 2) : '');
  }, [instance.values]);

  const handleValuesChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setValuesText(text);
    if (text.trim() === '') {
      setValuesError(false);
      update('values', undefined);
      return;
    }
    try {
      const parsed = JSON.parse(text);
      setValuesError(false);
      update('values', parsed);
    } catch {
      setValuesError(true);
    }
  }, [update]);

  return (
    <Accordion defaultExpanded={false} TransitionProps={{ unmountOnExit: true }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
          <Typography variant="subtitle1">
            Instance #{index + 1}{instance.name ? `: ${instance.name}` : ''}
          </Typography>
          <ConfirmDeleteButton
            onConfirm={onRemove}
            tooltip="Remove this instance"
            message="Remove this instance?"
          />
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <DebouncedTextField
          label="Name"
          size="small"
          fullWidth
          value={instance.name || ''}
          onChange={(val) => update('name', val)}
          sx={{ mb: 2 }}
        />
        <DebouncedTextField
          label="Concept"
          size="small"
          fullWidth
          value={instance.concept || ''}
          onChange={(val) => update('concept', val)}
          sx={{ mb: 2 }}
        />
        <TextField
          label="Values (JSON object)"
          size="small"
          fullWidth
          multiline
          minRows={3}
          value={valuesText}
          onChange={handleValuesChange}
          error={valuesError}
          helperText={valuesError ? 'Invalid JSON — please enter a valid object, e.g. {"key": "value"}' : ''}
          sx={{ mb: 2 }}
        />
      </AccordionDetails>
    </Accordion>
  );
});

/**
 * Renders the form fields for a single Relation object.
 */
export const RelationEntryFields = memo(function RelationEntryFields({ relation, onChange, onRemove, index }: EntryProps<any> & { relation: any }) {
  const update = useCallback((field: string, value: string) => {
    onChange({ ...relation, [field]: value });
  }, [relation, onChange]);

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 1 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle2" color="textSecondary">
          Relation #{index + 1}{relation.name ? `: ${relation.name}` : ''}
        </Typography>
        <ConfirmDeleteButton
          onConfirm={onRemove}
          tooltip="Remove this relation"
          message="Remove this relation?"
        />
      </Box>
      <DebouncedTextField
        label="Name"
        size="small"
        fullWidth
        value={relation.name || ''}
        onChange={(val) => update('name', val)}
        sx={{ mb: 1, mt: 1 }}
      />
      <DebouncedTextField
        label="Domain"
        size="small"
        fullWidth
        value={relation.domain || ''}
        onChange={(val) => update('domain', val)}
        sx={{ mb: 1 }}
      />
      <DebouncedTextField
        label="Range"
        size="small"
        fullWidth
        value={relation.range || ''}
        onChange={(val) => update('range', val)}
      />
    </Paper>
  );
});

/**
 * Renders the form fields for a single Triple object.
 */
export const TripleEntryFields = memo(function TripleEntryFields({ triple, onChange, onRemove, index }: EntryProps<any> & { triple: any }) {
  const update = useCallback((field: string, value: string) => {
    onChange({ ...triple, [field]: value });
  }, [triple, onChange]);

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 1 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle2" color="textSecondary">
          Triple #{index + 1}
        </Typography>
        <ConfirmDeleteButton
          onConfirm={onRemove}
          tooltip="Remove this triple"
          message="Remove this triple?"
        />
      </Box>
      <DebouncedTextField
        label="Instance 1"
        size="small"
        fullWidth
        value={triple.instance1 || ''}
        onChange={(val) => update('instance1', val)}
        sx={{ mb: 1, mt: 1 }}
      />
      <DebouncedTextField
        label="Relation"
        size="small"
        fullWidth
        value={triple.relation || ''}
        onChange={(val) => update('relation', val)}
        sx={{ mb: 1 }}
      />
      <DebouncedTextField
        label="Instance 2"
        size="small"
        fullWidth
        value={triple.instance2 || ''}
        onChange={(val) => update('instance2', val)}
      />
    </Paper>
  );
});
