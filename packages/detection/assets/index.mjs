import { fileURLToPath } from 'url';

const detectionPath = fileURLToPath(new URL('../assets/detection.yml', import.meta.url));

export default detectionPath;
