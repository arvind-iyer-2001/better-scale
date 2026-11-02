import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, Switch, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from './theme';

export const pad = (n: number) => String(n).padStart(2, '0');
export const toHM = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const fromHM = (hm: string) => {
  const [h, m] = hm.split(':').map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
};
export const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromYMD = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y || 1990, (m || 1) - 1, d || 1);
};

export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: '#2C2C2E', borderRadius: 10, padding: 2 }}>
      {options.map((o) => (
        <Pressable key={o.value} onPress={() => onChange(o.value)} style={{ flex: 1, paddingVertical: 9, borderRadius: 8, backgroundColor: o.value === value ? '#636366' : 'transparent' }}>
          <Text style={{ color: theme.text, textAlign: 'center', fontWeight: '600' }}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Rounded card holding rows, iOS-grouped-list style. */
export function Group({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  return (
    <View style={{ marginTop: 24 }}>
      {title ? <Text style={{ color: theme.dim, fontSize: 12, letterSpacing: 0.5, marginLeft: 16, marginBottom: 6 }}>{title.toUpperCase()}</Text> : null}
      <View style={{ backgroundColor: theme.card, borderRadius: 14, overflow: 'hidden' }}>{children}</View>
      {footer ? <Text style={{ color: theme.dim, fontSize: 12, marginHorizontal: 16, marginTop: 6 }}>{footer}</Text> : null}
    </View>
  );
}

export function Row({ label, value, onPress, right, last, valueColor }: { label: string; value?: string; onPress?: () => void; right?: ReactNode; last?: boolean; valueColor?: string }) {
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, minHeight: 48, borderBottomWidth: last ? 0 : 0.5, borderBottomColor: theme.line }}>
      <Text style={{ color: theme.text, fontSize: 16 }}>{label}</Text>
      {right ?? (value !== undefined ? <Text style={{ color: valueColor ?? theme.dim, fontSize: 16 }}>{value}{onPress ? '  ›' : ''}</Text> : null)}
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{body}</Pressable> : body;
}

export function Primary({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={{ backgroundColor: theme.red, opacity: disabled ? 0.4 : 1, borderRadius: 14, paddingVertical: 16 }}>
      <Text style={{ color: theme.text, textAlign: 'center', fontWeight: '700', fontSize: 17 }}>{label}</Text>
    </Pressable>
  );
}

export function Ghost({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ paddingVertical: 14 }}>
      <Text style={{ color: theme.dim, textAlign: 'center', fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}

export function TimePick({ value, onChange }: { value: string; onChange: (hm: string) => void }) {
  return (
    <DateTimePicker mode="time" display="spinner" themeVariant="dark" textColor={theme.text} value={fromHM(value)} onChange={(_, d) => d && onChange(toHM(d))} />
  );
}

export function DatePick({ value, onChange }: { value: string; onChange: (ymd: string) => void }) {
  return (
    <DateTimePicker
      mode="date" display="spinner" themeVariant="dark" textColor={theme.text} value={fromYMD(value)}
      minimumDate={new Date(1920, 0, 1)} maximumDate={new Date()} onChange={(_, d) => d && onChange(toYMD(d))}
    />
  );
}

/** Big number with − / + steppers; tap the number to type a value instead. */
export function Stepper({ value, onChange, min, max, step = 1, unit, decimals = 0 }: { value: number; onChange: (n: number) => void; min: number; max: number; step?: number; unit: string; decimals?: number }) {
  const [text, setText] = useState(value.toFixed(decimals));
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!editing) setText(value.toFixed(decimals)); }, [value, decimals, editing]);
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n * 100) / 100));
  const set = (n: number) => onChange(clamp(n));
  const commit = () => {
    setEditing(false);
    const n = Number(text.replace(',', '.'));
    if (text.trim() === '' || Number.isNaN(n)) { setText(value.toFixed(decimals)); return; }
    const c = clamp(decimals === 0 ? Math.round(n) : n);
    onChange(c);
    setText(c.toFixed(decimals));
  };
  const btn = (label: string, delta: number) => (
    <Pressable onPress={() => set(value + delta)} onLongPress={() => set(value + delta * 5)} style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#2C2C2E', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: theme.text, fontSize: 28, marginTop: -2 }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      {btn('−', -step)}
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', flex: 1 }}>
        <TextInput
          value={text}
          onChangeText={(t) => { setEditing(true); setText(t); }}
          onFocus={() => { setEditing(true); setText(''); }}
          placeholder={value.toFixed(decimals)}
          placeholderTextColor="#48484A"
          onBlur={commit}
          onSubmitEditing={commit}
          keyboardType="numbers-and-punctuation"
          returnKeyType="done"
          maxLength={6}
          style={{ color: theme.text, fontSize: 56, fontWeight: '700', minWidth: 90, textAlign: 'center', padding: 0 }}
        />
        <Text style={{ color: theme.dim, fontSize: 20, fontWeight: '500' }}> {unit}</Text>
      </View>
      {btn('+', step)}
    </View>
  );
}

/** Switch pinned to the row's vertical center (the native control otherwise hugs the top of a taller row). */
export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ height: 48, justifyContent: 'center', alignItems: 'flex-end' }}>
      <Switch value={value} onValueChange={onChange} style={{ alignSelf: 'flex-end' }} />
    </View>
  );
}
