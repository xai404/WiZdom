import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopBar } from '@/components/top-bar';
import { useAppTheme } from '@/hooks/use-app-theme';

function SettingsRow({
  icon,
  label,
  right,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  right?: ReactNode;
}) {
  const { isDark } = useAppTheme();
  return (
    <View className="flex-row items-center justify-between rounded-2xl bg-card px-4 py-4 dark:bg-card-dark">
      <View className="flex-row items-center gap-3">
        <Ionicons name={icon} size={19} color={isDark ? '#8bb4fd' : '#0049B7'} />
        <Text className="text-[15px] font-medium text-slate-700 dark:text-slate-200">{label}</Text>
      </View>
      {right}
    </View>
  );
}

export default function SettingsScreen() {
  const { isDark, toggleTheme } = useAppTheme();

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark">
      <TopBar title="Settings" />
      <View className="flex-1 gap-3 px-5 pt-4">
        <SettingsRow
          icon={isDark ? 'moon' : 'sunny'}
          label="Dark Mode"
          right={
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#e2e8f0', true: '#0049B7' }}
              thumbColor="#ffffff"
            />
          }
        />
        <SettingsRow icon="notifications-outline" label="Notification preferences" />
        <SettingsRow icon="shield-checkmark-outline" label="Privacy & security" />
        <SettingsRow icon="information-circle-outline" label="About WiZdom" />
      </View>
    </SafeAreaView>
  );
}
