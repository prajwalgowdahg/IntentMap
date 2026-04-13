# Deferred Items

## Pre-existing Test Failures (Discovered during 02-01)

**25 failing tests** in `tests/validation.test.ts` -- these tests were added in a prior commit but the implementation in `src/IntentMap.ts` to pass them was left unstaged/uncommitted.

Failing test categories:
- createIntentMap config validation (null config, null intents, empty patterns, bad defaultThreshold)
- match() input validation (number input, null input)
- on() validation (intent is number, handler not function)
- addIntent() validation (name is number, empty string, empty patterns)
- train() validation (intent is number, non-existent intent, empty examples, non-array examples)
- bind() validation (null element)
- destroy-state guards (match, on, emit, bind, addIntent, removeIntent, train, getIntents, off after destroy)

These are **in scope for plan 02-02** which implements the validation logic. The unstaged changes in `src/IntentMap.ts` appear to be the partial implementation that will be completed in 02-02.

**Action needed:** Plan 02-02 should stage and complete the IntentMap.ts validation implementation.
