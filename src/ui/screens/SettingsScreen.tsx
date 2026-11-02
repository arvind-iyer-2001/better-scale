import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import Constants from 'expo-constants';
import { getRepo, refreshReminders } from '../../app/bootstrap';
import type { Profile, Settings } from '../../domain/types';
import { pairScale } from '../../native/ble';
import { healthAccessState, requestHealthAccess } from '../../native/health';
import { requestNotificationAccess } from '../../native/notifications';
import { theme } from '../theme';

type Props = { profile: Profile | null; settings: Settings; firstRun: boolean; onDone: () => void };

const HM = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const Field = ({ label, value, onChange, placeholder, keyboard }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; keyboard?: 'numeric' | 'default' }) => (
  <View style={{ marginTop: 12 }}>
    <Text style={{ color: theme.dim, fontSize: 12 }}>{label}</Text>
    <TextInput
      value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#555" keyboardType={keyboard ?? 'default'}
      style={{ color: theme.text, backgroundColor: theme.card, borderRadius: 10, padding: 10, marginTop: 4 }}
    />
  </View>
);

export function SettingsScreen({ profile, settings, firstRun, onDone }: Props) {
  const [sex, setSex] = useState<Profile['sex']>(profile?.sex ?? 'male');
  const [height, setHeight] = useState(String(profile?.heightCm ?? ''));
  const [birth, setBirth] = useState(profile?.birthDate ?? '');
  const [athlete, setAthlete] = useState(profile?.athlete ?? false);
  const [goal, setGoal] = useState(profile?.goalWeightKg ? String(profile.goalWeightKg) : '');
  const [rem, setRem] = useState(settings.reminderTime);
  const [cut, setCut] = useState(settings.cutoffTime);
  const [remOn, setRemOn] = useState(settings.reminderEnabled);
  const [error, setError] = useState('');
  const [health, setHealth] = useState('…');
  const [pairMsg, setPairMsg] = useState('');

  useEffect(() => { healthAccessState().then(setHealth).catch(() => setHealth('unavailable')); }, []);

  const builtAt = (Constants.expoConfig?.extra as { builtAt?: string } | undefined)?.builtAt;
  const expiresIn = builtAt ? Math.ceil((new Date(builtAt).getTime() + 7 * 86_400_000 - Date.now()) / 86_400_000) : null;

  const save = async () => {
    const h = Number(height);
    if (!(h >= 90 && h <= 220)) return setError('Height must be 90 to 220 cm.');
    if (!DATE.test(birth) || isNaN(new Date(birth).getTime())) return setError('Birth date must look like 2001-03-10.');
    if (!HM.test(rem) || !HM.test(cut)) return setError('Times must look like 07:00.');
    const g = goal.trim() ? Number(goal) : null;
    if (g !== null && !(g >= 30 && g <= 250)) return setError('Goal weight must be 30 to 250 kg.');
    setError('');
    const repo = await getRepo();
    const p: Profile = { sex, heightCm: h, birthDate: birth, athlete, goalWeightKg: g };
    await repo.saveProfile(p);
    await repo.recomputeAll(p);
    await repo.saveSettings({ reminderTime: rem, cutoffTime: cut, reminderEnabled: remOn });
    if (firstRun) {
      await requestNotificationAccess();
      await requestHealthAccess().catch(() => {});
    }
    await refreshReminders();
    onDone();
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: 16, paddingTop: 64 }} keyboardShouldPersistTaps="handled">
      <Text style={{ color: theme.text, fontSize: 26, fontWeight: '700' }}>{firstRun ? 'Set up better-scale' : 'Settings'}</Text>
      <Text style={{ color: theme.dim, fontSize: 12, marginTop: 4 }}>Your profile is used only on this phone to compute body composition.</Text>

      <View style={{ flexDirection: 'row', marginTop: 16, backgroundColor: '#2C2C2E', borderRadius: 9, padding: 2 }}>
        {(['male', 'female'] as const).map((s) => (
          <Pressable key={s} onPress={() => setSex(s)} style={{ flex: 1, padding: 7, borderRadius: 7, backgroundColor: sex === s ? '#636366' : 'transparent' }}>
            <Text style={{ color: theme.text, textAlign: 'center' }}>{s === 'male' ? 'Male' : 'Female'}</Text>
          </Pressable>
        ))}
      </View>
      <Field label="Height (cm)" value={height} onChange={setHeight} keyboard="numeric" />
      <Field label="Birth date (YYYY-MM-DD)" value={birth} onChange={setBirth} placeholder="2001-03-10" />
      <Field label="Goal weight (kg, optional)" value={goal} onChange={setGoal} keyboard="numeric" />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
        <Text style={{ color: theme.text }}>Athlete mode</Text>
        <Switch value={athlete} onValueChange={setAthlete} />
      </View>

      <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700', marginTop: 24 }}>Morning reminder</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <Text style={{ color: theme.text }}>Remind me</Text>
        <Switch value={remOn} onValueChange={setRemOn} />
      </View>
      <Field label="Reminder time (HH:MM)" value={rem} onChange={setRem} />
      <Field label="Follow-up if no weigh-in by (HH:MM)" value={cut} onChange={setCut} />

      {error ? <Text style={{ color: theme.red, marginTop: 12 }}>{error}</Text> : null}
      <Pressable onPress={save} style={{ backgroundColor: theme.red, borderRadius: 12, padding: 14, marginTop: 20 }}>
        <Text style={{ color: theme.text, textAlign: 'center', fontWeight: '700' }}>{firstRun ? 'Continue' : 'Save'}</Text>
      </Pressable>

      {!firstRun && (
        <View style={{ marginTop: 28 }}>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>Scale</Text>
          <Pressable onPress={async () => { try { setPairMsg('Step on the scale now…'); await pairScale(async (id) => (await getRepo()).saveScaleId(id)); setPairMsg('Paired.'); } catch (e: any) { setPairMsg(String(e?.message ?? e)); } }}>
            <Text style={{ color: theme.cyan, marginTop: 8 }}>Pair or re-pair the scale</Text>
          </Pressable>
          {pairMsg ? <Text style={{ color: theme.dim, fontSize: 12 }}>{pairMsg}</Text> : null}

          <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700', marginTop: 20 }}>Apple Health</Text>
          <Text style={{ color: theme.dim, marginTop: 4 }}>Access: {health}</Text>
          <Pressable onPress={async () => { await requestHealthAccess().catch(() => {}); setHealth(await healthAccessState()); }}>
            <Text style={{ color: theme.cyan, marginTop: 6 }}>Allow access to Apple Health</Text>
          </Pressable>

          <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700', marginTop: 20 }}>Install</Text>
          <Text style={{ color: expiresIn !== null && expiresIn <= 1 ? theme.red : theme.dim, marginTop: 4 }}>
            {expiresIn === null ? 'Build date unknown.' : expiresIn > 0 ? `Expires in about ${expiresIn} day${expiresIn > 1 ? 's' : ''}. Reinstall from Xcode before then.` : 'Expired. Reinstall from Xcode.'}
          </Text>
          <Text style={{ color: theme.dim, fontSize: 12, marginTop: 14 }}>
            Tip: don't swipe better-scale away in the app switcher. iOS won't wake a force-quit app when you step on the scale.
          </Text>
          <Pressable onPress={onDone}><Text style={{ color: theme.cyan, marginTop: 16 }}>‹ Back</Text></Pressable>
        </View>
      )}
    </ScrollView>
  );
}
