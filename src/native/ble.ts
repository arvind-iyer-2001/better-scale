// Pending-connect capture proven in spike-ble: iOS keeps the connect open, relaunches the app when the
// scale appears (state restoration), and delivers FFF4 notifications. Imported at module scope so a
// background relaunch creates the manager and receives restoreState.
import { BleManager, Device, State, type Subscription } from 'react-native-ble-plx';
import { AppState } from 'react-native';
import { parseFrame, type Frame } from '../domain/frame';
import { log } from './log';

const SERVICE = '0000fff0-0000-1000-8000-00805f9b34fb';
const NOTIFY = '0000fff4-0000-1000-8000-00805f9b34fb';

export type CaptureHandlers = {
  onFrame(f: Frame, atMs: number): void;
  onDisconnect(): void;
};

const b64ToBytes = (b64: string): Uint8Array => {
  const bin = globalThis.atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

let handlers: CaptureHandlers | null = null;
let getScaleId: () => Promise<string | null> = async () => null;
let handlersReady!: () => void;
const ready = new Promise<void>((r) => { handlersReady = r; });

let attachedId: string | null = null;
let disconnectSub: Subscription | null = null;
let monitorSub: Subscription | null = null;

async function attach(device: Device, why: string): Promise<void> {
  await ready;
  if (attachedId === device.id) { await log(`attach(${why}) skipped, already attached`); return; }
  attachedId = device.id;
  await log(`attach(${why}) ${device.id}`);
  disconnectSub?.remove();
  disconnectSub = device.onDisconnected(async (err) => {
    await log(`disconnected ${err ? err.message : ''}`);
    attachedId = null;
    monitorSub?.remove();
    monitorSub = null;
    handlers?.onDisconnect();
    arm('after-disconnect');
  });
  try {
    const d = await device.discoverAllServicesAndCharacteristics();
    monitorSub?.remove();
    monitorSub = d.monitorCharacteristicForService(SERVICE, NOTIFY, (error, ch) => {
      if (error) { log(`monitor error: ${error.message}`); return; }
      if (!ch?.value) return;
      const f = parseFrame(b64ToBytes(ch.value));
      log(f ? `frame status=${f.status} w=${f.weightKg} z=${f.impedanceOhm}` : `unparsed frame ${ch.value}`);
      if (f) handlers?.onFrame(f, Date.now());
    });
  } catch (e: any) {
    attachedId = null;
    await log(`attach error: ${e?.message ?? e}`);
  }
}

export const manager = new BleManager({
  restoreStateIdentifier: 'better-scale-central',
  restoreStateFunction: async (restored) => {
    const n = restored?.connectedPeripherals?.length ?? 0;
    await log(`RESTORED state, connected peripherals: ${n}`);
    if (restored?.connectedPeripherals?.[0]) attach(restored.connectedPeripherals[0], 'restore').catch((e) => log('attach err ' + e));
  },
});

// Pending connect: iOS keeps it open until the scale appears.
let arming = false;
export async function arm(why: string): Promise<void> {
  if (arming) { await log(`arm(${why}) skipped, already arming`); return; }
  arming = true;
  try {
    for (let i = 0; i < 20; i++) {
      const id = await getScaleId();
      if (!id) { await log('arm: no paired scale'); return; }
      if ((await manager.state()) !== State.PoweredOn) {
        await log('arm: waiting for bluetooth');
        await new Promise<void>((res) => {
          const sub = manager.onStateChange((st) => { if (st === State.PoweredOn) { sub.remove(); res(); } }, true);
        });
      }
      await log(`arm(${why}) connecting try ${i}`);
      try {
        const dev = await manager.connectToDevice(id, { timeout: undefined } as any);
        await attach(dev, 'connect');
        return;
      } catch (e: any) {
        await log(`arm error: ${e?.message ?? e}`);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  } finally {
    arming = false;
  }
}

/** Scan for the scale's FFF0 service, save its id, and arm the background connect. */
export function pairScale(save: (id: string) => Promise<void>): Promise<string> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => { manager.stopDeviceScan(); reject(new Error('No scale found. Step on it and try again.')); }, 30000);
    manager.startDeviceScan([SERVICE], null, async (error, dev) => {
      if (error) { clearTimeout(t); reject(error); return; }
      if (!dev) return;
      clearTimeout(t);
      manager.stopDeviceScan();
      await save(dev.id);
      await log(`paired ${dev.id}`);
      arm('paired');
      resolve(dev.id);
    });
  });
}

export function startCapture(h: CaptureHandlers, scaleId: () => Promise<string | null>): void {
  handlers = h;
  getScaleId = scaleId;
  handlersReady();
  log(`startup appstate ${AppState.currentState}`);
  arm('startup');
}
