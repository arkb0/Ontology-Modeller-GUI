import React, { useCallback, memo } from 'react';
import { Paper, Box, Typography, IconButton, Tooltip } from '@mui/material';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import DebouncedTextField from './DebouncedTextField';

/**
 * Define the shape of an individual assertion.
 */
interface Assertion {
  name?: string;
  description?: string;
  equivalentTo?: string;
  [key: string]: any; // Allows for flexibility if other fields exist
}

/**
 * Define the props for the component.
 */
interface AssertionEntryFieldsProps {
  assertion: Assertion;
  onChange: (updatedAssertion: Assertion) => void;
  onRemove: () => void;
}

/**
 * Renders a single assertion entry (shared between Method and Knowledge forms).
 */
const AssertionEntryFields = memo(function AssertionEntryFields({ 
  assertion, 
  onChange, 
  onRemove 
}: AssertionEntryFieldsProps) {
  const update = useCallback((field: keyof Assertion, value: string) => {
    onChange({ ...assertion, [field]: value });
  }, [assertion, onChange]);

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 1 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle2" color="textSecondary">Assertion</Typography>
        <Tooltip title="Remove this assertion">
          <IconButton size="small" onClick={onRemove} color="error">
            <RemoveCircleOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <DebouncedTextField
        label="Name"
        size="small"
        fullWidth
        value={assertion.name || ''}
        onChange={(val: string) => update('name', val)}
        sx={{ mb: 1, mt: 1 }}
      />
      <DebouncedTextField
        label="Description"
        size="small"
        fullWidth
        multiline
        value={assertion.description || ''}
        onChange={(val: string) => update('description', val)}
        sx={{ mb: 1 }}
      />
      <DebouncedTextField
        label="Equivalent To"
        size="small"
        fullWidth
        value={assertion.equivalentTo || ''}
        onChange={(val: string) => update('equivalentTo', val)}
      />
    </Paper>
  );
});

export default AssertionEntryFields;
