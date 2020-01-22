let lastTimeid: number;

/**
 *   Генерация уникального id на основе времени
 */
export default function timeid(): string {
  const time = Date.now();
  const last = lastTimeid || time;
  lastTimeid = time > last ? time : last + 1;
  return lastTimeid.toString(36);
}
