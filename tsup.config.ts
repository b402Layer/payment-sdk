import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: true,
  treeshake: true,
  external: ['axios', 'ws', 'isomorphic-ws', '@noble/hashes'],
  platform: 'neutral',
  target: 'es2020',
  outDir: 'dist',
});
