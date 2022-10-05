import { fileURLToPath } from 'url';

const detectionPath = fileURLToPath(new URL('detection.yml', import.meta.url));

export default detectionPath;
