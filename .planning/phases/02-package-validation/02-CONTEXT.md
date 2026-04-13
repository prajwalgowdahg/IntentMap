# Phase 2: Package & Validation - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Two concerns: (1) finish npm package infrastructure so the package is publishable (LICENSE, package-lock.json, real metadata), and (2) add input validation to all public API methods so invalid usage gets clear errors instead of silent failures or crashes. This phase does NOT change the matching engine behavior — only adds guards and infrastructure.

</domain>

<decisions>
## Implementation Decisions

### Package metadata
- Author: "prajwalhg <prajwalgowda477@gmail.com>"
- GitHub: prajwalgowdahg/intentmap
- Update all placeholder fields in package.json: author, homepage, repository.url, bugs.url

### Error message style
- Prefix all errors with `[intentmap]` — consistent with existing debug logging
- Include method name in error: `[intentmap] match() expected...`
- Include received value: `got null`, `got 42`, `got undefined`
- Error type varies by failure kind:
  - TypeError for wrong types or invalid values
  - Error for logic/state errors (destroyed state, intent not found)

### Config validation depth
- Standard depth: validate required fields exist and correct types
- Check `config.intents` is a non-empty object (actually: allow empty intents object — users may addIntent() later)
- Validate each intent entry: patterns must be a non-empty string array
- Validate optional fields have correct types when provided (defaultThreshold: number, caseSensitive: boolean, debug: boolean)
- Do NOT reject unknown properties — don't be opinionated about extras

### Destroy-state behavior
- All public methods throw after destroy() — no exceptions, not even read-only ones
- destroy() itself is idempotent — second call is a silent no-op
- Track state with a simple `private destroyed = false` boolean flag
- Destroy-state errors use `Error` (not TypeError): `[intentmap] match() called after destroy()`

### Claude's Discretion
- Exact validation helper implementation (inline checks vs extracted validation functions)
- Whether to validate emit() and off() for destroyed state (they're less commonly called post-destroy)
- Order of validation checks in each method

</decisions>

<code_context>
## Existing Code Insights

### Already Complete (from Phase 1)
- PKG-01 (.gitignore) — added during Phase 1 restructure
- PKG-04 (changeset config) — moved to `.changeset/config.json` during Phase 1
- Build pipeline fully operational — validation code must not break it

### Reusable Assets
- `src/IntentMap.ts`: All public methods are in a single class — validation can be added as guard clauses at method entry points
- `src/index.ts`: `createIntentMap()` and `defineIntent()` factory functions — validation goes here for config
- `src/types.ts`: All interfaces already defined with TypeScript types — runtime validation mirrors the type contracts
- Debug prefix pattern: `console.debug('[intentmap]', ...)` already in IntentMap.ts constructor

### Established Patterns
- No error throwing in current codebase — functions return result objects. This phase INTRODUCES the throw pattern.
- Null-safe access with optional chaining already used internally
- Guard patterns for empty states already present (e.g., `if (!text) return` in bind)

### Integration Points
- `src/index.ts` — createIntentMap() is the factory entry point
- `src/IntentMap.ts` — all instance methods (match, on, off, bind, addIntent, removeIntent, train, getIntents, emit, destroy)
- Existing tests must still pass — validation should not break any current test inputs

</code_context>

<specifics>
## Specific Ideas

- The `[intentmap]` prefix matches the existing debug logging style — keeps error messages consistent
- destroy() idempotency is important for React cleanup patterns where useEffect may call cleanup twice in StrictMode

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-package-validation*
*Context gathered: 2026-04-13*
