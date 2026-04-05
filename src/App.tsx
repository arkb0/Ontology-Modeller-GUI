// Import essential React hooks for state management, memoisation, and side effects
import React, { useState, useMemo, useEffect, useCallback } from 'react';
// Import Material UI components for customising the application's look and feel
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
// Import layout and UI components for a structured user interface
import {
  Container, Paper, Typography, Box, Tabs, Tab, Switch, FormControlLabel,
  Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';
// Hook to detect user system preferences like dark mode
import { useMediaQuery } from '@mui/material';
// Import form components for each TMK model
import TaskForm from './components/forms/TaskForm';
import MethodForm from './components/forms/MethodForm';
import KnowledgeForm from './components/forms/KnowledgeForm';
// Import the memoised preview pane
import PreviewPane from './components/common/PreviewPane';

// -----------------------------------------------------------------------------
// FORM REGISTRY
// Maps each tab to its corresponding custom form component.
// -----------------------------------------------------------------------------

// Map schemata to an array for easy rendering
// Provides a centralised list for generating navigation tabs and form content
const forms = [
  { label: 'Task Form', FormComponent: TaskForm },
  { label: 'Method Form', FormComponent: MethodForm },
  { label: 'Knowledge Form', FormComponent: KnowledgeForm },
];

// -----------------------------------------------------------------------------
// MAIN APP COMPONENT
// -----------------------------------------------------------------------------

// Main functional component for the application
function App() {
  // Title
  useEffect(() => {
    document.title = "TMK Modeller";
  }, []);

  // Check if the user's operating system prefers a dark colour scheme
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  // State to manage the active theme mode
  const [darkMode, setDarkMode] = useState(prefersDarkMode);
  // State to track which form tab is currently active
  const [tabIndex, setTabIndex] = useState(0);
  // We have three forms (one each for T, M, K)
  const [formDataByTab, setFormDataByTab] = useState<any[]>([{}, {}, {}]);
  // State to hold the current values of the form fields
  const formData = formDataByTab[tabIndex] || {};
  // State for the debounced data displayed in the preview pane
  // Initialised to the current formData so the preview is never empty on first load
  const [previewData, setPreviewData] = useState(formData);
  // State to toggle live preview (resource hog!)
  const [livePreview, setLivePreview] = useState(true);
  //State to swap layout (form left vs preview left)
  const [swapLayout, setSwapLayout] = useState(false);
  // Dialog state for clearing the current form
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  // Dialog state for clearing all forms
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  // Local 'fast' state
  const [localData, setLocalData] = useState<any>({});
  // Callback function for final form submission (currently logs to console)
  const onSubmit = ({ formData }: { formData: any }) => console.log("Data submitted: ", formData);

  // Sync localData to the 'slow' global state only when the user stops typing
  useEffect(() => {
    // Capture the index as it was when this specific change happened
    const activeTabAtTimeOfChange = tabIndex;

    const timer = setTimeout(() => {
      setFormDataByTab(prev => {
        const updated = [...prev];
        updated[activeTabAtTimeOfChange] = localData;
        return updated;
      });
    }, 500);

    return () => clearTimeout(timer);
    // No tabIndex dependency. 
    // We only want to save when the DATA changes, not when the tab flips.
  }, [localData]);

  // Sync localData when the tab changes
  useEffect(() => {
    // Get the current data for the NEW tab from the global array
    const currentData = formDataByTab[tabIndex] || {};
    
    // Force the local state to match the global state for the selected tab
    setLocalData(currentData);
    setPreviewData(currentData);
    
    // Adding formDataByTab to dependencies ensures if you Load/Clear, 
    // the form actually updates visually.
  }, [tabIndex, formDataByTab]);

  // Addition to make the form contents survive page reloads
  // Load from local storage on first render
  useEffect(() => {
    const saved = localStorage.getItem('tmkFormData');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormDataByTab(parsed);
        setLocalData(parsed[0] || {}); // Initialise localData with the first tab's data
        setPreviewData(parsed[0] || {}); // Seed the preview with the loaded data
      } catch {}
    }
  }, []);

  // Save to local storage whenever formDataByTab changes
  useEffect(() => {
    localStorage.setItem('tmkFormData', JSON.stringify(formDataByTab));
  }, [formDataByTab]);

  // Optimisation
  // Debounce the preview update to prevent excessive re-renders during typing.
  // When live preview is disabled, the preview retains whatever was last shown
  // (i.e. it freezes rather than disappearing).
  useEffect(() => {
    if (livePreview) {
      const id = setTimeout(() => {
        setPreviewData(formData);
      }, 300); // update preview every 300ms (slightly longer for large documents)
      return () => clearTimeout(id);
    }
    // When livePreview is false, we intentionally do nothing — the preview
    // keeps displaying its last snapshot rather than being cleared.
  }, [formData, livePreview]);

  // Define the visual theme, including custom primary colours and background tones
  const theme = useMemo(() => createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: darkMode ? '#3a895b' : '#115740', // 山岚 (Shān Lán, Mountain Mist) or 竹漆 (Zhú Qī, Bamboo Lacquer)
      },
      background: {
        default: darkMode ? '#121212' : '#eeeeee', // Dark grey or off-white background
        paper: darkMode ? '#1e1e1e' : '#dddddd',   // Paper grey or paper white for the actual form cards
      },
    },
  }), [darkMode]);

  // Save JSON to disk
  // Creates a downloadable file from the current state of the form
  const handleSave = useCallback(() => {
    const blob = new Blob([JSON.stringify(formData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // Format the filename based on the active tab's name
    const currentLabel = forms[tabIndex]?.label || "Model";
    a.download = `${currentLabel.replace(" ", "_")}.json`;
    a.click();
    // Release the memory allocated for the object URL
    URL.revokeObjectURL(url);
  }, [formData, tabIndex]);

  // Load JSON from disk
  // Reads a local file and synchronises it with the form's state
  const handleLoad = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Determine the expected model name based on the current tab
    // Tab 0: Task, Tab 1: Method, Tab 2: Knowledge
    const expectedModel = forms[tabIndex]?.label?.split(' ')[0] ?? '';

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const text = e.target?.result;
        if (typeof text === 'string') {
          const json = JSON.parse(text);

          // Validation: Check if the 'model' field matches the current tab
          if (json.model !== expectedModel) {
            alert(`Validation Error: This file is for a "${json.model}" model, but you are currently on the ${expectedModel} tab.`);
            return;
          }

          // Update only the specific tab's data
          setFormDataByTab(prev => {
            const updated = [...prev];
            updated[tabIndex] = json;
            return updated;
          });

          // Synchronise fast local state and preview
          setLocalData(json);
          setPreviewData(json);
        }
      } catch (err) {
        console.error("Invalid JSON file");
        alert("The selected file is not a valid JSON document.");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }, [tabIndex]);

  // Stabilised onChange handler for the active form component
  const handleFormChange = useCallback((newData: any) => {
    setFormDataByTab(prev => {
      const updated = [...prev];
      updated[tabIndex] = newData;
      return updated;
    });
  }, [tabIndex]);

  // Resolve the correct form component for the active tab
  const activeFormEntry = forms[tabIndex];
  if (!activeFormEntry) return null;
  const ActiveFormComponent = activeFormEntry.FormComponent;

  // The form pane contents, extracted to avoid duplication for swapped layouts
  const formPane = (
    <Paper elevation={3} style={{ flex: 1, padding: '30px', backgroundColor: theme.palette.background.paper }}>
      <Typography variant="h5" gutterBottom>{activeFormEntry.label}</Typography>
      <ActiveFormComponent
        data={formDataByTab[tabIndex] || {}} // Access the specific bucket
        onChange={handleFormChange}
      />
      <Box display="flex" gap={2} mt={2}>
        <Button variant="contained" color="primary" onClick={handleSave}>Save JSON</Button>
        <Button variant="outlined" component="label">
          Load JSON
          <input type="file" accept="application/json" hidden onChange={handleLoad} />
        </Button>
        {/* Clear Current Form */}
        <Button
          variant="contained"
          style={{ backgroundColor: darkMode ? '#8b1e1e' : '#b22222', color: '#eeeeee' }}
          onClick={() => setClearDialogOpen(true)}
        >
          Clear
        </Button>
        {/* Clear all forms */}
        <Button
          variant="contained"
          style={{ backgroundColor: darkMode ? '#5c0000' : '#8b0000', color: '#eeeeee' }}
          onClick={() => setClearAllDialogOpen(true)}
        >
          Clear All
        </Button>
      </Box>
    </Paper>
  );

  // The preview pane — always rendered, content freezes when live preview is off
  const previewPane = (
    <PreviewPane
      data={previewData}
      backgroundColor={theme.palette.background.paper}
    />
  );

  return (
    <ThemeProvider theme={theme}>
      {/* Resets browser styles to provide a consistent baseline */}
      <CssBaseline />
      <Container maxWidth="lg" style={{ padding: "40px 0" }}>
        {/* Header section containing the title and theme toggle */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h3" align="center" gutterBottom color="primary">
            TMK Modeller
          </Typography>
          <FormControlLabel
            control={<Switch checked={darkMode} onChange={() => setDarkMode(!darkMode)} />}
            label="Night Mode"
          />
        </Box>

        {/* Navigation tabs to switch between different TMK schemata */}
        <Tabs
          value={tabIndex}
          // Reset form data when switching tabs to avoid cross-pollination of data
          onChange={(_e, newValue: number) => setTabIndex(newValue)}
          centered
          textColor="primary"
          indicatorColor="primary"
        >
          {forms.map((form, idx) => (
            <Tab key={idx} label={form.label} />
          ))}
        </Tabs>

        <Box display="flex" justifyContent="center" gap={2} mt={2}>
          <Button variant="outlined" onClick={() => setLivePreview(!livePreview)}>
            {livePreview ? "Disable Live Preview" : "Enable Live Preview"}
          </Button>
          {!livePreview && (
            <Button variant="contained" color="primary" onClick={() => setPreviewData(formData)}>
              Update Preview
            </Button>
          )}
          <Button variant="outlined" onClick={() => setSwapLayout(!swapLayout)}>
            ⇌
          </Button>
        </Box>

        {/* Main content area containing the form and the live preview */}
        <Box mt={4} display="flex" gap={3}>
          {swapLayout ? (
            <>
              {previewPane}
              {formPane}
            </>
          ) : (
            <>
              {formPane}
              {previewPane}
            </>
          )}
        </Box>

        {/* Dialog: Clear current form */}
        <Dialog open={clearDialogOpen} onClose={() => setClearDialogOpen(false)}>
          <DialogTitle>Clear Current Form?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              This will reset the current form to its default values. Your unsaved changes will be lost. Do you want to continue?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setClearDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                const updated = [...formDataByTab];
                updated[tabIndex] = {}; // Reset this tab's data
                setFormDataByTab(updated);
                setLocalData({});
                setPreviewData({}); // Clear the preview as well
                setClearDialogOpen(false);
              }}
              style={{ color: darkMode ? '#ffb3b3' : '#8b0000' }}
            >
              Clear
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog: Clear ALL forms */}
        <Dialog open={clearAllDialogOpen} onClose={() => setClearAllDialogOpen(false)}>
          <DialogTitle>Clear ALL Forms?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              This will reset Task, Method, and Knowledge to their default values. All unsaved work in every tab will be lost. Proceed?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setClearAllDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                setFormDataByTab([{}, {}, {}]); // Reset all three forms
                setLocalData({});
                setPreviewData({}); // Clear the preview as well
                setClearAllDialogOpen(false);
              }}
              style={{ color: darkMode ? '#ffb3b3' : '#8b0000' }}
            >
              Clear All
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </ThemeProvider>
  );
}

export default App;
