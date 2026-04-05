import React, { useCallback, useEffect, memo } from 'react';
import { Box, Typography, TextField, IconButton, Tooltip, Divider } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { replaceAt, removeAt } from '../../utils/helpers';
import AssertionEntryFields from '../common/AssertionEntryFields';
import {
  ConceptEntryFields,
  InstanceEntryFields,
  RelationEntryFields,
  TripleEntryFields
} from '../sections/KnowledgeEntries';

interface KnowledgeData {
  model?: string;
  concepts?: any[];
  instances?: any[];
  relations?: any[];
  triples?: any[];
  assertions?: any[];
  [key: string]: any; // Allow for other model fields
}

interface KnowledgeFormProps {
  data: KnowledgeData;
  onChange: (updatedData: KnowledgeData) => void;
}

/**
 * The complete Knowledge Model form.
 * Mirrors the Knowledge.schema.json structure.
 */
const KnowledgeForm = memo(function KnowledgeForm({ data, onChange }: KnowledgeFormProps) {
  const concepts = data.concepts || [];
  const instances = data.instances || [];
  const relations = data.relations || [];
  const triples = data.triples || [];
  const assertions = data.assertions || [];

  const update = useCallback((field: string, value: any) => {
    onChange({ ...data, model: 'Knowledge', [field]: value });
  }, [data, onChange]);

  // Ensure the model field is always set
  useEffect(() => {
    if (data.model !== 'Knowledge') {
      onChange({ ...data, model: 'Knowledge' });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Box>
      <TextField
        label="Model"
        size="small"
        fullWidth
        value="Knowledge"
        disabled
        sx={{ mb: 3 }}
      />

      {/* -- Concepts -- */}
      <Box display="flex" alignItems="center" mb={2}>
        <Typography variant="h6">Concepts</Typography>
        <Tooltip title="Add a new concept">
          <IconButton
            color="primary"
            onClick={() => update('concepts', [...concepts, { name: '', properties: [] }])}
          >
            <AddCircleOutlineIcon />
          </IconButton>
        </Tooltip>
      </Box>
      {concepts.map((c, idx) => (
        <ConceptEntryFields
          key={idx}
          index={idx}
          concept={c}
          onChange={(updated: any) => update('concepts', replaceAt(concepts, idx, updated))}
          onRemove={() => update('concepts', removeAt(concepts, idx))}
        />
      ))}

      <Divider sx={{ my: 3 }} />

      {/* -- Instances -- */}
      <Box display="flex" alignItems="center" mb={2}>
        <Typography variant="h6">Instances</Typography>
        <Tooltip title="Add a new instance">
          <IconButton
            color="primary"
            onClick={() => update('instances', [...instances, { name: '', concept: '' }])}
          >
            <AddCircleOutlineIcon />
          </IconButton>
        </Tooltip>
      </Box>
      {instances.map((inst, idx) => (
        <InstanceEntryFields
          key={idx}
          index={idx}
          instance={inst}
          onChange={(updated: any) => update('instances', replaceAt(instances, idx, updated))}
          onRemove={() => update('instances', removeAt(instances, idx))}
        />
      ))}

      <Divider sx={{ my: 3 }} />

      {/* -- Relations -- */}
      <Box display="flex" alignItems="center" mb={2}>
        <Typography variant="h6">Relations</Typography>
        <Tooltip title="Add a new relation">
          <IconButton
            color="primary"
            onClick={() => update('relations', [...relations, { name: '', domain: '', range: '' }])}
          >
            <AddCircleOutlineIcon />
          </IconButton>
        </Tooltip>
      </Box>
      {relations.map((r, idx) => (
        <RelationEntryFields
          key={idx}
          index={idx}
          relation={r}
          onChange={(updated: any) => update('relations', replaceAt(relations, idx, updated))}
          onRemove={() => update('relations', removeAt(relations, idx))}
        />
      ))}

      <Divider sx={{ my: 3 }} />

      {/* -- Triples -- */}
      <Box display="flex" alignItems="center" mb={2}>
        <Typography variant="h6">Triples</Typography>
        <Tooltip title="Add a new triple">
          <IconButton
            color="primary"
            onClick={() => update('triples', [...triples, { instance1: '', relation: '', instance2: '' }])}
          >
            <AddCircleOutlineIcon />
          </IconButton>
        </Tooltip>
      </Box>
      {triples.map((t, idx) => (
        <TripleEntryFields
          key={idx}
          index={idx}
          triple={t}
          onChange={(updated: any) => update('triples', replaceAt(triples, idx, updated))}
          onRemove={() => update('triples', removeAt(triples, idx))}
        />
      ))}

      <Divider sx={{ my: 3 }} />

      {/* -- Assertions -- */}
      <Box display="flex" alignItems="center" mb={2}>
        <Typography variant="h6">Assertions</Typography>
        <Tooltip title="Add an assertion">
          <IconButton
            color="primary"
            onClick={() => update('assertions', [...assertions, { name: '', description: '', equivalentTo: '' }])}
          >
            <AddCircleOutlineIcon />
          </IconButton>
        </Tooltip>
      </Box>
      {assertions.map((a, idx) => (
        <AssertionEntryFields
          key={idx}
          assertion={a}
          onChange={(updated: any) => update('assertions', replaceAt(assertions, idx, updated))}
          onRemove={() => update('assertions', removeAt(assertions, idx))}
        />
      ))}
    </Box>
  );
});

export default KnowledgeForm;
