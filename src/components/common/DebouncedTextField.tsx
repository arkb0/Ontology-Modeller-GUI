import React, { useState, useEffect, memo } from 'react';
import { TextField, TextFieldProps } from '@mui/material';

/**
 * Props for DebouncedTextField.
 * We extend TextFieldProps to allow all standard MUI attributes (label, sx, etc.)
 * but we override 'value' and 'onChange' to match your specific string-based logic.
 */
// We Omit 'onChange' and 'placeholder' so we can redefine them
// to be compatible with the strict tsconfig settings.
interface DebouncedTextFieldProps extends Omit<TextFieldProps, 'onChange' | 'placeholder'> {
  value?: string;
  onChange: (value: string) => void;
  debounceMs?: number;
  placeholder?: string | undefined; 
}

/**
 * A stabilised TextField that maintains its own internal state and only
 * propagates changes to the parent after a configurable debounce delay.
 * This prevents every keystroke from triggering a full component-tree
 * re-render — critical when hundreds of fields are on screen at once.
 */
const DebouncedTextField = memo(function DebouncedTextField({
  value: externalValue,
  onChange: externalOnChange,
  debounceMs = 300,
  ...props
}: DebouncedTextFieldProps) {
  const [internalValue, setInternalValue] = useState<string>(externalValue ?? '');

  // Sync from parent when the external value changes (e.g. loading a file)
  useEffect(() => {
    setInternalValue(externalValue ?? '');
  }, [externalValue]);

  // Debounce the upward propagation so the parent only re-renders
  // once the user pauses typing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (internalValue !== externalValue) {
        externalOnChange(internalValue);
      }
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [internalValue, debounceMs]); // intentionally excluding externalValue/externalOnChange

  return (
    <TextField
      {...props}
      placeholder={props.placeholder ?? ""} // If it's undefined, make it an empty string
      value={internalValue}
      onChange={(e) => setInternalValue(e.target.value)}
    />
  );
});

export default DebouncedTextField;
