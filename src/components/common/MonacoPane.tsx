/**
 * MonacoPane.tsx
 * Replaces the old react-json-pretty read-only preview with a full Monaco
 * editor instance.  The editor is bidirectional: the user can edit JSON
 * directly and the changes propagate back to the form state via onUpdate.
 *
 * Behaviour:
 *   • Incoming `data` prop → serialised to JSON and shown in the editor.
 *   • User edits → parsed (if valid JSON) → onUpdate() called.
 *   • If the JSON is invalid the editor shows red squiggles (Monaco's built-in
 *     JSON language support) but we do NOT propagate garbage upstream.
 *   • Editor theme tracks the app's darkMode prop:
 *       dark  → 'vs-dark'
 *       light → 'vs' (Monaco's built-in light theme)
 *   • We debounce upward propagation by 400 ms so the form doesn't thrash
 *     while the user is mid-sentence inside the JSON.
 *
 * NOTE: We keep the old PreviewPane.tsx file untouched so that nothing
 * importing it breaks if we ever want to roll back.
 */

import React, { useEffect, useRef, useCallback, memo } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import { Paper, Typography, Box } from '@mui/material';

interface MonacoPaneProps {
  data:            any;
  onUpdate:        (parsed: any) => void;
  darkMode?:       boolean;
  backgroundColor?: string;
}

// How long (ms) after the user stops typing before we try to parse + propagate.
const PROPAGATE_DELAY = 400;

const MonacoPane = memo(function MonacoPane({
  data,
  onUpdate,
  darkMode = true,
  backgroundColor,
}: MonacoPaneProps) {
  // Keep a stable ref to the editor instance so we can push external changes
  // without going through React state (avoids cursor-jump on every keystroke).
  const editorRef      = useRef<any>(null);
  // Timer ref for the debounced upward propagation
  const propagateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track what the editor was last seeded with so we don't re-seed on our OWN
  // upward propagation bouncing back down as a new `data` prop.
  const lastPushed     = useRef<string>('');

  // ── Serialise incoming data ──────────────────────────────────────────────
  const serialise = useCallback((d: any): string => {
    try {
      return JSON.stringify(d, null, 2);
    } catch {
      return '{}';
    }
  }, []);

  // ── Seed / re-seed the editor when `data` changes from outside ───────────
  useEffect(() => {
    const serialised = serialise(data);
    // If this is the same string we just pushed upward, skip — we caused it.
    if (serialised === lastPushed.current) return;

    lastPushed.current = serialised;

    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model && model.getValue() !== serialised) {
        // Use pushEditOperations so the editor undo stack survives the seed.
        editorRef.current.pushUndoStop();
        model.pushEditOperations(
          [],
          [{ range: model.getFullModelRange(), text: serialised }],
          () => null,
        );
        editorRef.current.pushUndoStop();
      }
    }
  }, [data, serialise]);

  // ── Mount handler — save editor instance ─────────────────────────────────
  const handleMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
    // Seed the initial value
    const serialised = serialise(data);
    lastPushed.current = serialised;
    editor.setValue(serialised);
  }, []); // intentionally empty — runs once on mount

  // ── Change handler — debounced parse + propagate ──────────────────────────
  const handleChange: OnChange = useCallback((value) => {
    if (propagateTimer.current) clearTimeout(propagateTimer.current);

    propagateTimer.current = setTimeout(() => {
      if (!value) return;
      try {
        const parsed = JSON.parse(value);
        lastPushed.current = value; // mark so the incoming prop bounce is ignored
        onUpdate(parsed);
      } catch {
        // Invalid JSON — leave the form state alone; Monaco shows squiggles.
      }
    }, PROPAGATE_DELAY);
  }, [onUpdate]);

  // Clean up the timer on unmount
  useEffect(() => () => {
    if (propagateTimer.current) clearTimeout(propagateTimer.current);
  }, []);

  return (
    <Paper
      elevation={3}
      style={{
        flex:            1,
        padding:         '20px',
        backgroundColor,
        display:         'flex',
        flexDirection:   'column',
        overflow:        'hidden',
        minHeight:       0,
      }}
    >
      <Typography variant="h6" gutterBottom>
        JSON Editor
      </Typography>
      <Box
        sx={{
          flex:         1,
          borderRadius: '6px',
          overflow:     'hidden',
          border:       '1px solid',
          borderColor:  darkMode ? '#313244' : '#cccccc',
          minHeight:    0,
        }}
      >
        <Editor
          height="100%"
          defaultLanguage="json"
          theme={darkMode ? 'vs-dark' : 'vs'}
          onMount={handleMount}
          onChange={handleChange}
          options={{
            minimap:          { enabled: false },
            fontSize:         13,
            fontFamily:       'monospace',
            lineNumbers:      'off',
            scrollBeyondLastLine: false,
            wordWrap:         'on',
            tabSize:          2,
            formatOnPaste:    true,
            formatOnType:     false,
            automaticLayout:  true,
            // Give the user full undo/redo via Ctrl+Z / Ctrl+Shift+Z
            // Monaco handles this internally — no extra wiring needed.
          }}
        />
      </Box>
    </Paper>
  );
});

export default MonacoPane;
