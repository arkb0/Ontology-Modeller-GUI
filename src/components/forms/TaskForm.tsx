import React, { useCallback, useEffect, memo } from 'react';
import { Box, Typography, TextField, IconButton, Tooltip } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { replaceAt, removeAt } from '../../utils/helpers';
import TaskEntryFields from '../sections/TaskEntryFields';

interface TaskData {
  model?: string;
  tasks?: any[];
  [key: string]: any;
}

interface TaskFormProps {
  data: TaskData;
  onChange: (updatedData: TaskData) => void;
}

/**
 * The complete Task Model form.
 * Mirrors the Task.schema.json structure.
 */
const TaskForm = memo(function TaskForm({ data, onChange }: TaskFormProps) {
  const tasks = data.tasks || [];

  const updateTasks = useCallback((newTasks: any[]) => {
    onChange({ ...data, model: 'Task', tasks: newTasks });
  }, [data, onChange]);

  const addTask = useCallback(() => {
    updateTasks([...tasks, {
      name: '',
      description: '',
      inputParameters: [],
      outputParameters: [],
      means: []
    }]);
  }, [tasks, updateTasks]);

  // Ensure the model field is always set
  useEffect(() => {
    if (data.model !== 'Task') {
      onChange({ ...data, model: 'Task' });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Box>
      <TextField
        label="Model"
        size="small"
        fullWidth
        value="Task"
        disabled
        sx={{ mb: 3 }}
      />

      <Box display="flex" alignItems="center" mb={2}>
        <Typography variant="h6">Tasks</Typography>
        <Tooltip title="Add a new task">
          <IconButton color="primary" onClick={addTask}>
            <AddCircleOutlineIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {tasks.map((task, idx) => (
        <TaskEntryFields
          key={idx}
          index={idx}
          task={task}
          onChange={(updated: any) => updateTasks(replaceAt(tasks, idx, updated))}
          onRemove={() => updateTasks(removeAt(tasks, idx))}
        />
      ))}
    </Box>
  );
});

export default TaskForm;
