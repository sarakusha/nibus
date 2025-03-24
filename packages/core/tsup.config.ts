// eslint-disable-next-line import/no-extraneous-dependencies
import { type Options, defineConfig } from 'tsup';

const nodeConfig: Options = {
  entry: [
    'src/**/*.ts'
    // 'src/index.ts',
    // 'src/sarp/index.ts',
    // 'src/session/index.ts',
    // 'src/config.ts',
    // 'src/common.ts',
    // 'src/Address.ts',
  ],
  clean: true,
  dts: true,
  format: ['cjs', 'esm'],
  minify: false,
  outDir: 'build',
  splitting: false,
  target: 'es2024',
  treeshake: false,
  sourcemap: true,
};

export default defineConfig(nodeConfig);
