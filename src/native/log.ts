import * as FS from 'expo-file-system/legacy';

const LOG = (FS.documentDirectory ?? '') + 'app-log.txt';
const KEEP = 200;
let chain: Promise<void> = Promise.resolve();

/** Serialized append to a ring-buffered log file (last 200 lines), readable with `devicectl device copy from`. */
export function log(line: string): Promise<void> {
  const l = `${new Date().toISOString()} ${line}`;
  console.log(l);
  chain = chain.then(async () => {
    try {
      const prev = await FS.readAsStringAsync(LOG).catch(() => '');
      const lines = (prev ? prev.split('\n').filter(Boolean) : []).concat(l).slice(-KEEP);
      await FS.writeAsStringAsync(LOG, lines.join('\n') + '\n');
    } catch {}
  });
  return chain;
}

export const readLog = () => FS.readAsStringAsync(LOG).catch(() => '');
