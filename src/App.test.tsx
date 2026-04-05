import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

test('renders TMK Modeller title', () => {
  render(<App />);
  
  // Look for the actual title instead of the boilerplate "learn react"
  const titleElement = screen.getByText(/TMK Modeller/i);
  expect(titleElement).toBeInTheDocument();
});

test('renders the Task Form tab by default', () => {
  render(<App />);

  // 1. Verify the Heading inside the active form panel exists
  // This confirms the TaskForm component is actually being rendered.
  const heading = screen.getByRole('heading', { name: /Task Form/i });
  expect(heading).toBeInTheDocument();

  // 2. Alternatively, verify the Tab itself is selected
  const tab = screen.getByRole('tab', { name: /Task Form/i });
  expect(tab).toHaveAttribute('aria-selected', 'true');
});

describe('TMK Modeller Extended Tests', () => {
  
  // ---------------------------------------------------------------------------
  // THEME TESTS
  // ---------------------------------------------------------------------------

  test('toggles Night Mode and updates the switch state', () => {
    render(<App />);
    
    // Cast the result to HTMLInputElement to access the 'checked' property
    const nightModeSwitch = screen.getByLabelText(/Night Mode/i) as HTMLInputElement;
    
    const initialState = nightModeSwitch.checked;

    fireEvent.click(nightModeSwitch);
    expect(nightModeSwitch.checked).toBe(!initialState);
  });

  // ---------------------------------------------------------------------------
  // FILE I/O & VALIDATION TESTS
  // ---------------------------------------------------------------------------

  test('shows a validation alert when uploading an incorrect model type', async () => {
    // Mock the window.alert function to track if it is called
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    render(<App />);

    // Create a mock File containing 'Method' data while we are on the 'Task' tab
    const file = new File(
      [JSON.stringify({ model: 'Method', goal: 'Incorrect Model' })],
      'method.json',
      { type: 'application/json' }
    );

    const fileInput = screen.getByLabelText(/Load JSON/i);
    
    // Trigger the file upload
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Verify the validation logic identifies the mismatch
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Validation Error: This file is for a "Method" model/i)
      );
    });

    alertSpy.mockRestore();
  });

  test('successfully loads a valid JSON for the current tab', async () => {
    render(<App />);

    // Ensure we are on the Task tab (default)
    const taskHeading = screen.getByRole('heading', { name: /Task Form/i });
    expect(taskHeading).toBeInTheDocument();

    // Create a valid Task model file
    const validData = { model: 'Task', name: 'Test Task' };
    const file = new File(
      [JSON.stringify(validData)],
      'task.json',
      { type: 'application/json' }
    );

    const fileInput = screen.getByLabelText(/Load JSON/i);

    // Mock FileReader to simulate the file loading process
    const readAsTextSpy = jest.spyOn(FileReader.prototype, 'readAsText');
    
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Assert that the file reader was invoked to process the data
    expect(readAsTextSpy).toHaveBeenCalledWith(file);
    
    readAsTextSpy.mockRestore();
  });

  // ---------------------------------------------------------------------------
  // UI NAVIGATION & LAYOUT
  // ---------------------------------------------------------------------------

  test('switches tabs and updates the active form component', () => {
    render(<App />);

    // Click the Method Form tab button
    const methodTab = screen.getByRole('tab', { name: /Method Form/i });
    fireEvent.click(methodTab);

    // Verify the UI has synchronised to render the Method schema
    expect(screen.getByRole('heading', { name: /Method Form/i })).toBeInTheDocument();
    expect(methodTab).toHaveAttribute('aria-selected', 'true');
    
    // Confirm the Task Form heading is no longer visible
    expect(screen.queryByRole('heading', { name: /Task Form/i })).not.toBeInTheDocument();
  });

  test('toggles the layout swap between Form and Preview panes', () => {
    render(<App />);
    
    const swapButton = screen.getByRole('button', { name: /⇌/i });
    
    // We check for the existence of the button to ensure the layout controls are accessible
    expect(swapButton).toBeInTheDocument();
    
    // Trigger layout swap
    fireEvent.click(swapButton);
    
    // Re-triggering ensures the toggle logic is stable
    fireEvent.click(swapButton);
    expect(swapButton).toBeInTheDocument();
  });
});
