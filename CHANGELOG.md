# Changelog

All notable changes to `intentmap` will be documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project adheres to [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

## [0.1.0] - 2026-04-12

### Added
- Core `createIntentMap(config)` factory with full TypeScript support
- `defineIntent(patterns, options?)` helper for clean intent definitions
- `IntentMap.match(input)` — synchronous, offline intent scoring
- `IntentMap.on(intent, handler)` / `off()` with `'*'` wildcard support
- `IntentMap.emit(result, event?)` for manual handler dispatch
- `IntentMap.bind(element, options?)` for zero-boilerplate DOM binding
- `IntentMap.addIntent()` / `removeIntent()` for dynamic intent management
- `IntentMap.train(intent, examples)` for incremental learning
- `IntentMap.destroy()` for clean teardown and memory management
- Blended scoring engine: 65% keyword overlap + 35% cosine similarity
- Lightweight suffix-stripping stemmer (handles -ing, -ed, -er, -ly, -tion, -ness, -ment, -es, -s)
- Bigram tokenisation with TF-IDF-inspired vector normalisation
- React adapter: `useIntentMap`, `useIntent`, `useIntentBind` hooks
- Dual ESM + CJS build via `tsup` with full `.d.ts` declaration files
- `intentmap/react` subpath export for tree-shakeable React imports
- 26 unit tests across tokenizer and core matching engine
- CI workflow for Node 18, 20, 22 via GitHub Actions
- Zero runtime dependencies

[Unreleased]: https://github.com/prajwalgowdahg/IntentMap/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/prajwalgowdahg/IntentMap/releases/tag/v0.1.0
