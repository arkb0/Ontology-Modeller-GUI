import React, { useCallback, useEffect, memo } from 'react';
import { Box, Typography, TextField, IconButton, Tooltip } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { replaceAt, removeAt } from '../../utils/helpers';
import MethodEntryFields from '../sections/MethodEntryFields';
import FSMModal from '../modals/FSMModal'; // Import the modal

interface MethodData {
  model?: string;
  methods?: any[];
  [key: string]: any;
}

interface MethodFormProps {
  data: MethodData;
  onChange: (updatedData: MethodData) => void;
  // For tracking the active preview
  onActiveMethodChange?: (index: number) => void;
  activeMethodIndex?: number;
}

/**
 * The complete Method Model form.
 * Mirrors the Method.schema.json structure.
 */
const MethodForm = memo(function MethodForm({ data, onChange, onActiveMethodChange, activeMethodIndex }: MethodFormProps) {
  const methods = data.methods || [];
  // Track the current preview
  // -- State for the Modal --
  const [previewIdx, setPreviewIdx] = React.useState<number | null>(null);

  const updateMethods = useCallback((newMethods: any[]) => {
    onChange({ ...data, model: 'Method', methods: newMethods });
  }, [data, onChange]);

  const addMethod = useCallback(() => {
    updateMethods([...methods, {
      name: '',
      description: '',
      inputParameters: [],
      outputParameters: [],
      requires: '',
      provides: ''
    }]);
  }, [methods, updateMethods]);

  // Ensure the model field is always set
  useEffect(() => {
    if (data.model !== 'Method') {
      onChange({ ...data, model: 'Method' });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Box>
      <TextField
        label="Model"
        size="small"
        fullWidth
        value="Method"
        disabled
        sx={{ mb: 3 }}
      />

      <Box display="flex" alignItems="center" mb={2}>
        <Typography variant="h6">Methods</Typography>
        <Tooltip title="Add a new method">
          <IconButton color="primary" onClick={addMethod}>
            <AddCircleOutlineIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {methods.map((method, idx) => (
        <MethodEntryFields
          key={idx}
          index={idx}
          method={method}
          onChange={(updated: any) => updateMethods(replaceAt(methods, idx, updated))}
          onRemove={() => updateMethods(removeAt(methods, idx))}
          onPreview={() => onActiveMethodChange?.(idx)}
          isActivePreview={activeMethodIndex === idx}
        />
      ))}

      {/* -- The FSM Modal -- */}
      <FSMModal
        open={previewIdx !== null}
        onClose={() => setPreviewIdx(null)}
        method={previewIdx !== null ? methods[previewIdx] : null}
        onUpdate={(updatedMethod) => {
          if (previewIdx !== null) {
            updateMethods(replaceAt(methods, previewIdx, updatedMethod));
          }
        }}
      />
    </Box>
  );
});

export default MethodForm;
