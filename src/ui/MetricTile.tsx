import { Pressable, Text } from 'react-native';
import { fmt, type MetricDef } from './metrics';
import { theme } from './theme';

type Props = { def: MetricDef; value: number | undefined; selected: boolean; onPress: () => void };

export function MetricTile({ def, value, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: '48%', backgroundColor: theme.card, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12,
        marginBottom: 8, borderWidth: 1.5, borderColor: selected ? def.color : 'transparent',
      }}
    >
      <Text style={{ color: def.color, fontSize: 12, fontWeight: '600' }}>{def.label}{def.unit === '%' || def.unit === 'kg' ? '' : ''}</Text>
      <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>
        {fmt(value, def.decimals)}
        <Text style={{ color: theme.dim, fontSize: 12, fontWeight: '500' }}> {def.unit}</Text>
      </Text>
    </Pressable>
  );
}
