import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Linking, Modal, Pressable, ScrollView, Share, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { getRepo } from '../../app/bootstrap';
import { buildSeries, type Range } from '../../domain/series';
import { findIssues, daysLeft } from '../../domain/status';
import { shareText } from '../../domain/summary';
import { pairScale } from '../../native/ble';
import { healthAccessState, requestHealthAccess } from '../../native/health';
import { notificationAccessState, requestNotificationAccess } from '../../native/notifications';
import type { MetricKey, Profile, Reading } from '../../domain/types';
import { MetricTile } from '../MetricTile';
import { TrendChart } from '../TrendChart';
import { METRICS, fmt, type MetricDef } from '../metrics';
import { theme } from '../theme';

type Props = {
  readings: Reading[]; hiddenCount: number; profile: Profile | null; scaleId: string | null;
  onHidden: () => void; onSettings: () => void; onPaired: () => void;
};

const RANGES: Range[] = ['1M', '3M', '1Y'];

export function HomeScreen({ readings, hiddenCount, profile, scaleId, onHidden, onSettings, onPaired }: Props) {
  const [pairMsg, setPairMsg] = useState('');
  const [explain, setExplain] = useState<MetricDef | null>(null);
  const [health, setHealth] = useState<string | null>(null);
  const [notif, setNotif] = useState<string | null>(null);
  const checkAccess = useCallback(() => {
    healthAccessState().then(setHealth).catch(() => {});
    notificationAccessState().then(setNotif).catch(() => {});
  }, []);
  useEffect(() => {
    checkAccess();
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') checkAccess(); });
    return () => sub.remove();
  }, [checkAccess]);
  const builtAt = (Constants.expoConfig?.extra as { builtAt?: string } | undefined)?.builtAt;
  const issues = findIssues({ health, notifications: notif, daysLeft: daysLeft(builtAt, new Date()) });
  const fix = async (id: string) => {
    if (id === 'health') await requestHealthAccess().catch(() => {});
    if (id === 'notifications') { if (!(await requestNotificationAccess())) await Linking.openSettings().catch(() => {}); }
    checkAccess();
  };
  const { width } = useWindowDimensions();
  const [metric, setMetric] = useState<MetricKey>('weightKg');
  const [range, setRange] = useState<Range>('1M');
  const def = METRICS.find((m) => m.key === metric)!;
  const latest = readings[readings.length - 1];
  const now = new Date();
  const series = useMemo(() => buildSeries(readings, metric, range, now), [readings, metric, range]);

  const seen = useRef<{ latest: number | null; hidden: number } | null>(null);
  useEffect(() => {
    const cur = { latest: latest?.id ?? null, hidden: hiddenCount };
    const prev = seen.current;
    seen.current = cur;
    if (!prev) return;
    if (cur.hidden > prev.hidden) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    else if (cur.latest !== null && cur.latest !== prev.latest) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [latest?.id, hiddenCount]);

  const goal = profile?.goalWeightKg ?? null;
  const toGoal = goal !== null && latest ? latest.weightKg - goal : null;

  const when = latest
    ? new Date(latest.ts).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })
    : 'Step on the scale to record your first weigh-in';
  const delta = series.deltaVsAvg7;
  const startKg = readings[0]?.weightKg ?? latest?.weightKg ?? 0;
  const reached = toGoal !== null && latest !== undefined && (startKg >= (goal ?? 0) ? toGoal <= 0 : toGoal >= 0);
  const span = goal !== null ? startKg - goal : 0;
  const progress = reached ? 1 : goal !== null && latest && Math.abs(span) > 0.05 ? Math.min(1, Math.max(0, (startKg - latest.weightKg) / span)) : 0;
  // Moving toward the goal reads green; away reads amber, never red. Without a goal it stays neutral.
  const goodDir = metric === 'weightKg' && goal !== null && delta !== null ? (goal < startKg ? delta < 0 : delta > 0) : null;
  const deltaColor = delta === null || Math.abs(delta) < 0.05 || goodDir === null ? theme.cyan : goodDir ? theme.lime : theme.amber;
  const [menu, setMenu] = useState(false);
  const afterMenu = (fn: () => void) => { setMenu(false); setTimeout(fn, 350); };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: 16, paddingTop: 64 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: theme.dim, fontSize: 12, letterSpacing: 0.4 }}>{when.toUpperCase()}</Text>
        <Pressable onPress={onSettings} hitSlop={16} style={{ width: 56, height: 48, alignItems: 'flex-end', justifyContent: 'center', marginRight: -8 }}><Text style={{ color: theme.dim, fontSize: 22 }}>⚙︎</Text></Pressable>
      </View>

      {!scaleId && (
        <Pressable
          onPress={async () => {
            try { setPairMsg('Step on the scale now…'); await pairScale(async (id) => (await getRepo()).saveScaleId(id)); setPairMsg(''); onPaired(); }
            catch (e: any) { setPairMsg(String(e?.message ?? e)); }
          }}
          style={{ backgroundColor: theme.card, borderRadius: 14, padding: 14, marginTop: 12, borderWidth: 1.5, borderColor: theme.cyan }}
        >
          <Text style={{ color: theme.cyan, fontWeight: '700' }}>Pair your scale</Text>
          <Text style={{ color: theme.dim, fontSize: 12, marginTop: 2 }}>{pairMsg || 'Tap, then step on the scale so it wakes up.'}</Text>
        </Pressable>
      )}

      {issues.map((i) => (
        <Pressable
          key={i.id}
          disabled={i.id === 'expiry'}
          onPress={() => fix(i.id)}
          style={{ backgroundColor: theme.card, borderRadius: 14, padding: 12, marginTop: 10, borderWidth: 1.5, borderColor: theme.amber }}
        >
          <Text style={{ color: theme.amber, fontWeight: '700' }}>{i.title}</Text>
          <Text style={{ color: theme.dim, fontSize: 12, marginTop: 2 }}>{i.detail}</Text>
        </Pressable>
      ))}

      <View style={{ marginTop: 12 }}>
        <Text style={{ color: theme.dim, fontSize: 13 }}>{def.label}</Text>
        <Text style={{ color: theme.text, fontSize: 56, fontWeight: '700', lineHeight: 62 }}>
          {fmt(latest?.metrics[metric], def.decimals)}
          <Text style={{ color: theme.dim, fontSize: 20, fontWeight: '500' }}> {def.unit}</Text>
        </Text>
        {delta !== null && (
          <View style={{ flexDirection: 'row', marginTop: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: deltaColor + '26', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 }}>
              <Text style={{ color: deltaColor, fontSize: 15, fontWeight: '700' }}>
                {Math.abs(delta) < 0.05 ? '→ Steady' : `${delta > 0 ? '↑' : '↓'} ${Math.abs(delta).toFixed(def.decimals)} ${def.unit}`}
              </Text>
              <Text style={{ color: theme.dim, fontSize: 12, marginLeft: 8 }}>vs your 7-day average</Text>
            </View>
          </View>
        )}
      </View>

      {metric === 'weightKg' && goal !== null && latest && (
        <View style={{ marginTop: 16, backgroundColor: theme.card, borderRadius: 18, padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text style={{ color: theme.text, fontSize: 15, fontWeight: '600' }}>Goal {goal.toFixed(1)} kg</Text>
            <Text style={{ color: reached ? theme.lime : theme.text, fontSize: 15, fontWeight: '700' }}>
              {reached ? 'Goal reached 🎉' : `${Math.abs(toGoal!).toFixed(1)} kg to go`}
            </Text>
          </View>
          <View style={{ height: 10, borderRadius: 5, backgroundColor: '#2C2C2E', marginTop: 12, overflow: 'hidden' }}>
            <View style={{ width: `${Math.round(progress * 100)}%`, height: '100%', borderRadius: 5, backgroundColor: theme.lime }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={{ color: theme.dim, fontSize: 11 }}>Start {startKg.toFixed(1)}</Text>
            <Text style={{ color: theme.dim, fontSize: 11 }}>{Math.round(progress * 100)}% there</Text>
          </View>
        </View>
      )}

      <View style={{ marginTop: 16, backgroundColor: theme.card, borderRadius: 18, padding: 8 }}>
        <TrendChart points={series.points} avg7={series.avg7} color={def.color} width={width - 48} height={160} unit={def.unit} decimals={def.decimals} />
        <View style={{ flexDirection: 'row', backgroundColor: '#2C2C2E', borderRadius: 9, padding: 2, marginTop: 8 }}>
          {RANGES.map((r) => (
            <Pressable key={r} onPress={() => setRange(r)} style={{ flex: 1, paddingVertical: 5, borderRadius: 7, backgroundColor: r === range ? '#636366' : 'transparent' }}>
              <Text style={{ color: theme.text, textAlign: 'center', fontSize: 12, fontWeight: '600' }}>{r}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {hiddenCount > 0 && (
        <Pressable onPress={onHidden}>
          <Text style={{ color: theme.dim, fontSize: 12, marginTop: 10 }}>{hiddenCount} reading{hiddenCount > 1 ? 's' : ''} hidden › review</Text>
        </Pressable>
      )}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 14 }}>
        {METRICS.map((m) => (
          <MetricTile key={m.key} def={m} value={latest?.metrics[m.key]} selected={m.key === metric} onPress={() => setMetric(m.key)} onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); setExplain(m); }} />
        ))}
      </View>
      <Text style={{ color: theme.dim, fontSize: 11, marginTop: 8 }}>
        Body fat is the scale's own model value. It can read a few points higher than the scale maker's own app, which adjusts it down.
      </Text>

      {latest && (
        <Pressable
          onPress={() => { Haptics.selectionAsync().catch(() => {}); setMenu(true); }}
          style={{ marginTop: 20, marginBottom: 32, backgroundColor: theme.card, borderRadius: 14, paddingVertical: 15, alignItems: 'center' }}
        >
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>More  •••</Text>
        </Pressable>
      )}

      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable onPress={() => setMenu(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={{ padding: 12, paddingBottom: 36 }}>
            <View style={{ backgroundColor: theme.card, borderRadius: 16, overflow: 'hidden' }}>
              <Pressable
                onPress={() => afterMenu(() => Share.share({ message: shareText(readings, profile?.goalWeightKg ?? null, new Date()) }))}
                style={{ padding: 18, borderBottomWidth: 0.5, borderBottomColor: theme.line }}
              >
                <Text style={{ color: theme.cyan, fontSize: 17, textAlign: 'center' }}>Share progress</Text>
              </Pressable>
              {hiddenCount > 0 && (
                <Pressable onPress={() => afterMenu(onHidden)} style={{ padding: 18, borderBottomWidth: 0.5, borderBottomColor: theme.line }}>
                  <Text style={{ color: theme.text, fontSize: 17, textAlign: 'center' }}>Review {hiddenCount} hidden reading{hiddenCount > 1 ? 's' : ''}</Text>
                </Pressable>
              )}
              <Pressable
                onPress={async () => { setMenu(false); if (latest) { await (await getRepo()).setFlag(latest.id, true, 'Hidden by you'); onPaired(); } }}
                style={{ padding: 18 }}
              >
                <Text style={{ color: theme.red, fontSize: 17, textAlign: 'center' }}>Not you? Hide latest reading</Text>
              </Pressable>
            </View>
            <Pressable onPress={() => setMenu(false)} style={{ marginTop: 10, backgroundColor: theme.card, borderRadius: 16, padding: 18 }}>
              <Text style={{ color: theme.text, fontSize: 17, fontWeight: '600', textAlign: 'center' }}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={explain !== null} transparent animationType="fade" onRequestClose={() => setExplain(null)}>
        <Pressable onPress={() => setExplain(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <Pressable style={{ backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 }}>
            {explain && (
              <>
                <Text style={{ color: explain.color, fontSize: 13, fontWeight: '700' }}>{explain.label.toUpperCase()}</Text>
                <Text style={{ color: theme.text, fontSize: 40, fontWeight: '700', marginTop: 4 }}>
                  {fmt(latest?.metrics[explain.key], explain.decimals)}
                  <Text style={{ color: theme.dim, fontSize: 18, fontWeight: '500' }}> {explain.unit}</Text>
                </Text>
                <Text style={{ color: theme.text, fontSize: 16, lineHeight: 23, marginTop: 12 }}>{explain.about}</Text>
                <Text style={{ color: theme.dim, fontSize: 12, marginTop: 14 }}>Estimates from a foot-to-foot scale. Watch the trend, not single readings.</Text>
                <Pressable onPress={() => { setMetric(explain.key); setExplain(null); }} style={{ marginTop: 16 }}>
                  <Text style={{ color: theme.cyan, fontSize: 15, fontWeight: '600' }}>Show trend</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
