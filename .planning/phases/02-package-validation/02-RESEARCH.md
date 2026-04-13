# Phase 2: Package & Validation - Research

**Researched:** 2026-04-13
**Domain:** npm package infrastructure, runtime input validation, TypeScript guard patterns
**Confidence:** HIGH

## Summary

Phase 2 covers two distinct concerns: (1) finishing npm package infrastructure so the library is publishable (LICENSE, .gitignore .env entry, real package.json metadata), and (2) adding runtime input validation to all public API methods. The validation work is the bulk of the effort -- every public method on `IntentMap` and the `createIntentMap()` factory need guard clauses that throw descriptive errors on invalid input.

The existing codebase currently has zero `throw` statements. This phase introduces the throw pattern. The `IntentMap` class in `src/IntentMap.ts` is the single file where most validation logic lands, plus `src/index.ts` for the factory function validation. No changes to the matching engine (`matcher.ts`, `embeddings.ts`, `tokenizer.ts`) are needed.

**Primary recommendation:** Use inline guard clauses with a shared `private guardNotDestroyed()` method. Do not introduce a validation library -- the zero-dep constraint rules out Zod/Valibot, and the validation is simple enough that hand-rolled guards are cleaner.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Author: "prajwalhg <prajwalgowda477@gmail.com>"
- GitHub: prajwalgowdahg/intentmap
- Update all placeholder fields in package.json: author, homepage, repository.url, bugs.url
- Prefix all errors with `[intentmap]` -- consistent with existing debug logging
- Include method name in error: `[intentmap] match() expected...`
- Include received value: `got null`, `got 42`, `got undefined`
- Error type varies by failure kind:
  - TypeError for wrong types or invalid values
  - Error for logic/state errors (destroyed state, intent not found)
- Standard config validation depth: validate required fields exist and correct types
- Check `config.intents` is an object (allow empty -- users may addIntent() later)
- Validate each intent entry: patterns must be a non-empty string array
- Validate optional fields have correct types when provided (defaultThreshold: number, caseSensitive: boolean, debug: boolean)
- Do NOT reject unknown properties -- don't be opinionated about extras
- All public methods throw after destroy() -- no exceptions, not even read-only ones
- destroy() itself is idempotent -- second call is a silent no-op
- Track state with a simple `private destroyed = false` boolean flag
- Destroy-state errors use `Error` (not TypeError): `[intentmap] match() called after destroy()`

