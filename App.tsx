// TEMPORARY debug screen (Task 7). Replaced by the real UI in Task 10.
import { useEffect, useState } from 'react';
import { Button, SafeAreaView, ScrollView, Text } from 'react-native';
import { getRepo } from './src/app/bootstrap';
import { pairScale } from './src/native/ble';
import { readLog } from './src/native/log';
import type { Reading } from './src/domain/types';

export default function App() {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [logText, setLogText] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const t = setInterval(async () => {
      setReadings((await (await getRepo()).listReadings(undefined, true)).slice(-8));
      setLogText((await readLog()).split('\n').slice(-25).join('\n'));
    }, 1500);
    return () => clearInterval(t);
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, padding: 16, marginTop: 40, backgroundColor: '#000' }}>
      <Button title="Pair scale (step on it now)" onPress={async () => {
        try { setMsg('paired ' + (await pairScale(async (id) => (await getRepo()).saveScaleId(id)))); }
        catch (e: any) { setMsg(String(e?.message ?? e)); }
      }} />
      <Text style={{ color: '#8E8E93' }}>{msg}</Text>
      <ScrollView>
        {readings.map((r) => (
          <Text key={r.id} style={{ color: r.flagged ? '#FA114F' : '#fff', fontSize: 12 }}>
            {new Date(r.ts).toLocaleTimeString()} {r.weightKg} kg z={r.impedanceOhm} fat={r.metrics.fatPct ?? '-'} {r.flagged ? 'FLAGGED' : ''}
          </Text>
        ))}
        <Text selectable style={{ color: '#8E8E93', fontFamily: 'Menlo', fontSize: 10, marginTop: 12 }}>{logText}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
