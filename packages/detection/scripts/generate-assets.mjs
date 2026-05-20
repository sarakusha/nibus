import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetsDir = path.join(rootDir, 'assets');
const detectionYamlPath = path.join(assetsDir, 'detection.yml');

const raw = yaml.load(fs.readFileSync(detectionYamlPath, 'utf8'));
const serialized = JSON.stringify(raw, null, 2);

const cjs = `const path = require('path');

const detectionPath = path.join(__dirname, 'detection.yml');
const detection = ${serialized};

module.exports = {
  detectionPath,
  detection,
};
`;

const mjs = `import { fileURLToPath } from 'url';

const detectionPath = fileURLToPath(new URL('./detection.yml', import.meta.url));
const detection = ${serialized};

export { detectionPath, detection };
export default detection;
`;

const dts = `declare const detectionPath: string;
declare const detection: unknown;

declare const _default: {
  detectionPath: string;
  detection: unknown;
};

export { detectionPath, detection };
export default _default;
`;

fs.writeFileSync(path.join(assetsDir, 'index.cjs'), cjs);
fs.writeFileSync(path.join(assetsDir, 'index.mjs'), mjs);
fs.writeFileSync(path.join(assetsDir, 'index.d.ts'), dts);
