import { Pressable, ScrollView, Text, View } from 'react-native';
import { getRepo } from '../../app/bootstrap';
import type { Reading } from '../../domain/types';
import { theme } from '../theme';

type Props = { hidden: Reading[]; onBack: () => void; onChanged: () => void };

export function HiddenReadingsScreen({ hidden, onBack, onChanged }: Props) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: 16, paddingTop: 64 }}>
      <Pressable onPress={onBack}><Text style={{ color: theme.cyan, fontSize: 15 }}>‹ Back</Text></Pressable>
      <Text style={{ color: theme.text, fontSize: 26, fontWeight: '700', marginTop: 8 }}>Hidden readings</Text>
      <Text style={{ color: theme.dim, fontSize: 12, marginTop: 4 }}>
        These didn't fit your recent weigh-ins, so they're kept but left off the graphs and out of Apple Health.
      </Text>
      {hidden.length === 0 && <Text style={{ color: theme.dim, marginTop: 24 }}>Nothing hidden.</Text>}
      {[...hidden].reverse().map((r) => (
        <View key={r.id} style={{ backgroundColor: theme.card, borderRadius: 14, padding: 12, marginTop: 10 }}>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>{r.weightKg} kg</Text>
          <Text style={{ color: theme.dim, fontSize: 12 }}>{new Date(r.ts).toLocaleString()}</Text>
          {r.flagReason && <Text style={{ color: theme.amber, fontSize: 12, marginTop: 4 }}>{r.flagReason}</Text>}
          <Pressable
            onPress={async () => { await (await getRepo()).confirmReading(r.id); onChanged(); }}
            style={{ marginTop: 8, alignSelf: 'flex-start', borderColor: theme.lime, borderWidth: 1, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10 }}
          >
            <Text style={{ color: theme.lime, fontSize: 13 }}>This is correct</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}
