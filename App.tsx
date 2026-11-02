import { useState } from 'react';
import { StatusBar, View } from 'react-native';
import { HiddenReadingsScreen } from './src/ui/screens/HiddenReadingsScreen';
import { HomeScreen } from './src/ui/screens/HomeScreen';
import { SettingsScreen } from './src/ui/screens/SettingsScreen';
import { useData } from './src/ui/useData';
import { theme } from './src/ui/theme';

export default function App() {
  const d = useData();
  const [screen, setScreen] = useState<'home' | 'hidden' | 'settings'>('home');
  if (!d.loaded || !d.settings) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;

  const firstRun = !d.profile;
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle="light-content" />
      {firstRun || screen === 'settings' ? (
        <SettingsScreen profile={d.profile} settings={d.settings} firstRun={firstRun} onDone={async () => { await d.refresh(); setScreen('home'); }} />
      ) : screen === 'hidden' ? (
        <HiddenReadingsScreen hidden={d.hidden} onBack={() => setScreen('home')} onChanged={d.refresh} />
      ) : (
        <HomeScreen readings={d.readings} hiddenCount={d.hidden.length} profile={d.profile} onHidden={() => setScreen('hidden')} onSettings={() => setScreen('settings')} />
      )}
    </View>
  );
}
