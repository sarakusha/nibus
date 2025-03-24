// eslint-disable-next-line import/no-extraneous-dependencies
import { type Options, defineConfig } from 'tsup';

const nodeConfig: Options = {
  entry: ['src/service/index.ts'],
  clean: true,
  dts: true,
  format: ['cjs', 'esm'],
  minify: false,
  outDir: 'build',
  splitting: true,
  target: 'es2022',
  treeshake: true,
  sourcemap: true,
};

export default defineConfig(nodeConfig);
