import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { getRepo, refreshReminders } from '../../app/bootstrap';
import { loadDemoData } from '../../app/demo';
import type { Profile, Settings } from '../../domain/types';
import { pairScale } from '../../native/ble';
import { healthAccessState, requestHealthAccess } from '../../native/health';
import { notificationAccessState, requestNotificationAccess, sendTestNotification } from '../../native/notifications';
import { DatePick, Group, Row, Segmented, Stepper, TimePick, Toggle } from '../forms';
import { theme } from '../theme';

type Props = { profile: Profile; settings: Settings; scaleId: string | null; onRedo: () => void; onDone: () => void };
type Open = null | 'height' | 'birth' | 'goal' | 'rem' | 'cut';

const dateLabel = (ymd: string) => new Date(ymd + 'T00:00:00').toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
const panel = { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: theme.line } as const;

export function SettingsScreen({ profile, settings, scaleId, onRedo, onDone }: Props) {
  const [p, setP] = useState(profile);
  const [s, setS] = useState(settings);
  const [open, setOpen] = useState<Open>(null);
  const [health, setHealth] = useState('…');
  const [notif, setNotif] = useState('…');
  const [pairMsg, setPairMsg] = useState('');
  const [paired, setPaired] = useState(scaleId !== null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ p, s, profileDirty: false });

  useEffect(() => { notificationAccessState().then(setNotif).catch(() => setNotif('unavailable')); }, []);
  useEffect(() => { healthAccessState().then(setHealth).catch(() => setHealth('unavailable')); }, []);

  const persist = async () => {
    const { p: np, s: ns, profileDirty } = latest.current;
    latest.current.profileDirty = false;
    const repo = await getRepo();
    if (profileDirty) { await repo.saveProfile(np); await repo.recomputeAll(np); }
    await repo.saveSettings(ns);
    await refreshReminders();
  };
  const schedule = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { timer.current = null; persist().catch(() => {}); }, 500);
  };
  const editP = (patch: Partial<Profile>) => {
    const np = { ...p, ...patch };
    setP(np); latest.current = { ...latest.current, p: np, profileDirty: true }; schedule();
  };
  const editS = (patch: Partial<Settings>) => {
    const ns = { ...s, ...patch };
    setS(ns); latest.current = { ...latest.current, s: ns }; schedule();
  };
  const done = async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; await persist().catch(() => {}); }
    onDone();
  };
  const toggle = (k: Exclude<Open, null>) => setOpen(open === k ? null : k);

  const builtAt = (Constants.expoConfig?.extra as { builtAt?: string } | undefined)?.builtAt;
  const expiresIn = builtAt ? Math.ceil((new Date(builtAt).getTime() + 7 * 86_400_000 - Date.now()) / 86_400_000) : null;
  const healthText = health === 'authorized' ? 'On' : health === 'denied' ? 'Off' : health === 'undetermined' ? 'Not set' : health;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: 16, paddingTop: 64, paddingBottom: 48 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: theme.text, fontSize: 30, fontWeight: '700' }}>Settings</Text>
        <Pressable onPress={done} hitSlop={12}><Text style={{ color: theme.cyan, fontSize: 17, fontWeight: '600' }}>Done</Text></Pressable>
      </View>

      <Group title="About you" footer="Used only on this phone to compute body composition. Changes recalculate your history.">
        <View style={{ ...panel, paddingVertical: 10 }}>
          <Segmented options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} value={p.sex} onChange={(v) => editP({ sex: v })} />
        </View>
        <Row label="Height" value={`${p.heightCm} cm`} onPress={() => toggle('height')} />
        {open === 'height' && <View style={panel}><Stepper value={p.heightCm} onChange={(n) => editP({ heightCm: n })} min={90} max={220} unit="cm" /></View>}
        <Row label="Date of birth" value={dateLabel(p.birthDate)} onPress={() => toggle('birth')} />
        {open === 'birth' && <View style={panel}><DatePick value={p.birthDate} onChange={(v) => editP({ birthDate: v })} /></View>}
        <Row label="Goal weight" value={p.goalWeightKg ? `${p.goalWeightKg.toFixed(1)} kg` : 'None'} onPress={() => toggle('goal')} />
        {open === 'goal' && (
          <View style={panel}>
            <Stepper value={p.goalWeightKg ?? 70} onChange={(n) => editP({ goalWeightKg: n })} min={30} max={250} step={0.5} decimals={1} unit="kg" />
            {p.goalWeightKg !== null && (
              <Pressable onPress={() => { editP({ goalWeightKg: null }); setOpen(null); }} style={{ marginTop: 12 }}>
                <Text style={{ color: theme.red, textAlign: 'center' }}>Remove goal</Text>
              </Pressable>
            )}
          </View>
        )}
        <Row label="Athlete mode" last right={<Toggle value={p.athlete} onChange={(v) => editP({ athlete: v })} />} />
      </Group>
      <Text style={{ color: theme.dim, fontSize: 12, marginHorizontal: 16, marginTop: 6 }}>
        Athlete mode adjusts the formula for people who train hard most days (about 8+ hours a week). Otherwise leave it off.
      </Text>

      <Group title="Morning reminder">
        <Row label="Remind me" last={!s.reminderEnabled} right={<Toggle value={s.reminderEnabled} onChange={(v) => editS({ reminderEnabled: v })} />} />
        {s.reminderEnabled && (
          <>
            <Row label="Time" value={s.reminderTime} onPress={() => toggle('rem')} />
            {open === 'rem' && <View style={panel}><TimePick value={s.reminderTime} onChange={(v) => editS({ reminderTime: v })} /></View>}
            <Row label="Follow-up if not weighed by" value={s.cutoffTime} onPress={() => toggle('cut')} last={open !== 'cut'} />
            {open === 'cut' && <View style={{ ...panel, borderBottomWidth: 0 }}><TimePick value={s.cutoffTime} onChange={(v) => editS({ cutoffTime: v })} /></View>}
          </>
        )}
      </Group>

      <Group title="Connections" footer={pairMsg || undefined}>
        <Row
          label="Scale" value={paired ? 'Connected' : 'Not connected'} valueColor={paired ? theme.lime : theme.amber}
          onPress={async () => {
            try { setPairMsg('Step on the scale now…'); await pairScale(async (id) => (await getRepo()).saveScaleId(id)); setPaired(true); setPairMsg('Scale connected.'); }
            catch (e: any) { setPairMsg(String(e?.message ?? e)); }
          }}
        />
        <Row
          label="Apple Health" value={healthText} valueColor={health === 'authorized' ? theme.lime : theme.amber}
          onPress={async () => { await requestHealthAccess().catch(() => {}); setHealth(await healthAccessState()); }}
        />
        <Row
          label="Notifications" value={notif === 'granted' ? 'On' : notif === 'denied' ? 'Off' : notif === 'undetermined' ? 'Not set' : notif}
          valueColor={notif === 'granted' ? theme.lime : theme.amber}
          onPress={async () => { await requestNotificationAccess(); setNotif(await notificationAccessState()); }}
        />
        <Row label="Send test notification" last onPress={async () => { await sendTestNotification(); setPairMsg('Test notification in 5 seconds. Lock the phone or leave the app to see it as a banner.'); }} />
      </Group>

      <Group title="About" footer="Don't swipe better-scale away in the app switcher. iOS won't wake a force-quit app when you step on the scale.">
        <Row label="Run setup again" onPress={onRedo} />
        <Row
          label="Install expires" last
          value={expiresIn === null ? 'Unknown' : expiresIn > 0 ? `in ${expiresIn} day${expiresIn > 1 ? 's' : ''}` : 'Expired'}
          valueColor={expiresIn !== null && expiresIn <= 1 ? theme.red : theme.dim}
        />
      </Group>

      {(Constants.expoConfig?.extra as { demo?: boolean } | undefined)?.demo && (
        <Group title="Demo build">
          <Row label="Load sample data" onPress={async () => { await loadDemoData(await getRepo(), true); }} />
          <Row label="Remove sample data" last onPress={async () => { await loadDemoData(await getRepo(), false); }} />
        </Group>
      )}
    </ScrollView>
  );
}
