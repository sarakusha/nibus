import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsonDir = path.join(rootDir, 'json');

const mibFiles = fs
  .readdirSync(jsonDir)
  .filter(file => file.endsWith('.mib.json'))
  .sort((left, right) => left.localeCompare(right));

const mibs = Object.fromEntries(
  mibFiles.map(file => {
    const mibName = path.basename(file, '.mib.json');
    const mib = JSON.parse(fs.readFileSync(path.join(jsonDir, file), 'utf8'));
    return [mibName, mib];
  })
);

const serialized = JSON.stringify(mibs, null, 2);

const cjs = `const mibs = ${serialized};

module.exports = mibs;
`;

const mjs = `const mibs = ${serialized};

export default mibs;
`;

const dts = `declare const mibs: Record<string, unknown>;

export default mibs;
`;

fs.writeFileSync(path.join(jsonDir, 'index.js'), cjs);
fs.writeFileSync(path.join(jsonDir, 'index.mjs'), mjs);
fs.writeFileSync(path.join(jsonDir, 'index.d.ts'), dts);
