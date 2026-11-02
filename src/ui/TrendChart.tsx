import { useEffect, useMemo } from 'react';
import { Text, View } from 'react-native';
import { Canvas, DashPathEffect, Path, Skia } from '@shopify/react-native-skia';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { theme } from './theme';

type Pt = { ts: number; value: number };
type Props = { points: Pt[]; avg7: Pt[]; color: string; width: number; height: number; unit: string; decimals: number };

const PAD = 8;

export function TrendChart({ points, avg7, color, width, height, unit, decimals }: Props) {
  const draw = useSharedValue(0);
  useEffect(() => {
    draw.value = 0;
    draw.value = withTiming(1, { duration: 700 });
  }, [points, draw]);

  const { line, avg, min, max } = useMemo(() => {
    const vals = points.map((p) => p.value);
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const span = hi - lo || 1;
    const t0 = points[0]?.ts ?? 0;
    const tSpan = (points[points.length - 1]?.ts ?? 1) - t0 || 1;
    const x = (ts: number) => PAD + ((ts - t0) / tSpan) * (width - 2 * PAD);
    const y = (v: number) => height - PAD - ((v - lo) / span) * (height - 2 * PAD);
    const build = (pts: Pt[]) => {
      const b = Skia.PathBuilder.Make();
      pts.forEach((q, i) => (i === 0 ? b.moveTo(x(q.ts), y(q.value)) : b.lineTo(x(q.ts), y(q.value))));
      return b.build();
    };
    return { line: build(points), avg: build(avg7), min: lo, max: hi };
  }, [points, avg7, width, height]);

  if (points.length < 2) {
    return (
      <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: theme.dim }}>{points.length ? 'One reading so far' : 'No readings yet'}</Text>
      </View>
    );
  }
  return (
    <View>
      <Canvas style={{ width, height }}>
        <Path path={avg} style="stroke" strokeWidth={1.5} color={theme.dim}>
          <DashPathEffect intervals={[4, 4]} />
        </Path>
        <Path path={line} style="stroke" strokeWidth={3} color={color} strokeCap="round" strokeJoin="round" start={0} end={draw} />
      </Canvas>
      <Text style={{ position: 'absolute', right: 4, top: 0, color: theme.dim, fontSize: 10 }}>{max.toFixed(decimals)} {unit}</Text>
      <Text style={{ position: 'absolute', right: 4, bottom: 0, color: theme.dim, fontSize: 10 }}>{min.toFixed(decimals)} {unit}</Text>
    </View>
  );
}
