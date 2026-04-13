# Phase 4: React Adapter - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Harden React hooks (`useIntentMap`, `useIntent`, `useIntentBind`) with stale closure fixes, proper cleanup, and graceful destroyed-state handling. Four requirements (RCT-01 through RCT-04). This phase does NOT change the core IntentMap engine — only the React adapter layer in `src/adapters/react.ts` and the `IntentMapInstance` interface (for the `isAlive()` addition).

</domain>

<decisions>
## Implementation Decisions

### Stale closure fix (RCT-02)
- Use `useRef` to store the latest handler reference
- Create a stable wrapper function that reads from the ref — subscribes once, always calls latest handler
- Dependency array: `[im, intent]` only — no handler, no custom deps
- **Breaking API change:** Remove the `deps` parameter from `useIntent` entirely. The `useRef` wrapper makes it unnecessary. Acceptable per PROJECT.md constraint ("Breaking changes OK at v0.x")
- Subscription is stable until `im` instance or `intent` name changes — then re-subscribe with new stable wrapper

### Destroyed instance handling (RCT-04)
- Add `isAlive()` getter (or `destroyed` property) to `IntentMapInstance` interface so hooks can check state before calling methods
- Hooks check `isAlive()` before calling core methods — if destroyed, log `console.warn` and return early (no crash)
- Warn always, even during React 18 StrictMode double-invoke cycles — keeps behavior consistent
- `useIntentMap` always returns the IntentMapInstance, even if destroyed — consumers get a consistent type
- Implementation: add `get isAlive() { return !this.destroyed }` to IntentMap class, add to IntentMapInstance interface

### useIntentMap re-creation (RCT-01)
- API: `useIntentMap(config, key?)` — second optional parameter
- Only an explicit `key` change triggers re-creation — config changes are ignored (useRef pattern)
- On key change: destroy old instance, create new one with same config
- Without key: behaves exactly as today (create once, never re-create)
- Always return the IntentMapInstance — never null

### Claude's Discretion
- RCT-03 (useIntentBind cleanup): Store the unbind function from `bind()`, call it in a useEffect cleanup on unmount
- Exact ref management pattern in useIntent (inline vs extracted helper)
- Whether to add `isAlive` as a getter or a method on IntentMapInstance

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/adapters/react.ts`: All three hooks exist — this phase modifies them in place
- `src/types.ts:IntentMapInstance`: Interface that hooks depend on — needs `isAlive` addition
- `src/IntentMap.ts`: Class implementing IntentMapInstance — needs `isAlive` getter

### Current Hook Issues
- **useIntentMap** (line 10-17): Uses `useRef` to store instance, creates once, never re-creates. No `key` prop. Destroy cleanup in useEffect.
- **useIntent** (line 19-29): `handler` in dependency array causes re-subscription on every render if handler is an inline function. Also accepts `deps` parameter that compounds the problem.
- **useIntentBind** (line 31-62): `bindRef` callback calls `im.bind(element, ...)` but discards the returned unbind function. No cleanup on unmount. Also subscribes to wildcard handler via `im.on('*')` but doesn't guard against destroyed instance.

### Established Patterns
- React is a peer dependency, not a runtime dep (zero-dep constraint maintained)
- Hooks import from `../index.js` (createIntentMap) and `../types.js` (types)
- Error messages use `[intentmap]` prefix (established in Phase 2)
- `destroy()` is idempotent — safe to call multiple times (Phase 2)

### Integration Points
- `src/types.ts:IntentMapInstance` — add `isAlive` getter/method
- `src/IntentMap.ts` — implement `isAlive` getter on the class
- `src/adapters/react.ts` — rewrite all three hooks
- `examples/SearchBar.tsx` — update if API signature changes (useIntentMap gains key, useIntent loses deps)

</code_context>

<specifics>
## Specific Ideas

- The `useRef` wrapper pattern for handlers is well-established in React (same pattern used by React Router, Zustand, etc.)
- Adding `isAlive()` to IntentMapInstance is a minimal API addition — no new public method, just a state accessor
- Removing the `deps` param from useIntent is a clean break — the stale closure fix makes it unnecessary, and keeping it would be confusing

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-react-adapter*
*Context gathered: 2026-04-13*
