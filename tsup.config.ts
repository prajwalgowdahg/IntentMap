import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'adapters/react': 'src/adapters/react.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  external: ['react'],
  banner: {
    js: `/**
 * intentmap v0.1.0
 * Map UI events to semantic intents — locally, offline, zero deps
 * https://github.com/prajwalgowdahg/IntentMap
 * @license MIT
 */`,
  },
})
