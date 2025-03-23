import { defineConfig, type Options } from 'tsup';

const nodeConfig: Options = {
  entry: ['src/index.ts'],
  clean: true,
  dts: false,
  format: ['cjs'],
  minify: false,
  outDir: 'build',
  splitting: false,
  target: 'es2022',
  treeshake: true,
  sourcemap: false,
};

export default defineConfig(nodeConfig);
