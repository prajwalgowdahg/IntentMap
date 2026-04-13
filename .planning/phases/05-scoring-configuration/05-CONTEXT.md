# Phase 5: Scoring Configuration - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Make scoring weights configurable, add custom stemmer option, and add structured debug output to MatchResult. Four requirements (SCR-01 through SCR-04). This phase changes `IntentConfig`, `MatchResult`, `Matcher`, and threads custom stemmer through `embeddings.ts` and `tokenizer.ts`. Does NOT add new matching algorithms or change default behavior.

</domain>

<decisions>
## Implementation Decisions

### Debug output shape (SCR-03)
- Per-intent breakdown with all three scores: `{ cosine: number, keyword: number, blended: number, threshold: number, aboveThreshold: boolean }`
- Include threshold comparison info per intent — helps debug why intents didn't match
- Field only present on MatchResult when `debug: true` in config (optional field)
- Type: `debug?: Record<string, { cosine: number, keyword: number, blended: number, threshold: number, aboveThreshold: boolean }>`

### Weight edge cases (SCR-01/02)
- If only one weight provided, infer the other: `1 - provided`
- If both provided, normalize to sum 1.0 (divide each by their sum)
- Throw `TypeError` on negative values, NaN, or zero sum — fails fast, catches config errors early
- Default: 0.35 cosine / 0.65 keyword when weights omitted entirely (no behavior change)
- Validation happens in `createIntentMap()` config validation (not in Matcher)

### Claude's Discretion
- SCR-04 (custom stemmer): Thread stemmer function through Matcher → VectorStore → buildVector. Exact mechanism left to implementation.
- Whether weights are stored as normalized values or normalized per-match call
- Exact type name for debug field in types.ts

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/matcher.ts`: COSINE_WEIGHT/KEYWORD_WEIGHT constants at lines 5-6 — replace with configurable values from config
- `src/types.ts:IntentConfig`: Already has `debug: boolean` — add `weights` and `stemmer` fields
- `src/types.ts:MatchResult`: Already has `scores: Record<string, number>` — add optional `debug` field
- `src/tokenizer.ts:stem()`: Default stemmer — custom stemmer replaces calls to this function
- Matcher constructor already accepts config object — extend with weights and stemmer

### Integration Points
- `src/types.ts` — add `weights` and `stemmer` to IntentConfig, add `debug` field to MatchResult
- `src/matcher.ts` — use configurable weights instead of constants, compute debug breakdown
- `src/embeddings.ts` — VectorStore.add() and buildVector() must accept custom stemmer
- `src/tokenizer.ts` — stem() is the default; custom stemmer has same signature `(word: string) => string`
- `src/IntentMap.ts` — pass weights and stemmer through to Matcher constructor
- `src/index.ts` — validate weights and stemmer in createIntentMap() config validation

</code_context>

<specifics>
## Specific Ideas

- Full debug breakdown with threshold info per intent gives developers complete visibility into scoring decisions
- The normalization approach (infer missing, normalize both) is the most developer-friendly — works with partial config

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-scoring-configuration*
*Context gathered: 2026-04-13*
