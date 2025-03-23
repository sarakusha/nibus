import { defineConfig, type Options } from 'tsup';

const nodeConfig: Options = {
  entry: ['index.ts'],
  clean: true,
  dts: true,
  format: ['cjs', 'esm'],
  minify: false,
  outDir: 'build',
  splitting: false,
  target: 'es2022',
  treeshake: true,
  sourcemap: true,
};

export default defineConfig(nodeConfig);
