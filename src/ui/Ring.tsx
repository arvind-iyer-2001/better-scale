import { useEffect } from 'react';
import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import { useSharedValue, withTiming } from 'react-native-reanimated';

type Props = { size: number; rings: { progress: number; color: string }[] };

const STROKE = 9;

function Arc({ cx, r, color, progress }: { cx: number; r: number; color: string; progress: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = 0;
    p.value = withTiming(Math.max(0, Math.min(1, progress)), { duration: 900 });
  }, [progress, p]);
  const path = Skia.PathBuilder.Make().addCircle(cx, cx, r).build();
  return (
    <Group transform={[{ rotate: -Math.PI / 2 }]} origin={{ x: cx, y: cx }}>
      <Path path={path} style="stroke" strokeWidth={STROKE} color={color} opacity={0.22} />
      <Path path={path} style="stroke" strokeWidth={STROKE} color={color} strokeCap="round" start={0} end={p} />
    </Group>
  );
}

export function Ring({ size, rings }: Props) {
  const c = size / 2;
  return (
    <Canvas style={{ width: size, height: size }}>
      {rings.map((ring, i) => (
        <Arc key={i} cx={c} r={c - STROKE / 2 - i * (STROKE + 4)} color={ring.color} progress={ring.progress} />
      ))}
    </Canvas>
  );
}
