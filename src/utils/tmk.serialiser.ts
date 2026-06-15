/**
 * tmk.serialiser.ts
 *
 * Converts the internal JSON representation (Task / Method / Knowledge)
 * into the textual .tmk format.
 *
 * The .tmk format supports two argument styles:
 *   • Positional  --> values in a fixed preset order, no keyword labels
 *   • Keyword     --> `key=value` pairs in any order
 *
 * No positional arguments may follow keyword arguments (mirrors Python's rule).
 * This module always emits one style or the other — never mixed — per block,
 * controlled by the `useKeywords` flag passed to `serialise()`.
 *
 * Relationship to the schemas:
 *   Task model   --> Goal(…) blocks       (Tasks are Goals in .tmk vocabulary)
 *   Method model --> Mechanism(…) blocks (atomic) | Organizer(…) + State(…) +
 *                  Transition(…) blocks (non-atomic)
 *   Knowledge    --> Concept(…) / Relation(…) / Triple(…) / Assertion(…) blocks
 *
 * Fields with no data are emitted as "" (string) or {} (set/list) as
 * appropriate — the format does not enforce required fields at this stage.
 */

// ---------------------------------------------------------------------------
// Low-level formatting helpers
// ---------------------------------------------------------------------------

/** Wrap a string value in double-quotes, escaping internal quotes. */
const q = (s: string | undefined | null): string =>
  `"${(s ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

/** Render a list of strings as a .tmk set literal: {a, b, c} */
const set = (items: string[]): string =>
  items.length === 0 ? '{}' : `{${items.join(', ')}}`;

/**
 * Render a list of (name, Type) parameter pairs as a .tmk set of tuples.
 * Each parameter string is expected in the form "name: Type" (colon-separated).
 * The colon is replaced with a comma to produce the .tmk tuple syntax: (name, Type).
 * If no colon is present the whole string is used as the name and type is left blank.
 */
const paramSet = (params: string[]): string => {
  if (!params || params.length === 0) return '{}';
  return `{${params.map(p => {
    const colonIdx = p.indexOf(':');
    if (colonIdx === -1) return `(${p.trim()})`;
    const name = p.slice(0, colonIdx).trim();
    const type = p.slice(colonIdx + 1).trim();
    return `(${name}, ${type})`;
  }).join(', ')}}`;
};

/**
 * Custom indent logic
 */
const makeIndent = (indentSize: number = 2): string =>
  ' '.repeat(indentSize);

/**
 * Build a positional block:
 *   Keyword(
 *     val1,
 *     val2,
 *     …
 *   );
 */
function positionalBlock(keyword: string, values: string[], indentSize = 2): string {
  const indent = makeIndent(indentSize);
  const inner = values.map(v => `${indent}${v}`).join(',\n');
  return `${keyword}(\n${inner}\n);\n`;
}

/**
 * Build a keyword-argument block:
 *   Keyword(
 *     key1=val1,
 *     key2=val2,
 *     …
 *   );
 */
function keywordBlock(keyword: string, pairs: [string, string][], indentSize = 2): string {
  const indent = makeIndent(indentSize);
  const inner = pairs.map(([k, v]) => `${indent}${k}=${v}`).join(',\n');
  return `${keyword}(\n${inner}\n);\n`;
}

// ---------------------------------------------------------------------------
// Task model  -->  Goal(…) blocks
// ---------------------------------------------------------------------------

/**
 * TASK_FIELDS (positional order):
 *   name, description, category, input_parameters,
 *   output_parameters, givens, makes, means
 *
 * `category` and `givens` have no direct JSON counterpart; emitted as "".
 * `means` is rendered as a set of (mechanismReference, actualArguments) refs.
 */
function serialiseTask(task: any, useKeywords: boolean): string {
  const name        = task.name        ?? '';
  const description = task.description ?? '';
  const inputParams = paramSet(task.inputParameters  ?? []);
  const outputParams= paramSet(task.outputParameters ?? []);
  const given       = q(task.given ?? '');
  const makes       = q(task.makes ?? '');

  // means --> set of mechanism references (arguments elided at this stage)
  const meansItems  = (task.means ?? []).map((m: any) => m.mechanismReference ?? '');
  const meansSet    = set(meansItems);

  if (useKeywords) {
    return keywordBlock('Goal', [
      ['name',              q(name)],
      ['description',       q(description)],
      ['category',          '""'],
      ['input_parameters',  inputParams],
      ['output_parameters', outputParams],
      ['givens',            given],
      ['makes',             makes],
      ['means',             meansSet],
    ]);
  }

  return positionalBlock('Goal', [
    q(name), q(description), '""',
    inputParams, outputParams,
    given, makes, meansSet,
  ]);
}

function serialiseTaskModel(data: any, useKeywords: boolean): string {
  const tasks: any[] = data.tasks ?? [];
  if (tasks.length === 0) return '';

  const lines: string[] = [];
  lines.push(`(* Task Model *)`);

  // Declare the goals set
  const goalNames = tasks.map((t: any) => t.name ?? '').filter(Boolean);
  if (goalNames.length > 0) {
    lines.push(`goals = ${set(goalNames)};\n`);
  }

  tasks.forEach(task => {
    lines.push(serialiseTask(task, useKeywords));
  });

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Method model  -->  Operation(…) / Organizer(…) / State(…) / Transition(…)
// ---------------------------------------------------------------------------

/**
 * OPERATION_FIELDS (positional order):
 *   name, description, input_parameters, output_parameters, requires, provides
 *
 * Used for atomic methods (no organizer).
 */
function serialiseOperation(method: any, useKeywords: boolean): string {
  const name         = method.name        ?? '';
  const description  = method.description ?? '';
  const inputParams  = paramSet(method.inputParameters  ?? []);
  const outputParams = paramSet(method.outputParameters ?? []);
  const requires     = q(method.requires ?? '');
  const provides     = q(method.provides ?? '');

  if (useKeywords) {
    return keywordBlock('Operation', [
      ['name',              q(name)],
      ['description',       q(description)],
      ['input_parameters',  inputParams],
      ['output_parameters', outputParams],
      ['requires',          requires],
      ['provides',          provides],
    ]);
  }

  return positionalBlock('Operation', [
    q(name), q(description),
    inputParams, outputParams,
    requires, provides,
  ]);
}

/**
 * STATE_FIELDS (positional order):
 *   name, description, task_invocation
 *
 * task_invocation --> (goalReference, actualArguments…)
 */
function serialiseState(state: any, useKeywords: boolean): string {
  const name        = state.name ?? '';
  const description = ''; // not stored in the JSON schema
  const gi          = state.goalInvocation ?? {};
  const goalRef     = gi.goalReference ?? '';
  const args        = (gi.actualArguments ?? []).join(', ');
  const invocation  = goalRef
    ? `(${goalRef}${args ? ', ' + args : ''})`
    : '()';

  if (useKeywords) {
    return keywordBlock('State', [
      ['name',            q(name)],
      ['description',     q(description)],
      ['task_invocation', invocation],
    ]);
  }

  return positionalBlock('State', [q(name), q(description), invocation]);
}

/**
 * TRANSITION_FIELDS (positional order):
 *   source_state, target_state, data_condition
 */
function serialiseTransition(transition: any, useKeywords: boolean): string {
  const source    = transition.sourceState   ?? '';
  const target    = transition.targetState   ?? '';
  const condition = transition.dataCondition ?? '';

  if (useKeywords) {
    return keywordBlock('Transition', [
      ['source_state',    q(source)],
      ['target_state',    q(target)],
      ['data_condition',  q(condition)],
    ]);
  }

  return positionalBlock('Transition', [q(source), q(target), q(condition)]);
}

/**
 * ORGANIZER_FIELDS (positional order):
 *   name, description, input_parameters, output_parameters,
 *   requires, provides, states, transitions,
 *   start_state, success_state, failure_state
 *
 * The State(…) and Transition(…) blocks that belong to this organizer
 * are emitted immediately after, referencing by name.
 */
function serialiseOrganizer(method: any, useKeywords: boolean): string {
  const name         = method.name        ?? '';
  const description  = method.description ?? '';
  const inputParams  = paramSet(method.inputParameters  ?? []);
  const outputParams = paramSet(method.outputParameters ?? []);
  const requires     = q(method.requires ?? '');
  const provides     = q(method.provides ?? '');

  const org         = method.organizer ?? {};
  const stateNames  = (org.states      ?? []).map((s: any) => s.name ?? '').filter(Boolean);
  const transNames  = (org.transitions ?? []).map((_: any, i: number) => `t${i}`);
  const statesSet   = set(stateNames);
  const transSet    = set(transNames);
  const startState  = q(org.startState   ?? '');
  const successState= q(org.successState ?? '');
  const failureState= q(org.failureState ?? '');

  let block: string;
  if (useKeywords) {
    block = keywordBlock('Organizer', [
      ['name',              q(name)],
      ['description',       q(description)],
      ['input_parameters',  inputParams],
      ['output_parameters', outputParams],
      ['requires',          requires],
      ['provides',          provides],
      ['states',            statesSet],
      ['transitions',       transSet],
      ['start_state',       startState],
      ['success_state',     successState],
      ['failure_state',     failureState],
    ]);
  } else {
    block = positionalBlock('Organizer', [
      q(name), q(description),
      inputParams, outputParams,
      requires, provides,
      statesSet, transSet,
      startState, successState, failureState,
    ]);
  }

  // Emit the child State and Transition blocks inline
  const stateBlocks = (org.states ?? [])
    .map((s: any) => serialiseState(s, useKeywords))
    .join('\n');

  const transitionBlocks = (org.transitions ?? [])
    .map((t: any) => serialiseTransition(t, useKeywords))
    .join('\n');

  return [block, stateBlocks, transitionBlocks].filter(Boolean).join('\n');
}

function serialiseMethodModel(data: any, useKeywords: boolean): string {
  const methods: any[] = data.methods ?? [];
  if (methods.length === 0) return '';

  const lines: string[] = [];
  lines.push(`(* Method Model *)`);

  // Separate atomic (Mechanism) and non-atomic (Organizer) methods
  const atomic    = methods.filter(m => !m.organizer);
  const nonAtomic = methods.filter(m =>  m.organizer);

  const mechNames = atomic.map((m: any) => m.name ?? '').filter(Boolean);
  if (mechNames.length > 0) {
    lines.push(`mechanisms = ${set(mechNames)};\n`);
  }

  nonAtomic.forEach(m => {
    lines.push(serialiseOrganizer(m, useKeywords));
  });

  atomic.forEach(m => {
    lines.push(serialiseOperation(m, useKeywords));
  });

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Knowledge model  -->  Concept / Relation / Triple / Assertion
// ---------------------------------------------------------------------------

/**
 * CONCEPT_FIELDS (positional order):
 *   name, description, super_concepts, properties
 *
 * Properties are rendered as Property(name, type, default_value) references.
 */
function serialiseConcept(concept: any, useKeywords: boolean): string {
  const name        = concept.name        ?? '';
  const description = concept.description ?? '';
  const superConcepts = set(concept.superConcept ?? []);

  // Properties: each has name + type; no default_value in the schema
  const props = (concept.properties ?? []).map((p: any) =>
    `Property(${q(p.name ?? '')}, ${q(p.type ?? '')}, "")`
  );
  const propsSet = props.length > 0 ? `{${props.join(', ')}}` : '{}';

  if (useKeywords) {
    return keywordBlock('Concept', [
      ['name',          q(name)],
      ['description',   q(description)],
      ['super_concepts', superConcepts],
      ['properties',    propsSet],
    ]);
  }

  return positionalBlock('Concept', [
    q(name), q(description), superConcepts, propsSet,
  ]);
}

/**
 * RELATION_FIELDS (positional order):
 *   name, description, domain, range
 */
function serialiseRelation(relation: any, useKeywords: boolean): string {
  const name        = relation.name        ?? '';
  const description = relation.description ?? '';
  const domain      = relation.domain      ?? '';
  const range       = relation.range       ?? '';

  if (useKeywords) {
    return keywordBlock('Relation', [
      ['name',        q(name)],
      ['description', q(description)],
      ['domain',      q(domain)],
      ['range',       q(range)],
    ]);
  }

  return positionalBlock('Relation', [q(name), q(description), q(domain), q(range)]);
}

/**
 * TRIPLE_FIELDS (positional order):
 *   subject, predicate, object
 *
 * Maps to the JSON's: instance1, relation, instance2
 */
function serialiseTriple(triple: any, useKeywords: boolean): string {
  const subject   = triple.instance1 ?? '';
  const predicate = triple.relation  ?? '';
  const object    = triple.instance2 ?? '';

  if (useKeywords) {
    return keywordBlock('Triple', [
      ['subject',   q(subject)],
      ['predicate', q(predicate)],
      ['object',    q(object)],
    ]);
  }

  return positionalBlock('Triple', [q(subject), q(predicate), q(object)]);
}

/**
 * ASSERTION_FIELDS (positional order):
 *   name, description, property, equivalent_to
 *
 * `property` has no direct JSON counterpart; emitted as "".
 */
function serialiseAssertion(assertion: any, useKeywords: boolean): string {
  const name        = assertion.name        ?? '';
  const description = assertion.description ?? '';
  const equivalentTo= assertion.equivalentTo ?? '';

  if (useKeywords) {
    return keywordBlock('Assertion', [
      ['name',          q(name)],
      ['description',   q(description)],
      ['property',      '""'],
      ['equivalent_to', q(equivalentTo)],
    ]);
  }

  return positionalBlock('Assertion', [
    q(name), q(description), '""', q(equivalentTo),
  ]);
}

function serialiseKnowledgeModel(data: any, useKeywords: boolean): string {
  const concepts:   any[] = data.concepts   ?? [];
  const instances:  any[] = data.instances  ?? [];
  const relations:  any[] = data.relations  ?? [];
  const triples:    any[] = data.triples    ?? [];
  const assertions: any[] = data.assertions ?? [];

  // Nothing to emit if everything is empty
  if ([concepts, instances, relations, triples, assertions].every(a => a.length === 0)) {
    return '';
  }

  const lines: string[] = [];
  lines.push(`(* Knowledge Model *)`);

  // Concept name index
  const conceptNames = concepts.map((c: any) => c.name ?? '').filter(Boolean);
  if (conceptNames.length > 0) {
    lines.push(`concepts = ${set(conceptNames)};\n`);
  }

  concepts.forEach(c => lines.push(serialiseConcept(c, useKeywords)));

  // Instances are treated as Concept instances — no dedicated .tmk block defined
  // in the field spec, so we emit them as comments to preserve the data visibly
  // without inventing a new keyword.
  if (instances.length > 0) {
    lines.push(`(* Instances *)`);
    instances.forEach((inst: any) => {
      const valStr = inst.values ? JSON.stringify(inst.values) : '';
      lines.push(`(* Instance: ${inst.name ?? ''} : ${inst.concept ?? ''}${valStr ? ' = ' + valStr : ''} *)`);
    });
    lines.push('');
  }

  relations.forEach(r => lines.push(serialiseRelation(r, useKeywords)));
  triples.forEach(t   => lines.push(serialiseTriple(t,   useKeywords)));
  assertions.forEach(a => lines.push(serialiseAssertion(a, useKeywords)));

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * serialiseTMK(taskData, methodData, knowledgeData, useKeywords)
 *
 * Combines all three model slices into a single .tmk document string.
 * Any slice that is empty (or undefined) is simply omitted.
 *
 * @param taskData      --> contents of formDataByTab[0]
 * @param methodData    --> contents of formDataByTab[1]
 * @param knowledgeData --> contents of formDataByTab[2]
 * @param useKeywords   --> true --> keyword args; false --> positional args
 */
export function serialiseTMK(
  taskData:      any,
  methodData:    any,
  knowledgeData: any,
  useKeywords:   boolean,
): string {
  const sections: string[] = [];

  const taskSection      = serialiseTaskModel(taskData,      useKeywords);
  const methodSection    = serialiseMethodModel(methodData,   useKeywords);
  const knowledgeSection = serialiseKnowledgeModel(knowledgeData, useKeywords);

  if (taskSection)      sections.push(taskSection);
  if (methodSection)    sections.push(methodSection);
  if (knowledgeSection) sections.push(knowledgeSection);

  if (sections.length === 0) {
    return '(* Empty TMK model — fill in the forms and export again. *)\n';
  }

  // File-level header comment
  const header = `(* TMK Model — exported by TMK Modeller *)\n`;
  return header + '\n' + sections.join('\n\n');
}
