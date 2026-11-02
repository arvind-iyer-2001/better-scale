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
          <Text style={{ color: theme.dim, fontSize: 14 }}>
            {delta > 0 ? '+' : ''}{delta.toFixed(def.decimals)} vs 7-day avg
          </Text>
        )}
        {metric === 'weightKg' && toGoal !== null && (
          <Text style={{ color: theme.dim, fontSize: 14 }}>
            {toGoal > 0 ? `${toGoal.toFixed(1)} kg to goal` : 'Goal reached'}
          </Text>
        )}
        {latest && (
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
            <Pressable
              hitSlop={8}
              onPress={async () => { await (await getRepo()).setFlag(latest.id, true, 'Hidden by you'); onPaired(); }}
            >
              <Text style={{ color: theme.dim, fontSize: 12, textDecorationLine: 'underline' }}>Not you? Hide this reading</Text>
            </Pressable>
            <Pressable hitSlop={8} onPress={() => Share.share({ message: shareText(readings, profile?.goalWeightKg ?? null, new Date()) })}>
              <Text style={{ color: theme.cyan, fontSize: 12, textDecorationLine: 'underline' }}>Share progress</Text>
            </Pressable>
          </View>
        )}
      </View>

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
