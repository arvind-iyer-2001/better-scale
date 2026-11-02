import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { getRepo } from '../app/bootstrap';
import type { Profile, Reading, Settings } from '../domain/types';
import { dataSignature } from './signature';

export type Data = { readings: Reading[]; hidden: Reading[]; profile: Profile | null; settings: Settings | null; scaleId: string | null; loaded: boolean };

/** Polls the local store; the capture pipeline writes to it from the background. */
export function useData(): Data & { refresh: () => Promise<void> } {
  const [data, setData] = useState<Data>({ readings: [], hidden: [], profile: null, settings: null, scaleId: null, loaded: false });
  const last = useRef('');
  const refresh = useCallback(async () => {
    const repo = await getRepo();
    const all = await repo.listReadings(undefined, true);
    const next = {
      readings: all.filter((r) => !r.flagged),
      hidden: all.filter((r) => r.flagged),
      profile: await repo.getProfile(),
      settings: await repo.getSettings(),
      scaleId: await repo.getScaleId(),
      loaded: true,
    };
    const sig = dataSignature(next.readings, next.hidden, next.profile, next.settings, next.scaleId);
    if (sig === last.current) return; // nothing changed: keep references stable so charts do not replay
    last.current = sig;
    setData(next);
  }, []);
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 3000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => { clearInterval(t); sub.remove(); };
  }, [refresh]);
  return { ...data, refresh };
}
