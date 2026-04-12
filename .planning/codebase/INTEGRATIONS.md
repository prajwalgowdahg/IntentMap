# External Integrations

**Analysis Date:** 2026-04-12

## APIs & External Services

**None.** This library is explicitly designed to run locally and offline with zero dependencies. All NLP operations (tokenization, stemming, vector embedding, cosine similarity, keyword matching) are implemented in pure TypeScript with no external API calls.

## Data Storage

**Databases:**
- None. All data lives in-memory as JavaScript Maps and Sets.
  - `VectorStore` class in `embeddings.ts` uses `Map<string, PatternEntry[]>` for pattern storage
  - `VectorStore` caches average vectors and stems in `Map<string, TokenVector>` and `Map<string, string[]>`
  - `IntentMap` class in `IntentMap.ts` uses `Map<string, Set<IntentHandler>>` for event handlers
  - `Matcher` class in `matcher.ts` uses `Map<string, number>` for per-intent thresholds

**File Storage:**
- None. No file I/O in the library.

**Caching:**
- In-memory only via `VectorStore.averageCache` and `VectorStore.stemCache` in `embeddings.ts`
  - Caches are invalidated when new patterns are added via `add()` or `addAll()`

## Authentication & Identity

**Auth Provider:**
- None. No authentication is required or implemented.

## Monitoring & Observability

**Error Tracking:**
- None.

**Logs:**
- Debug logging via `console.debug` when `config.debug` is `true`
  - Used in `Matcher.match()` at `matcher.ts` line 53: logs scores and input for debugging
  - Debug is opt-in via `IntentConfig.debug` flag (defaults to `false`)

## CI/CD & Deployment

**Hosting:**
- npm registry - Package published as `intentmap` with public access
- GitHub - Source repository

**CI Pipeline:**
- GitHub Actions via `release.yml`
  - Triggers on push to `main` branch
  - Runs on `ubuntu-latest`
  - Steps: checkout, setup Node 20, `npm ci`, changesets action
  - Publishes to npm when changesets are present
  - Uses `GITHUB_TOKEN` and `NPM_TOKEN` secrets for authentication
  - Creates "Release PR" or publishes directly via `changesets/action@v1`

## Environment Configuration

**Required env vars:**
- None for library usage

**CI secrets (not in codebase):**
- `NPM_TOKEN` - Required for publishing to npm via GitHub Actions
- `GITHUB_TOKEN` - Auto-provided by GitHub Actions

**Secrets location:**
- GitHub repository secrets (referenced in `release.yml`)

## Webhooks & Callbacks

**Incoming:**
- None. The library does not receive webhooks.

**Outgoing:**
- None. The library does not make HTTP requests or call external services.

## Event System (Internal)

**Note:** While not an external integration, the library has an internal event system that acts as an integration point for consumers:

- `IntentMap.on(intent, handler)` - Register handlers for matched intents
- `IntentMap.on('*', handler)` - Wildcard handler fires for all match results
- `IntentMap.emit(result, event?)` - Manually dispatch match results to handlers
- `IntentMap.bind(element, options?)` - Bind DOM elements to automatically extract text from events (`input`, `change`) and emit match results

**React Integration (Internal Adapter):**
- `useIntentMap(config)` - Creates and manages an `IntentMapInstance` lifecycle in a React component
- `useIntent(im, intent, handler)` - Subscribes to a specific intent within a React effect
- `useIntentBind(im, options?)` - Binds an `IntentMapInstance` to a DOM element ref, returns `{ ref, lastMatch }`

---

*Integration audit: 2026-04-12*
