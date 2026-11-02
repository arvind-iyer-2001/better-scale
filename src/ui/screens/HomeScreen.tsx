import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { getRepo } from '../../app/bootstrap';
import { buildSeries, type Range } from '../../domain/series';
import { pairScale } from '../../native/ble';
import type { MetricKey, Profile, Reading } from '../../domain/types';
import { MetricTile } from '../MetricTile';
import { Ring } from '../Ring';
import { TrendChart } from '../TrendChart';
import { METRICS, fmt } from '../metrics';
import { theme } from '../theme';

type Props = {
  readings: Reading[]; hiddenCount: number; profile: Profile | null; scaleId: string | null;
  onHidden: () => void; onSettings: () => void; onPaired: () => void;
};

const RANGES: Range[] = ['1M', '3M', '1Y'];
const DAY = 86_400_000;

export function HomeScreen({ readings, hiddenCount, profile, scaleId, onHidden, onSettings, onPaired }: Props) {
  const [pairMsg, setPairMsg] = useState('');
  const { width } = useWindowDimensions();
  const [metric, setMetric] = useState<MetricKey>('weightKg');
  const [range, setRange] = useState<Range>('1M');
  const def = METRICS.find((m) => m.key === metric)!;
  const latest = readings[readings.length - 1];
  const now = new Date();
  const series = useMemo(() => buildSeries(readings, metric, range, now), [readings, metric, range]);

  const goal = profile?.goalWeightKg ?? null;
  const first = readings[0]?.weightKg;
  const goalProgress =
    goal && first !== undefined && latest && first !== goal ? (first - latest.weightKg) / (first - goal) : 0;
  const weekDays = new Set(readings.filter((r) => r.ts > now.getTime() - 7 * DAY).map((r) => new Date(r.ts).toDateString())).size;

  const when = latest
    ? new Date(latest.ts).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })
    : 'Step on the scale to record your first weigh-in';
  const delta = series.deltaVsAvg7;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: 16, paddingTop: 64 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: theme.dim, fontSize: 12, letterSpacing: 0.4 }}>{when.toUpperCase()}</Text>
        <Pressable onPress={onSettings}><Text style={{ color: theme.dim, fontSize: 22 }}>⚙︎</Text></Pressable>
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

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
        <Ring size={96} rings={[{ progress: goalProgress, color: theme.red }, { progress: weekDays / 7, color: theme.lime }]} />
        <View style={{ marginLeft: 16 }}>
          <Text style={{ color: theme.text, fontSize: 36, fontWeight: '700' }}>
            {fmt(latest?.metrics[metric], def.decimals)}
            <Text style={{ color: theme.dim, fontSize: 15, fontWeight: '500' }}> {def.unit}</Text>
          </Text>
          <Text style={{ color: theme.dim, fontSize: 12 }}>{def.label}</Text>
          {delta !== null && (
            <Text style={{ color: delta <= 0 ? theme.lime : theme.amber, fontSize: 13, marginTop: 2 }}>
              {delta > 0 ? '+' : ''}{delta.toFixed(def.decimals)} vs 7-day avg
            </Text>
          )}
        </View>
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
          <MetricTile key={m.key} def={m} value={latest?.metrics[m.key]} selected={m.key === metric} onPress={() => setMetric(m.key)} />
        ))}
      </View>
      <Text style={{ color: theme.dim, fontSize: 11, marginTop: 8 }}>
        Body fat is the scale's own model value. It reads about 4 points higher than Cult Connect, which lowers it.
      </Text>
    </ScrollView>
  );
}
