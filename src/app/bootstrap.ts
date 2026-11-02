// Imported first in index.ts so a background relaunch by iOS runs the whole pipeline without any UI.
import { AppState } from 'react-native';
import { Repo } from '../data/db';
import { flushPending } from '../domain/healthsync';
import { planReminders } from '../domain/reminders';
import { startCapture } from '../native/ble';
import { healthSink } from '../native/health';
import { log } from '../native/log';
import { applyPlan, notifyInaccurate } from '../native/notifications';
import { captureReading } from './capture';
import { CaptureCoordinator } from './coordinator';

let repoPromise: Promise<Repo> | null = null;
export const getRepo = (): Promise<Repo> => (repoPromise ??= Repo.open());

export async function flushHealth(): Promise<void> {
  try {
    const r = await flushPending(await getRepo(), healthSink);
    if (r.written || r.deferred) await log(`health flush written=${r.written} deferred=${r.deferred}`);
  } catch (e: any) {
    await log(`health flush error: ${e?.message ?? e}`);
  }
}

/** Re-plans the next 7 days of reminders from the settings and the latest reading (flagged ones count). */
export async function refreshReminders(): Promise<void> {
  try {
    const repo = await getRepo();
    const all = await repo.listReadings(Date.now() - 2 * 86_400_000, true);
    const last = all.length ? new Date(Math.max(...all.map((r) => r.ts))) : null;
    await applyPlan(planReminders(await repo.getSettings(), new Date(), last));
  } catch (e: any) {
    await log(`reminder refresh error: ${e?.message ?? e}`);
  }
}

const coordinator = new CaptureCoordinator(async (session) => {
  const reading = await captureReading(
    {
      repo: await getRepo(),
      now: () => new Date(),
      sink: {
        onReading: (r) => {
          if (r.flagged) notifyInaccurate(r);
          refreshReminders();
        },
        flushHealth,
      },
    },
    session,
  );
  await log(reading ? `reading ${reading.weightKg} kg flagged=${reading.flagged}` : 'session ended without a valid reading');
}, 3000);

startCapture(
  { onFrame: (f, at) => coordinator.onFrame(f, at), onDisconnect: () => coordinator.onDisconnect() },
  async () => (await getRepo()).getScaleId(),
);

AppState.addEventListener('change', (s) => {
  if (s === 'active') { flushHealth(); refreshReminders(); }
});
