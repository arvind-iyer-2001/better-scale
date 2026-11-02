import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { getRepo, refreshReminders } from '../../app/bootstrap';
import type { Profile } from '../../domain/types';
import { pairScale } from '../../native/ble';
import { healthAccessState, requestHealthAccess } from '../../native/health';
import { requestNotificationAccess } from '../../native/notifications';
import { DatePick, Ghost, Primary, Segmented, Stepper, TimePick } from '../forms';
import { theme } from '../theme';

type Step = 'welcome' | 'how' | 'tips' | 'body' | 'birth' | 'mode' | 'goal' | 'reminder' | 'access' | 'pair';
const STEPS: Step[] = ['welcome', 'how', 'tips', 'body', 'birth', 'mode', 'goal', 'reminder', 'access', 'pair'];

const Title = ({ children }: { children: string }) => <Text style={{ color: theme.text, fontSize: 30, fontWeight: '700' }}>{children}</Text>;
const Sub = ({ children }: { children: string }) => <Text style={{ color: theme.dim, fontSize: 16, marginTop: 8, lineHeight: 22 }}>{children}</Text>;

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const [sex, setSex] = useState<Profile['sex']>('male');
  const [height, setHeight] = useState(170);
  const [birth, setBirth] = useState('1995-01-01');
  const [athlete, setAthlete] = useState(false);
  const [goal, setGoal] = useState<number | null>(null);
  const [remOn, setRemOn] = useState(true);
  const [rem, setRem] = useState('07:00');
  const [healthOk, setHealthOk] = useState<string | null>(null);
  const [notifOk, setNotifOk] = useState<boolean | null>(null);
  const [pairMsg, setPairMsg] = useState('');
  const [paired, setPaired] = useState(false);
  const [busy, setBusy] = useState(false);

  const next = () => setI((n) => Math.min(STEPS.length - 1, n + 1));
  const back = () => setI((n) => Math.max(0, n - 1));

  const finish = async () => {
    setBusy(true);
    const repo = await getRepo();
    const p: Profile = { sex, heightCm: height, birthDate: birth, athlete, goalWeightKg: goal };
    await repo.saveProfile(p);
    await repo.recomputeAll(p);
    await repo.saveSettings({ reminderTime: rem, cutoffTime: '09:30', reminderEnabled: remOn, weeklySummary: true });
    await refreshReminders();
    onDone();
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: 64 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 28 }}>
        {i > 0 ? <Pressable onPress={back} hitSlop={12}><Text style={{ color: theme.cyan, fontSize: 17 }}>‹ Back</Text></Pressable> : <View />}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {STEPS.map((s, k) => <View key={s} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: k <= i ? theme.red : '#3A3A3C' }} />)}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 28, flexGrow: 1 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
        {step === 'welcome' && (
          <>
            <Title>Welcome to better-scale</Title>
            <Sub>Step on your scale and your weight and body composition land here and in Apple Health, with no app to open.</Sub>
            <Text style={{ color: theme.dim, fontSize: 14, marginTop: 24 }}>Takes about a minute. Everything stays on this phone.</Text>
          </>
        )}

        {step === 'how' && (
          <>
            <Title>How it works</Title>
            <Sub>Your scale records in the background. There's nothing to open and nothing to press.</Sub>
            <View style={{ marginTop: 28, gap: 16 }}>
              {[
                ['1', 'Step on the scale', 'Wait for the number to lock, about 10 seconds.'],
                ['2', 'It saves itself', 'iOS wakes better-scale quietly and records the weigh-in.'],
                ['3', 'It lands in Apple Health', 'Weight, BMI, body fat and lean mass, with the full breakdown here.'],
              ].map(([n, t, d]) => (
                <View key={n} style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: theme.red, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: theme.text, fontWeight: '700' }}>{n}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontSize: 17, fontWeight: '600' }}>{t}</Text>
                    <Text style={{ color: theme.dim, fontSize: 14, marginTop: 2 }}>{d}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {step === 'tips' && (
          <>
            <Title>For good readings</Title>
            <Sub>A few habits make the trend meaningful.</Sub>
            <View style={{ marginTop: 28, gap: 16 }}>
              {[
                ['Weigh in at the same time', 'First thing in the morning, after the toilet and before eating.'],
                ['Bare feet, dry skin', 'Body composition reads resistance through your feet, so socks and wet feet skew it.'],
                ['Stand still on both feet', 'Distribute your weight evenly until the number locks.'],
                ["Don't swipe the app away", "iOS won't wake a force-quit app when you step on the scale. Rebooting is fine."],
              ].map(([t, d]) => (
                <View key={t} style={{ backgroundColor: theme.card, borderRadius: 14, padding: 14 }}>
                  <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>{t}</Text>
                  <Text style={{ color: theme.dim, fontSize: 14, marginTop: 3 }}>{d}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {step === 'body' && (
          <>
            <Title>About you</Title>
            <Sub>The scale only measures weight and resistance. Sex and height turn that into body fat and muscle.</Sub>
            <View style={{ marginTop: 28 }}>
              <Segmented options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} value={sex} onChange={setSex} />
            </View>
            <Text style={{ color: theme.dim, fontSize: 13, marginTop: 32, marginBottom: 12 }}>HEIGHT (press and hold to move faster)</Text>
            <Stepper value={height} onChange={setHeight} min={90} max={220} unit="cm" />
          </>
        )}

        {step === 'birth' && (
          <>
            <Title>Date of birth</Title>
            <Sub>Body composition shifts with age, so the numbers need it.</Sub>
            <View style={{ marginTop: 12 }}><DatePick value={birth} onChange={setBirth} /></View>
          </>
        )}

        {step === 'mode' && (
          <>
            <Title>How do you train?</Title>
            <Sub>Athlete mode adjusts the formula for people who train hard most days. The standard formula reads too much body fat for them.</Sub>
            <View style={{ marginTop: 28 }}>
              <Segmented options={[{ value: 'standard', label: 'Standard' }, { value: 'athlete', label: 'Athlete' }]} value={athlete ? 'athlete' : 'standard'} onChange={(v) => setAthlete(v === 'athlete')} />
            </View>
            <Text style={{ color: theme.dim, fontSize: 14, marginTop: 16, lineHeight: 20 }}>
              Pick Athlete only for serious training, around 8+ hours a week. You can change this later in Settings.
            </Text>
          </>
        )}

        {step === 'goal' && (
          <>
            <Title>Goal weight</Title>
            <Sub>Optional. Your home screen shows how far you are from it.</Sub>
            <View style={{ marginTop: 32 }}>
              <Stepper value={goal ?? 70} onChange={setGoal} min={30} max={250} step={0.5} decimals={1} unit="kg" />
            </View>
          </>
        )}

        {step === 'reminder' && (
          <>
            <Title>Morning reminder</Title>
            <Sub>A nudge to weigh in at the same time each day gives the cleanest trend. If you haven't weighed in by 09:30 you get one follow-up.</Sub>
            <View style={{ marginTop: 20 }}>
              <Segmented options={[{ value: 'on', label: 'Remind me' }, { value: 'off', label: 'No reminder' }]} value={remOn ? 'on' : 'off'} onChange={(v) => setRemOn(v === 'on')} />
            </View>
            {remOn && <View style={{ marginTop: 8 }}><TimePick value={rem} onChange={setRem} /></View>}
          </>
        )}

        {step === 'access' && (
          <>
            <Title>Permissions</Title>
            <Sub>Apple Health stores your weigh-ins. Notifications deliver the reminder and tell you if a reading looks off.</Sub>
            <View style={{ marginTop: 28, gap: 12 }}>
              <Pressable
                onPress={async () => { await requestHealthAccess().catch(() => {}); setHealthOk(await healthAccessState()); }}
                style={{ backgroundColor: theme.card, borderRadius: 14, padding: 16 }}
              >
                <Text style={{ color: theme.text, fontSize: 17, fontWeight: '600' }}>{healthOk === 'authorized' ? '✓ ' : ''}Allow Apple Health</Text>
                <Text style={{ color: theme.dim, fontSize: 13, marginTop: 4 }}>{healthOk === 'denied' ? 'Denied. Turn it on in Health › Sharing.' : 'Weight, BMI, body fat and lean mass.'}</Text>
              </Pressable>
              <Pressable
                onPress={async () => setNotifOk(await requestNotificationAccess())}
                style={{ backgroundColor: theme.card, borderRadius: 14, padding: 16 }}
              >
                <Text style={{ color: theme.text, fontSize: 17, fontWeight: '600' }}>{notifOk ? '✓ ' : ''}Allow notifications</Text>
                <Text style={{ color: theme.dim, fontSize: 13, marginTop: 4 }}>{notifOk === false ? 'Denied. Turn it on in iOS Settings.' : 'Reminders and outlier alerts.'}</Text>
              </Pressable>
            </View>
          </>
        )}

        {step === 'pair' && (
          <>
            <Title>Connect your scale</Title>
            <Sub>Tap the button, then step on the scale so it wakes up. After this, it records in the background. Don't swipe the app away.</Sub>
            <View style={{ marginTop: 28 }}>
              <Pressable
                onPress={async () => {
                  try { setPairMsg('Step on the scale now…'); await pairScale(async (id) => (await getRepo()).saveScaleId(id)); setPaired(true); setPairMsg('Scale connected.'); }
                  catch (e: any) { setPairMsg(String(e?.message ?? e)); }
                }}
                style={{ backgroundColor: theme.card, borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: paired ? theme.lime : theme.cyan }}
              >
                <Text style={{ color: paired ? theme.lime : theme.cyan, fontSize: 17, fontWeight: '700' }}>{paired ? '✓ Connected' : 'Connect scale'}</Text>
                {pairMsg ? <Text style={{ color: theme.dim, fontSize: 13, marginTop: 4 }}>{pairMsg}</Text> : null}
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: 36 }}>
        {step === 'pair' ? (
          <>
            <Primary label={busy ? 'Saving…' : paired ? 'Finish' : 'Finish without a scale'} onPress={finish} disabled={busy} />
          </>
        ) : (
          <>
            <Primary label={step === 'welcome' ? 'Get started' : step === 'goal' ? 'Set goal' : 'Continue'} onPress={() => { if (step === 'goal') setGoal(goal ?? 70); next(); }} />
            {step === 'goal' && <Ghost label="Skip" onPress={() => { setGoal(null); next(); }} />}
            {step === 'access' && <Ghost label="Not now" onPress={next} />}
          </>
        )}
      </View>
    </View>
  );
}
