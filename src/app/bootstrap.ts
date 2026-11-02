// Imported first in index.ts so a background relaunch by iOS runs the whole pipeline without any UI.
import { Repo } from '../data/db';
import { startCapture } from '../native/ble';
import { log } from '../native/log';
import { captureReading } from './capture';
import { CaptureCoordinator } from './coordinator';

let repoPromise: Promise<Repo> | null = null;
export const getRepo = (): Promise<Repo> => (repoPromise ??= Repo.open());

const coordinator = new CaptureCoordinator(async (session) => {
  const reading = await captureReading(
    { repo: await getRepo(), now: () => new Date(), sink: { onReading: () => {}, flushHealth: async () => {} } },
    session,
  );
  await log(reading ? `reading ${reading.weightKg} kg flagged=${reading.flagged}` : 'session ended without a valid reading');
}, 3000);

startCapture(
  { onFrame: (f, at) => coordinator.onFrame(f, at), onDisconnect: () => coordinator.onDisconnect() },
  async () => (await getRepo()).getScaleId(),
);