### Claude's Discretion
- Exact validation helper implementation (inline checks vs extracted validation functions)
- Whether to validate emit() and off() for destroyed state (they're less commonly called post-destroy)
- Order of validation checks in each method

### Deferred Ideas (OUT OF SCOPE)
- None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PKG-01 | `.gitignore` added covering `node_modules/`, `dist/`, `.env`, coverage | Already exists from Phase 1 but missing `.env` entry -- needs patch |
| PKG-02 | `LICENSE` file created with MIT text | Standard MIT template with author name and year |
| PKG-03 | `package-lock.json` generated and committed | Already exists -- verify it is committed in git |
| PKG-04 | Changeset config moved from root `config.json` to `.changeset/config.json` | Already done in Phase 1 -- verify only |
| PKG-05 | Placeholder `yourusername` and `Your Name` metadata replaced with real values | Locked decision: author, homepage, repository.url, bugs.url updates |
| VAL-01 | `createIntentMap()` validates config object shape, throws descriptive TypeError | Config validation pattern with nested object checks |
| VAL-02 | `match()` validates input is string, throws TypeError with `got X` format | Simple typeof guard clause |
| VAL-03 | `on()` validates intent name is string and handler is function | Two-argument typeof checks |
| VAL-04 | `addIntent()` validates name, patterns, and options | Name string check + IntentDefinition shape validation |
| VAL-05 | `train()` validates intent name exists and examples is non-empty array | String check + existence check + array validation |
| VAL-06 | `bind()` validates element is HTMLElement and options are valid | instanceof check for element, optional BindOptions validation |
| VAL-07 | `match()` enforces max input length (10,000 chars) returning no-match silently | Length check returning no-match result, NOT throwing |
| VAL-08 | All public methods guard against calls after destroy() | `destroyed` boolean flag + `guardNotDestroyed()` helper |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | ^5.5.4 | Runtime type narrowing via typeof/instanceof guards | Already in project, no new deps needed |
| Vitest | ^2.0.5 | Test runner for validation tests | Already in project, used for all tests |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None | - | - | Zero-dep constraint means no new dependencies |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline guards | Zod schema validation | Zod adds ~13KB dep, violates zero-dep constraint. Not viable. |
| Inline guards | Valibot tree-shakeable schemas | Still a dep. Overkill for simple type checks. |
| Inline guards | TypeScript assertion functions | Viable for extracted helpers, but adds indirection for minimal gain at this scale |

**Installation:**
```bash
# No new packages needed -- this phase is zero-dependency by design
```

## Architecture Patterns

### Recommended File Changes

```
src/
  IntentMap.ts     # Add: destroyed flag, guardNotDestroyed(), guards on every public method
  index.ts         # Add: validateConfig() in createIntentMap(), input validation
  types.ts         # No changes needed -- types already correct
tests/
  validation.test.ts   # NEW: all VAL-* tests (this phase)
```

### Pattern 1: Destroyed-State Guard (All Public Methods)
**What:** A private helper that throws if the instance is destroyed, called as the first line of every public method.
**When to use:** Every public method on IntentMap -- match, on, off, emit, bind, addIntent, removeIntent, train, getIntents.
**Example:**
```typescript
// In IntentMap class
private destroyed = false;

private guardNotDestroyed(methodName: string): void {
  if (this.destroyed) {
    throw new Error(`[intentmap] ${methodName}() called after destroy()`);
  }
}

// At the start of every public method:
match(input: string): MatchResult {
  this.guardNotDestroyed('match');
  // ... rest of method
}

// destroy() itself is idempotent:
destroy(): void {
  if (this.destroyed) return;  // silent no-op on second call
  this.destroyed = true;
  // ... existing cleanup logic
}
```

### Pattern 2: Type Guards with Descriptive Messages
**What:** Inline typeof/instanceof checks at method entry, throwing TypeError with the `[intentmap]` prefix.
**When to use:** Every public method that accepts parameters from external callers.
**Example:**
```typescript
match(input: string): MatchResult {
  this.guardNotDestroyed('match');
  if (typeof input !== 'string') {
    throw new TypeError(`[intentmap] match() expected a string, got ${input === null ? 'null' : typeof input}`);
  }
  // ... length check (VAL-07) returns no-match, does NOT throw
  if (input.length > 10_000) {
    return { matched: false, intent: null, confidence: 0, scores: {}, input };
  }
  return this.matcher.match(input);
}
```

### Pattern 3: Config Object Validation (createIntentMap)
**What:** Deep validation of the config object passed to createIntentMap(), checking required fields and nested intent definitions.
**When to use:** Only in createIntentMap() factory function.
**Example:**
```typescript
export function createIntentMap(config: unknown): IntentMapInstance {
  // Top-level type check
  if (typeof config !== 'object' || config === null) {
    throw new TypeError(`[intentmap] createIntentMap() expected a config object, got ${config === null ? 'null' : typeof config}`);
  }

  const cfg = config as Record<string, unknown>;

  // Required field: intents
  if (typeof cfg.intents !== 'object' || cfg.intents === null) {
    throw new TypeError(`[intentmap] createIntentMap() config.intents must be an object, got ${typeof cfg.intents}`);
  }

  // Validate each intent entry
  for (const [name, def] of Object.entries(cfg.intents as Record<string, unknown>)) {
    if (typeof def !== 'object' || def === null) {
      throw new TypeError(`[intentmap] createIntentMap() config.intents["${name}"] must be an object, got ${typeof def}`);
    }
    const intentDef = def as Record<string, unknown>;
    if (!Array.isArray(intentDef.patterns)) {
      throw new TypeError(`[intentmap] createIntentMap() config.intents["${name}"].patterns must be an array`);
    }
    if (intentDef.patterns.length === 0) {
      throw new TypeError(`[intentmap] createIntentMap() config.intents["${name}"].patterns must be a non-empty array`);
    }
    // Check each pattern is a string
    for (const p of intentDef.patterns) {
      if (typeof p !== 'string') {
        throw new TypeError(`[intentmap] createIntentMap() config.intents["${name}"].patterns must contain only strings`);
      }
    }
  }

  // Optional fields type checks
  if ('defaultThreshold' in cfg && cfg.defaultThreshold !== undefined && typeof cfg.defaultThreshold !== 'number') {
    throw new TypeError(`[intentmap] createIntentMap() config.defaultThreshold must be a number, got ${typeof cfg.defaultThreshold}`);
  }
  if ('caseSensitive' in cfg && cfg.caseSensitive !== undefined && typeof cfg.caseSensitive !== 'boolean') {
    throw new TypeError(`[intentmap] createIntentMap() config.caseSensitive must be a boolean, got ${typeof cfg.caseSensitive}`);
  }
  if ('debug' in cfg && cfg.debug !== undefined && typeof cfg.debug !== 'boolean') {
    throw new TypeError(`[intentmap] createIntentMap() config.debug must be a boolean, got ${typeof cfg.debug}`);
  }
  // Do NOT reject unknown properties

  return new IntentMap(config as IntentConfig);
}
```

### Anti-Patterns to Avoid
- **Validating with try/catch around method bodies:** Do not wrap entire methods in try/catch. Guards should be explicit early-throw checks at the top, then fall through to normal logic.
- **Throwing on oversized input (VAL-07):** The 10,000 char limit must return a no-match result silently, NOT throw. Throwing on long input would break callers who handle user-provided text.
- **Validating inside the Matcher class:** Validation belongs in IntentMap (the public API surface), not in internal classes like Matcher. Matcher can trust its inputs.
- **Using `any` type for validation:** Use `unknown` at API boundaries and narrow with guards. This matches TypeScript best practices for library public APIs.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema validation library | Custom validation DSL or schema system | Inline typeof/instanceof guards | The validation is simple shape checks; a schema system would be over-engineering and risk bugs |
| Error message formatting | Templating system | String template literals | Only ~10 error messages needed; template literals are sufficient |
| Destroy lifecycle | EventEmitter-based state machine | Simple boolean flag | A boolean flag is the standard pattern used by RxJS, Three.js, etc. for this exact use case |

**Key insight:** This phase is deliberately low-complexity infrastructure. The validation rules are straightforward type checks. The pitfall is not technical difficulty -- it is completeness (missing a method, forgetting a guard) and consistency (error message format drift).

## Common Pitfalls

### Pitfall 1: Forgetting to Guard a Method
**What goes wrong:** A method like `getIntents()` or `off()` might seem "safe" post-destroy, but the locked decision says ALL public methods must throw.
**Why it happens:** Developer assumes read-only methods are harmless after destroy.
**How to avoid:** Enumerate every public method from `IntentMapInstance` interface in types.ts and add the guard to each. The interface has: match, on, off, emit, bind, addIntent, removeIntent, train, getIntents, destroy (destroy is exempt -- it's idempotent).
**Warning signs:** If a test calls a method after destroy() and it doesn't throw, a guard is missing.

### Pitfall 2: Breaking Existing Tests
**What goes wrong:** Adding validation changes behavior that existing tests depend on. For example, if any test passes unusual values to public methods.
**Why it happens:** Validation is a breaking change by nature -- it makes previously silent failures loud.
**How to avoid:** Review all existing tests in `tests/intentmap.test.ts` before adding guards. The existing tests all use well-formed inputs, so this should be safe. Run `npm run test` after each validation addition.
**Warning signs:** Any test in the existing 26 tests failing after validation is added.

### Pitfall 3: Wrong Error Type for Destroyed State
**What goes wrong:** Using TypeError instead of Error for destroyed-state errors.
**Why it happens:** Muscle memory -- most validation throws TypeError.
**How to avoid:** The locked decision specifies Error (not TypeError) for destroy-state: `[intentmap] match() called after destroy()`. Only TypeError for wrong types/invalid values.
**Warning signs:** Tests checking for `instanceof Error` when they should check for both, or vice versa.

### Pitfall 4: Throwing on Oversized Input Instead of Returning No-Match
**What goes wrong:** VAL-07 says match() should "silently return no-match for input exceeding 10,000 characters." Throwing would crash callers.
**Why it happens:** It feels like validation, so the instinct is to throw.
**How to avoid:** This is NOT a validation error -- it's a safety limit. Return the standard no-match result: `{ matched: false, intent: null, confidence: 0, scores: {}, input }`.
**Warning signs:** Any throw from match() on a string longer than 10,000 characters.

### Pitfall 5: .gitignore Missing .env Entry
**What goes wrong:** The current `.gitignore` covers `node_modules/`, `dist/`, `coverage/` but does NOT include `.env` as required by PKG-01.
**Why it happens:** Phase 1 added a .gitignore but didn't include all required entries.
**How to avoid:** Add `.env` to the existing .gitignore. The requirement says "covering node_modules/, dist/, .env, coverage."
**Warning signs:** PKG-01 specifically lists these four entries.

### Pitfall 6: Config Validation Rejects Empty Intents Object
**What goes wrong:** Rejecting `createIntentMap({ intents: {} })` even though the locked decision says "allow empty intents object -- users may addIntent() later."
**Why it happens:** A non-empty check feels natural for intents.
**How to avoid:** Validate that `intents` is an object (not null, not array), but do NOT check that it has entries. The current code's `for (const [name, def] of Object.entries(config.intents))` already handles empty objects gracefully (loop body never executes).
**Warning signs:** TypeError thrown when `intents: {}` is passed.

## Code Examples

Verified patterns from the existing codebase and standard TypeScript practices:

### Destroyed-State Guard Helper
```typescript
// Pattern: private guard + boolean flag in IntentMap.ts
private destroyed = false;

private guardNotDestroyed(methodName: string): void {
  if (this.destroyed) {
    throw new Error(`[intentmap] ${methodName}() called after destroy()`);
  }
}

// Idempotent destroy
destroy(): void {
  if (this.destroyed) return;
  this.destroyed = true;
  // existing cleanup logic unchanged
  for (const [, cleanupFns] of this.boundElements) {
    cleanupFns.forEach((fn) => fn());
  }
  this.boundElements.clear();
  this.handlers.clear();
  this.wildcardHandlers.clear();
  this.matcher.clear();
}
```

### Typeof Guard for match() (VAL-02)
```typescript
match(input: string): MatchResult {
  this.guardNotDestroyed('match');
  if (typeof input !== 'string') {
    throw new TypeError(
      `[intentmap] match() expected a string, got ${input === null ? 'null' : typeof input}`
    );
  }
  // VAL-07: max input length -- returns no-match, does NOT throw
  if (input.length > 10_000) {
    return { matched: false, intent: null, confidence: 0, scores: {}, input };
  }
  return this.matcher.match(input);
}
```

### on() Validation (VAL-03)
```typescript
on(intent: string, handler: IntentHandler): () => void {
  this.guardNotDestroyed('on');
  if (typeof intent !== 'string') {
    throw new TypeError(`[intentmap] on() expected intent name as a string, got ${typeof intent}`);
  }
  if (typeof handler !== 'function') {
    throw new TypeError(`[intentmap] on() expected handler as a function, got ${typeof handler}`);
  }
  // existing logic unchanged
}
```

### train() Validation (VAL-05)
```typescript
train(intent: string, examples: string[]): void {
  this.guardNotDestroyed('train');
  if (typeof intent !== 'string') {
    throw new TypeError(`[intentmap] train() expected intent name as a string, got ${typeof intent}`);
  }
  if (!Array.isArray(examples) || examples.length === 0) {
    throw new TypeError(`[intentmap] train() expected a non-empty array of examples`);
  }
  // Optional: check if intent exists in matcher
  if (!this.matcher.getIntents().includes(intent)) {
    throw new Error(`[intentmap] train() intent "${intent}" not found`);
  }
  // existing logic: this.matcher.train(intent, examples)
}
```

### bind() Validation (VAL-06)
```typescript
bind(element: HTMLElement, options: BindOptions = {}): () => void {
  this.guardNotDestroyed('bind');
  // HTMLElement check -- use instanceof, but note jsdom environments
  // For robustness, check for typeof element.addEventListener as fallback
  if (!(element instanceof HTMLElement)) {
    throw new TypeError(`[intentmap] bind() expected an HTMLElement, got ${typeof element}`);
  }
  if (typeof options !== 'object' || options === null) {
    throw new TypeError(`[intentmap] bind() expected options as an object, got ${typeof options}`);
  }
  // existing logic unchanged
}
```

### MIT LICENSE Template
```
MIT License

Copyright (c) 2026 prajwalhg

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Package.json Metadata Updates
```json
{
  "author": "prajwalhg <prajwalgowda477@gmail.com>",
  "homepage": "https://github.com/prajwalgowdahg/intentmap#readme",
  "repository": {
    "type": "git",
    "url": "https://github.com/prajwalgowdahg/intentmap.git"
  },
  "bugs": {
    "url": "https://github.com/prajwalgowdahg/intentmap/issues"
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `typeof x === 'object' && x !== null` | Same pattern -- no better option in plain TS | N/A | Still the standard for zero-dep libraries |
| Custom error hierarchies | Plain Error/TypeError with descriptive messages | Standard practice | Simpler is better for library errors |
| Input length throws | Input length returns sentinel value | Modern trend | Prevents crashes in user-facing code |

**Deprecated/outdated:**
- Using `console.assert()` for validation: Stripped in production builds, silently passes. Use throw instead.
- Returning error objects instead of throwing: The codebase currently doesn't throw, but the requirement explicitly mandates throw.

## Open Questions

1. **HTMLElement validation in non-browser environments**
   - What we know: `instanceof HTMLElement` works in jsdom (used by vitest with jsdom env), but may fail in pure Node.js where HTMLElement is not globally defined.
   - What's unclear: Whether vitest tests will run in a jsdom or happy-dom environment for bind() tests.
   - Recommendation: Use `instanceof HTMLElement` for now. Phase 3 (DOM Binding) or Phase 6 (Tests) will set up the proper jsdom environment. For Phase 2, bind() is tested through the existing test suite which doesn't exercise bind() directly.

2. **emit() and off() destroy guards -- Claude's discretion**
   - What we know: These are less commonly called post-destroy, but the locked decision says "all public methods."
   - What's unclear: Whether "all" truly means all, or whether emit/off have edge cases.
   - Recommendation: Guard them. The decision says no exceptions. It's two extra lines and prevents subtle bugs.

3. **package-lock.json already exists**
   - What we know: The file exists in the working directory.
   - What's unclear: Whether it is tracked by git (the project is currently NOT a git repo per env info).
   - Recommendation: When git is initialized, ensure package-lock.json is committed. The .gitignore does not exclude it.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^2.0.5 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PKG-01 | .gitignore covers node_modules, dist, .env, coverage | manual-only | `cat .gitignore` | Yes (needs .env addition) |
| PKG-02 | LICENSE file exists with MIT text | manual-only | `cat LICENSE` | No -- Wave 0 |
| PKG-03 | package-lock.json committed | manual-only | `git ls-files package-lock.json` | No (git not initialized) |
| PKG-04 | .changeset/config.json exists | manual-only | `cat .changeset/config.json` | Yes (done in Phase 1) |
| PKG-05 | package.json has real author/URLs | manual-only | `node -e "console.log(JSON.stringify(require('./package.json').author))"` | No -- Wave 0 |
| VAL-01 | createIntentMap() throws TypeError on invalid config | unit | `npx vitest run tests/validation.test.ts -t "createIntentMap"` | No -- Wave 0 |
| VAL-02 | match() throws TypeError on non-string input | unit | `npx vitest run tests/validation.test.ts -t "match"` | No -- Wave 0 |
| VAL-03 | on() validates intent name and handler | unit | `npx vitest run tests/validation.test.ts -t "on"` | No -- Wave 0 |
| VAL-04 | addIntent() validates name, patterns, options | unit | `npx vitest run tests/validation.test.ts -t "addIntent"` | No -- Wave 0 |
| VAL-05 | train() validates intent name exists, examples non-empty array | unit | `npx vitest run tests/validation.test.ts -t "train"` | No -- Wave 0 |
| VAL-06 | bind() validates element and options | unit | `npx vitest run tests/validation.test.ts -t "bind"` | No -- Wave 0 |
| VAL-07 | match() returns no-match for >10k chars | unit | `npx vitest run tests/validation.test.ts -t "10"` | No -- Wave 0 |
| VAL-08 | All public methods throw after destroy() | unit | `npx vitest run tests/validation.test.ts -t "destroy"` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite + lint + typecheck: `npx vitest run && npm run lint && npm run typecheck`

### Wave 0 Gaps
- [ ] `tests/validation.test.ts` -- covers VAL-01 through VAL-08 (all validation tests)
- [ ] `LICENSE` -- MIT license file creation (manual-only, no test needed)
- [ ] `.gitignore` -- add `.env` entry to existing file
- [ ] `package.json` -- update author, homepage, repository.url, bugs.url fields
- [ ] Verify `package-lock.json` is git-tracked (project not yet a git repo)

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/IntentMap.ts`, `src/index.ts`, `src/types.ts` -- full understanding of current API surface and implementation
- `vitest.config.ts` -- test infrastructure configuration
- `.changeset/config.json` -- already in correct location
- `.gitignore` -- current entries reviewed

### Secondary (MEDIUM confidence)
- TypeScript best practices for guard clauses and TypeError vs Error distinction -- well-established patterns used by RxJS, Node.js built-ins, and major libraries
- MIT License standard text -- SPDX-identified, universally recognized format
- npm package.json metadata conventions -- documented in npm official docs

### Tertiary (LOW confidence)
- None -- this phase's domain is well-established and verified against the actual codebase

## Metadata

**Confidence breakdown:**
- Package infrastructure: HIGH -- straightforward file creation and metadata edits, existing codebase fully read
- Validation patterns: HIGH -- standard TypeScript patterns, codebase fully analyzed, all methods identified
- Test structure: HIGH -- vitest already configured, test file structure follows existing pattern
- Pitfalls: HIGH -- identified from code analysis and the locked decisions in CONTEXT.md

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (stable domain, no fast-moving dependencies)
