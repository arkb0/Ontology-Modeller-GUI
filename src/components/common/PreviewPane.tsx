import React, { memo } from 'react';
import { Paper, Typography } from '@mui/material';
// Component for pretty-printing the generated JSON data
import JSONPretty from 'react-json-pretty';
import 'react-json-pretty/themes/monikai.css';

// -----------------------------------------------------------------------------
// MEMOISED PREVIEW PANE
// Separated so that form edits do not force the (potentially large) JSON
// pretty-printer to re-render on every state change.
// -----------------------------------------------------------------------------

interface PreviewPaneProps {
  data: any;
  backgroundColor?: string;
}

const PreviewPane = memo(function PreviewPane({ data, backgroundColor }: PreviewPaneProps) {
  return (
    <Paper elevation={3} style={{ flex: 1, padding: '30px', backgroundColor, overflowX: 'auto' }}>
      <Typography variant="h6" gutterBottom>Live JSON Preview</Typography>
      <JSONPretty
        id="json-pretty"
        data={data}
        style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxWidth: '100%' }}
      />
    </Paper>
  );
});

export default PreviewPane;
