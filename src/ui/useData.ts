import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { getRepo } from '../app/bootstrap';
import type { Profile, Reading, Settings } from '../domain/types';

export type Data = { readings: Reading[]; hidden: Reading[]; profile: Profile | null; settings: Settings | null; loaded: boolean };

/** Polls the local store; the capture pipeline writes to it from the background. */
export function useData(): Data & { refresh: () => Promise<void> } {
  const [data, setData] = useState<Data>({ readings: [], hidden: [], profile: null, settings: null, loaded: false });
  const refresh = useCallback(async () => {
    const repo = await getRepo();
    const all = await repo.listReadings(undefined, true);
    setData({
      readings: all.filter((r) => !r.flagged),
      hidden: all.filter((r) => r.flagged),
      profile: await repo.getProfile(),
      settings: await repo.getSettings(),
      loaded: true,
    });
  }, []);
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 3000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => { clearInterval(t); sub.remove(); };
  }, [refresh]);
  return { ...data, refresh };
}
