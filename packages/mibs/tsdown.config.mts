// eslint-disable-next-line import/no-extraneous-dependencies
import { type Options, defineConfig } from 'tsdown';

const nodeConfig: Options = {
  entry: ['index.ts'],
  clean: false,
  dts: true,
  format: ['cjs', 'esm'],
  minify: false,
  outDir: '.',
  splitting: false,
  target: 'es2022',
  treeshake: true,
  sourcemap: false,
};

export default defineConfig(nodeConfig);
