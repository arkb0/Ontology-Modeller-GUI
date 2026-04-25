/**
 * FSMModal.js
 * Full-screen-ish modal that hosts FSMView for a specific method's organizer.
 *
 * Props:
 *   open       {bool}     – controlled open state
 *   onClose    {func}     – close handler
 *   method     {object}   – the full method object ({ name, organizer, … })
 *   onUpdate   {func}     – propagates organizer edits upward (future)
 */

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FSMView from '../fsm/FSMView';
import { MethodEntry, Organizer } from '../fsm/fsm.utils';

interface FSMModalProps {
  open:      boolean;
  onClose:   () => void;
  method?:   MethodEntry | null;
  onUpdate?: (updated: MethodEntry) => void;
}

export default function FSMModal({ open, onClose, method, onUpdate }: FSMModalProps) {
  if (!method) return null;

  const handleUpdate = (updatedOrganizer: Organizer): void => {
    // Reconstruct the method object with the updated organizer and propagate up.
    if (onUpdate) onUpdate({ ...method, organizer: updatedOrganizer });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      PaperProps={{
        sx: {
          // Near-full-screen: large viewport but with visible backdrop
          width:      '90vw',
          height:     '88vh',
          maxHeight:  '88vh',
          background: '#181825',
          border:     '1px solid #313244',
          borderRadius: '10px',
          display:    'flex',
          flexDirection: 'column',
          overflow:   'hidden',
        },
      }}
    >
      {/* -- Header -- */}
      <DialogTitle
        sx={{
          display:      'flex',
          alignItems:   'center',
          gap:          1,
          background:   '#1e1e2e',
          borderBottom: '1px solid #313244',
          py:           1,
          px:           2,
          flexShrink:   0,
        }}
      >
        <Box flex={1}>
          <Typography
            variant="subtitle2"
            sx={{ color: '#cdd6f4', fontFamily: 'monospace' }}
          >
            FSM View
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: '#89b4fa', fontFamily: 'monospace' }}
          >
            {method.name}
          </Typography>
        </Box>

        <IconButton
          onClick={onClose}
          size="small"
          sx={{ color: '#7f849c', '&:hover': { color: '#f38ba8' } }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      {/* -- Canvas -- */}
      <DialogContent
        sx={{
          flex:    1,
          p:       0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          // Remove default DialogContent padding so FSMView fills edge-to-edge
          '&.MuiDialogContent-root': { padding: 0 },
        }}
      >
        {method.organizer ? (
          <FSMView
            organizer={method.organizer}
            methodName={method.name}
            onUpdate={handleUpdate}
          />
        ) : (
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%',
              color: '#7f849c' 
            }}
          >
            <Typography variant="body2">No organiser data available for this method.</Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
