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
 * This module always emits one style or the other - never mixed - per block,
 * controlled by the `useKeywords` flag passed to `serialise()`.
 *
 * Relationship to the schemas:
 *   Task model   --> Goal(…) blocks       (Tasks are Goals in .tmk vocabulary)
 *   Method model --> Mechanism(…) blocks (atomic) | O`rganizer(…) + State(…) +
 *                  Transition(…) blocks (non-atomic)
 *   Knowledge    --> Concept(…) / Relation(…) / Triple(…) / Assertion(…) blocks
 *
 * Fields with no data are emitted as "" (string) or {} (set/list) as
 * appropriate - the format does not enforce required fields at this stage.
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
 *   (name), source_state, target_state, data_condition
 */
function serialiseTransition(transition: any, useKeywords: boolean): string {
  const name      = transition.name          ?? '';
  const source    = transition.sourceState   ?? '';
  const target    = transition.targetState   ?? '';
  const condition = transition.dataCondition ?? '';

  if (useKeywords) {
    const pairs: [string, string][] = [];
    if (name) pairs.push(['name', q(name)]);
    pairs.push(['source_state', q(source)], ['target_state', q(target)], ['data_condition', q(condition)]);
    return keywordBlock('Transition', pairs);
  }

  return name
    ? positionalBlock('Transition', [q(name), q(source), q(target), q(condition)])
    : positionalBlock('Transition', [q(source), q(target), q(condition)]);
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

  // Instances are treated as Concept instances - no dedicated .tmk block defined
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
    return '(* Empty TMK model - fill in the forms and export again. *)\n';
  }

  // File-level header comment
  const header = `(* TMK Model - exported by TMK Modeller *)\n`;
  return header + '\n' + sections.join('\n\n');
}

// ===========================================================================
// DESERIALISER  (.tmk → JSON)
// ===========================================================================

// ---------------------------------------------------------------------------
// Parsing primitives
// ---------------------------------------------------------------------------

/**
 * Unquote a "..." string and unescape backslashes.
 * If the value has no surrounding quotes it is returned trimmed as-is
 * (bare identifiers are valid in several .tmk positions).
 */
function unquote(raw: string): string {
  if (raw === undefined || raw === null) return '';
  const t = raw.trim();
  if (t.startsWith('"') && t.endsWith('"')) {
    return t.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  return t;
}

/**
 * Character-level argument splitter.
 * Splits on commas that are NOT inside (), {}, or "".
 * Handles escape sequences inside strings.
 * This is the single most critical primitive - everything else depends on it.
 */
function splitArgs(src: string): string[] {
  const out: string[] = [];
  let cur = '';
  let depth = 0;   // combined () and {} nesting level
  let inStr = false;
  let esc   = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];

    if (esc)              { cur += ch; esc = false; continue; }
    if (ch === '\\')      { esc = true; cur += ch;  continue; }
    if (ch === '"')       { inStr = !inStr; cur += ch; continue; }
    if (inStr)            { cur += ch; continue; }

    if (ch === '(' || ch === '{') { depth++; cur += ch; continue; }
    if (ch === ')' || ch === '}') { depth--; cur += ch; continue; }

    if (ch === ',' && depth === 0) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/**
 * Unwrap a set literal  {a, b, c}  →  ['a', 'b', 'c']
 * Returns [] for '{}' or missing values.
 */
function unwrapSet(raw: string | undefined): string[] {
  if (!raw) return [];
  const t = raw.trim();
  if (!t || t === '{}') return [];
  if (t.startsWith('{') && t.endsWith('}')) {
    return splitArgs(t.slice(1, -1)).filter(s => s.length > 0);
  }
  // Bare identifier (no braces) - treat as single-element set
  return [t];
}

/**
 * Invert paramSet():  {(name, Type), …}  →  ["name: Type", …]
 * A tuple with no type  (name)  →  ["name"]
 */
function unwrapParams(raw: string | undefined): string[] {
  return unwrapSet(raw).map(item => {
    const t = item.trim();
    if (t.startsWith('(') && t.endsWith(')')) {
      const parts = splitArgs(t.slice(1, -1));
      const name  = unquote(parts[0] ?? '');
      const type  = parts[1] ? unquote(parts[1]) : '';
      return type ? `${name}: ${type}` : name;
    }
    return unquote(t);
  });
}

// ---------------------------------------------------------------------------
// Block-level argument resolution
// ---------------------------------------------------------------------------

/**
 * Positional field name lists - mirror FIELDS in the serialiser.
 * These are used when a block's arguments have no `key=` prefix.
 */
const POSITIONAL_FIELDS: Record<string, string[]> = {
  Goal:       ['name', 'description', 'category', 'input_parameters', 'output_parameters', 'givens', 'makes', 'means'],
  Operation:  ['name', 'description', 'input_parameters', 'output_parameters', 'requires', 'provides'],
  Organizer:  ['name', 'description', 'input_parameters', 'output_parameters', 'requires', 'provides', 'states', 'transitions', 'start_state', 'success_state', 'failure_state'],
  State:      ['name', 'description', 'task_invocation'],
  Transition: ['source_state', 'target_state', 'data_condition'],
  Concept:    ['name', 'description', 'super_concepts', 'properties'],
  Relation:   ['name', 'description', 'domain', 'range'],
  Triple:     ['subject', 'predicate', 'object'],
  Assertion:  ['name', 'description', 'property', 'equivalent_to'],
};

/**
 * Resolve the raw argument list of a block into a key→rawValue map.
 * Supports keyword args (`key=val`), positional args, and mixed
 * (keyword args must follow all positional args, matching Python's rule).
 */
function resolveArgs(keyword: string, rawArgs: string[]): Record<string, string> {
  let fields = POSITIONAL_FIELDS[keyword] ?? []; // Might be reassigned below...

  // The .tmk format allows Transition to be called with an optional leading
  // name argument: Transition(name, source, target, condition) - 4 positional args.
  // Detect this by checking for 4 args with no keyword syntax and promote fields.
  if (
    keyword === 'Transition' &&
    rawArgs.length === 4 &&
    !rawArgs.some(a => /^[a-zA-Z_][a-zA-Z0-9_]*\s*=/.test(a))
  ) {
    fields = ['name', 'source_state', 'target_state', 'data_condition'];
  }
  
  const result: Record<string, string> = {};
  let posIdx = 0;

  for (const arg of rawArgs) {
    // Keyword arg detection: starts with an identifier then '='
    // We must not mistake a set/tuple containing '=' for a keyword arg,
    // so we only look at the text before the first '(' or '{'.
    const kMatch = arg.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=([\s\S]*)$/);
    if (kMatch) {
      result[kMatch[1].trim()] = kMatch[2].trim();
    } else {
      const key = fields[posIdx];
      if (key) result[key] = arg;
      posIdx++;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Block converters  (raw args --> JSON object)
// ---------------------------------------------------------------------------

function parseGoal(args: Record<string, string>): any {
  // means: a bare set of mechanism-reference identifiers
  const meansRaw = unwrapSet(args.means);
  const means = meansRaw.map(m => ({
    mechanismReference: unquote(m),
    actualArguments:    [],
  }));

  return {
    name:             unquote(args.name),
    description:      unquote(args.description),
    inputParameters:  unwrapParams(args.input_parameters),
    outputParameters: unwrapParams(args.output_parameters),
    given:            unquote(args.givens),
    makes:            unquote(args.makes),
    means,
  };
}

function parseOperation(args: Record<string, string>): any {
  return {
    name:             unquote(args.name),
    description:      unquote(args.description),
    inputParameters:  unwrapParams(args.input_parameters),
    outputParameters: unwrapParams(args.output_parameters),
    requires:         unquote(args.requires),
    provides:         unquote(args.provides),
  };
}

function parseOrganizerHeader(args: Record<string, string>): any {
  // Returns a Method object with an embedded (initially empty) organizer.
  return {
    name:             unquote(args.name),
    description:      unquote(args.description),
    inputParameters:  unwrapParams(args.input_parameters),
    outputParameters: unwrapParams(args.output_parameters),
    requires:         unquote(args.requires),
    provides:         unquote(args.provides),
    organizer: {
      startState:   unquote(args.start_state),
      successState: unquote(args.success_state),
      failureState: unquote(args.failure_state),
      states:       [],
      transitions:  [],
    },
  };
}

function parseState(args: Record<string, string>): any {
  // task_invocation: (goalReference, arg1, arg2, …)
  let goalReference    = '';
  let actualArguments: string[] = [];

  const inv = (args.task_invocation ?? '').trim();
  if (inv.startsWith('(') && inv.endsWith(')')) {
    const parts = splitArgs(inv.slice(1, -1));
    goalReference   = unquote(parts[0] ?? '');
    actualArguments = parts.slice(1).map(unquote);
  } else if (inv) {
    goalReference = unquote(inv);
  }

  return {
    name: unquote(args.name),
    goalInvocation: { goalReference, type: 'task', actualArguments },
  };
}

function parseTransition(args: Record<string, string>): any {
  return {
    sourceState:   unquote(args.source_state),
    targetState:   unquote(args.target_state),
    dataCondition: unquote(args.data_condition),
  };
}

function parseConcept(args: Record<string, string>): any {
  // Properties: {Property("name", "type", "default"), …}
  const properties = unwrapSet(args.properties).map(p => {
    const t = p.trim();
    // Match Property(…) - case-insensitive, tolerant of spacing
    const m = t.match(/^[Pp]roperty\s*\(([\s\S]*)\)$/);
    if (m) {
      const parts = splitArgs(m[1]);
      return { name: unquote(parts[0] ?? ''), type: unquote(parts[1] ?? '') };
    }
    // Bare identifier - treat as name with empty type
    return { name: unquote(t), type: '' };
  });

  return {
    name:         unquote(args.name),
    description:  unquote(args.description),
    superConcept: unwrapSet(args.super_concepts).map(unquote),
    properties,
  };
}

function parseRelation(args: Record<string, string>): any {
  return {
    name:        unquote(args.name),
    description: unquote(args.description),
    domain:      unquote(args.domain),
    range:       unquote(args.range),
  };
}

function parseTriple(args: Record<string, string>): any {
  return {
    instance1: unquote(args.subject),
    relation:  unquote(args.predicate),
    instance2: unquote(args.object),
  };
}

function parseAssertion(args: Record<string, string>): any {
  return {
    name:         unquote(args.name),
    description:  unquote(args.description),
    equivalentTo: unquote(args.equivalent_to),
  };
}

// ---------------------------------------------------------------------------
// Public result type + main entry point
// ---------------------------------------------------------------------------

export interface TMKParsed {
  task:      { model: 'Task';      tasks:    any[] };
  method:    { model: 'Method';    methods:  any[] };
  knowledge: {
    model:      'Knowledge';
    concepts:   any[];
    instances:  any[];
    relations:  any[];
    triples:    any[];
    assertions: any[];
  };
}

/**
 * deserialiseTMK(fileContent)
 *
 * Parses a .tmk document and returns the three JSON slices that map
 * directly onto formDataByTab[0..2].
 *
 * Design notes:
 *   • Comments (* … *) are stripped first so they never confuse the parser.
 *   • Instances have no formal .tmk block; they are preserved as structured
 *     comments by the serialiser and recovered with a targeted regex before
 *     comment stripping.
 *   • State and Transition blocks bind to the most recently seen Organizer,
 *     which mirrors the ordering guarantee enforced by serialiseOrganizer().
 *   • The parser is deliberately lenient: unknown block keywords are silently
 *     skipped so hand-authored .tmk files with extra constructs load cleanly.
 */
export function deserialiseTMK(fileContent: string): TMKParsed {
  const result: TMKParsed = {
    task:      { model: 'Task',      tasks:    [] },
    method:    { model: 'Method',    methods:  [] },
    knowledge: { model: 'Knowledge', concepts: [], instances: [], relations: [], triples: [], assertions: [] },
  };

  // --- 1. Recover instances from their structured comments -----------------
  // The serialiser emits:  (* Instance: name : concept[ = {"k":"v"}] *)
  const instanceRx = /\(\*\s*Instance:\s*(\S+)\s*:\s*(\S+)(?:\s*=\s*(.*?))?\s*\*\)/g;
  let im: RegExpExecArray | null;
  while ((im = instanceRx.exec(fileContent)) !== null) {
    let values: any = undefined;
    if (im[3]) {
      try { values = JSON.parse(im[3].trim()); } catch { /* malformed - drop values */ }
    }
    result.knowledge.instances.push({
      name:    im[1].trim(),
      concept: im[2].trim(),
      ...(values !== undefined ? { values } : {}),
    });
  }

  // --- 2. Strip all comments -----------------------------------------------
  const src = fileContent.replace(/\(\*[\s\S]*?\*\)/g, '');

  // --- 3. Walk every top-level block  Keyword( … ); -----------------------
  // The regex captures the keyword and the raw interior of the parens.
  // It is non-greedy and anchored to the closing "); so nested parens in
  // argument values are handled by splitArgs, not by this regex.
  const blockRx = /\b([A-Z][a-zA-Z]*)\s*\(\s*([\s\S]*?)\s*\)\s*;/g;
  let bm: RegExpExecArray | null;

  // The active organizer's inner object - State/Transition blocks push here.
  let activeOrg: { states: any[]; transitions: any[] } | null = null;

  while ((bm = blockRx.exec(src)) !== null) {
    const keyword = bm[1];
    const rawArgs = splitArgs(bm[2]);
    const args    = resolveArgs(keyword, rawArgs);

    switch (keyword) {
      case 'Goal':
        activeOrg = null;
        result.task.tasks.push(parseGoal(args));
        break;

      case 'Operation':
        activeOrg = null;
        result.method.methods.push(parseOperation(args));
        break;

      case 'Organizer': {
        const method = parseOrganizerHeader(args);
        result.method.methods.push(method);
        // Bind subsequent State/Transition blocks to this organizer
        activeOrg = method.organizer;
        break;
      }

      case 'State':
        // Only attach if an Organizer has been seen and not yet closed
        if (activeOrg) activeOrg.states.push(parseState(args));
        break;

      case 'Transition':
        if (activeOrg) activeOrg.transitions.push(parseTransition(args));
        break;

      case 'Concept':
        activeOrg = null;
        result.knowledge.concepts.push(parseConcept(args));
        break;

      case 'Relation':
        activeOrg = null;
        result.knowledge.relations.push(parseRelation(args));
        break;

      case 'Triple':
        activeOrg = null;
        result.knowledge.triples.push(parseTriple(args));
        break;

      case 'Assertion':
        activeOrg = null;
        result.knowledge.assertions.push(parseAssertion(args));
        break;

      // All other capitalised identifiers (e.g. Property inside a Concept
      // argument, or future keywords) are skipped - they are consumed as
      // part of their parent argument string, not as top-level blocks.
      default:
        break;
    }
  }

  return result;
}
