# Phase 3: Engine & DOM Fixes - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix known bugs in the matching engine and DOM binding, and add debounce support to `bind()`. Eight requirements (BUG-01 through BUG-05, DOM-01 through DOM-03). This phase does NOT add new scoring features, React changes, or new public API methods — only fixes existing behavior and adds the `debounce` option to `BindOptions`.

</domain>

<decisions>
## Implementation Decisions

### Duplicate bind prevention (BUG-01)
- Skip silently when `bind()` is called on an already-bound element — no error, no warning
- Deduplication is element-only: same element = already bound, regardless of event types or options
- Always skip even if the second call has different options (extractor, filter, event types) — developer should unbind first
- Return the existing unbind function from the first `bind()` call — caller always gets a working cleanup function
- Implementation: check `this.boundElements.has(element)` before adding listeners

### removeIntent cleanup scope (BUG-05)
- Clean up internal state only: matcher/vector store entries + handlers map entry
- Do NOT unbind DOM elements — bound elements continue to fire events and call `match()`, which naturally returns different results after intent removal
- This is acceptable: `match()` simply won't score against the removed intent, so previously-matching inputs may now return a different intent or no-match
- Current code already does `this.matcher.removeIntent(name)` + `this.handlers.delete(name)` — this is correct, just needs to also clear thresholds via the matcher

### Debounce behavior (DOM-01/02/03)
- Trailing-only debounce: wait the full delay, then fire `match()`. No leading edge
- Opt-in: no default debounce value. Omitting `debounce` preserves current behavior (every event fires match immediately)
- Add `debounce?: number` to `BindOptions` interface in `types.ts`
- In-flight timers are cancelled on unbind and on destroy — no stale callbacks after cleanup
- Implementation: store timeout IDs per element alongside cleanup functions for proper cancellation

### Claude's Discretion
- BUG-02: Swap `innerText` → `textContent` priority in `extractText()` (line 242 of IntentMap.ts)
- BUG-03: Compute tokenization once in `Matcher.match()` instead of calling `tokenize().map(stem)` twice (lines 43-44 of matcher.ts)
- BUG-04: The `sorted[0] ?? [null, 0]` guard on matcher.ts line 61 already handles the no-intent case — verify it works correctly and add a test
- Exact debounce timer storage mechanism (per-element Map, per-cleanup array, etc.)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `IntentMap.boundElements: Map<HTMLElement, (() => void)[]>`: Already tracks bound elements with cleanup functions — deduplication check is a simple `.has(element)` lookup
- `IntentMap.handlers: Map<string, Set<IntentHandler>>`: Handler cleanup on removeIntent is already `this.handlers.delete(name)` — working correctly
- `Matcher.thresholds: Map<string, number>`: Cleared via `this.thresholds.delete(name)` in `removeIntent()` — working correctly
- `VectorStore.remove()`: Already clears store, averageCache, and stemCache for the intent — working correctly

### Established Patterns
- Error messages use `[intentmap]` prefix with method name (established in Phase 2)
- All public methods guard against destroyed state via `guardNotDestroyed()` (established in Phase 2)
- Cleanup functions are stored as `() => void[]` arrays per element in `boundElements`
- DOM event listeners follow addEventListener/removeEventListener pattern with cleanup function return
- No timers/timeouts currently exist in the codebase — debounce will be the first use of `setTimeout`

### Integration Points
- `src/types.ts:BindOptions` — add `debounce?: number` field here
- `src/IntentMap.ts:bind()` — main changes: dedup check at entry, debounce wrapper around match+emit
- `src/IntentMap.ts:extractText()` — swap innerText/textContent order
- `src/matcher.ts:match()` — compute tokenization once, pass stems to both buildVector and keyword scoring
- `src/IntentMap.ts:removeIntent()` — already correct, verify matcher.removeIntent covers all cleanup
- `src/IntentMap.ts:destroy()` — must also clear any debounce timers during teardown

</code_context>

<specifics>
## Specific Ideas

- The element-only dedup approach is simple and predictable — if you need different options, unbind first then rebind
- Trailing-only debounce is the standard pattern for search/typeahead inputs, which is the primary use case for `bind()`
- The `extractText` swap (BUG-02) avoids layout reflow — `innerText` triggers a reflow, `textContent` doesn't

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-engine-dom-fixes*
*Context gathered: 2026-04-13*
