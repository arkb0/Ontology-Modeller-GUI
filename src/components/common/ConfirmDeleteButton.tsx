/**
 * ConfirmDeleteButton.tsx
 * A small wrapper around IconButton that pops a tiny confirmation
 * popover before firing the destructive onConfirm callback.
 *
 * Why a popover and not a Dialog?
 *   Dialogs are modal and heavy; they interrupt the whole page.
 *   A Popover is contextual — it anchors to the button, is lightweight,
 *   and keeps the user's eye on the element they just tried to delete.
 *
 * Usage:
 *   <ConfirmDeleteButton onConfirm={handleRemove} tooltip="Remove this state" />
 */

import React, { useState, useCallback, memo } from 'react';
import {
  IconButton,
  Popover,
  Box,
  Typography,
  Button,
  Tooltip,
} from '@mui/material';
import { RemoveCircleOutlined as RemoveCircleOutlineIcon } from '@mui/icons-material';

interface ConfirmDeleteButtonProps {
  onConfirm:   () => void;
  tooltip?:    string;
  message?:    string;
  size?:       'small' | 'medium' | 'large';
  color?:      'error' | 'default' | 'primary' | 'secondary' | 'info' | 'success' | 'warning';
}

const ConfirmDeleteButton = memo(function ConfirmDeleteButton({
  onConfirm,
  tooltip  = 'Remove',
  message  = 'Remove this item? This cannot be undone.',
  size     = 'small',
  color    = 'error',
}: ConfirmDeleteButtonProps) {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // don't bubble to Accordion toggle etc.
    setAnchor(e.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchor(null);
  }, []);

  const handleConfirm = useCallback(() => {
    setAnchor(null);
    onConfirm();
  }, [onConfirm]);

  const open = Boolean(anchor);

  return (
    <>
      <Tooltip title={tooltip}>
        <IconButton size={size} onClick={handleClick} color={color}>
          <RemoveCircleOutlineIcon fontSize={size} />
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchor}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top',    horizontal: 'center' }}
        onClick={(e) => e.stopPropagation()} // prevent bubbling through the popover
      >
        <Box sx={{ p: 2, maxWidth: 240 }}>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            {message}
          </Typography>
          <Box display="flex" gap={1} justifyContent="flex-end">
            <Button size="small" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              size="small"
              variant="contained"
              color="error"
              onClick={handleConfirm}
            >
              Delete
            </Button>
          </Box>
        </Box>
      </Popover>
    </>
  );
});

export default ConfirmDeleteButton;
