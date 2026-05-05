import React, { useCallback, memo } from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { AddCircleOutlined as AddCircleOutlineIcon } from '@mui/icons-material';
import { replaceAt, removeAt } from '../../utils/helpers';
import DebouncedTextField from './DebouncedTextField';
import ConfirmDeleteButton from './ConfirmDeleteButton';

/**
 * Props for the individual list item.
 */
interface StringListItemProps {
  index:         number;
  value:         string;
  placeholder?:  string;
  onChangeValue: (index: number, val: string) => void;
  onRemove:      (index: number) => void;
}

/**
 * A single row inside a StringListField.
 * Memo-ised so that editing one row does not re-render its siblings.
 */
const StringListItem = memo(function StringListItem({ 
  index, 
  value, 
  placeholder, 
  onChangeValue, 
  onRemove 
}: StringListItemProps) {
  const handleChange = useCallback((val: string) => {
    onChangeValue(index, val);
  }, [index, onChangeValue]);

  const handleRemove = useCallback(() => {
    onRemove(index);
  }, [index, onRemove]);

  return (
    <Box display="flex" alignItems="center" gap={1} mb={1}>
      <DebouncedTextField
        size="small"
        fullWidth
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
      />
      <ConfirmDeleteButton
        onConfirm={handleRemove}
        tooltip="Remove this entry"
        message="Remove this entry?"
      />
    </Box>
  );
});

/**
 * Props for the main StringListField component.
 */
interface StringListFieldProps {
  label:       string;
  values?:     string[];
  onChange:    (newValues: string[]) => void;
  placeholder?: string;
}

/**
 * A reusable component for managing a dynamic list of simple strings.
 * Renders a labelled group of text fields, each with a remove button,
 * and a '+' button to append a new empty entry.
 */
const StringListField = memo(function StringListField({ 
  label, 
  values = [], 
  onChange, 
  placeholder = '' 
}: StringListFieldProps) {
  const handleChange = useCallback((index: number, newValue: string) => {
    onChange(replaceAt(values, index, newValue));
  }, [values, onChange]);

  const handleAdd = useCallback(() => {
    onChange([...values, '']);
  }, [values, onChange]);

  const handleRemove = useCallback((index: number) => {
    onChange(removeAt(values, index));
  }, [values, onChange]);

  return (
    <Box mb={2}>
      <Box display="flex" alignItems="center" mb={1}>
        <Typography variant="subtitle2" color="textSecondary">{label}</Typography>
        <Tooltip title={`Add ${label.toLowerCase()} entry`}>
          <IconButton size="small" onClick={handleAdd} color="primary">
            <AddCircleOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      {values.map((val, idx) => (
        <StringListItem
          key={idx}
          index={idx}
          value={val}
          placeholder={placeholder || `${label} #${idx + 1}`}
          onChangeValue={handleChange}
          onRemove={handleRemove}
        />
      ))}
    </Box>
  );
});

export default StringListField;
