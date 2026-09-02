import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopBar } from '@/components/top-bar';
import { PRIVACY_POLICY_URL } from '@/constants/config';
import { useAppTheme } from '@/hooks/use-app-theme';

function SettingsRow({
  icon,
  label,
  right,
  index,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  right?: ReactNode;
  index: number;
  onPress?: () => void;
}) {
  const { isDark } = useAppTheme();
  const fade = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 340,
      delay: index * 60,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    Animated.timing(translateY, {
      toValue: 0,
      duration: 340,
      delay: index * 60,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [fade, translateY, index]);

  const pressIn = () => {
    if (!onPress) return;
    Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  };
  const pressOut = () => {
    if (!onPress) return;
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  };

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY }, { scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={!onPress}
        className="flex-row items-center justify-between rounded-2xl bg-card px-4 py-4 active:opacity-70 dark:bg-card-dark">
        <View className="flex-row items-center gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-brand-50 dark:bg-slate-900/40">
            <Ionicons name={icon} size={18} color={isDark ? '#8bb4fd' : '#0049B7'} />
          </View>
          <Text className="text-[15px] font-medium text-slate-700 dark:text-slate-200">{label}</Text>
        </View>
        {right ?? (onPress ? <Ionicons name="chevron-forward" size={16} color={isDark ? '#475569' : '#cbd5e1'} /> : null)}
      </Pressable>
    </Animated.View>
  );
}

export default function SettingsScreen() {
  const { isDark, toggleTheme } = useAppTheme();
  const spin = useRef(new Animated.Value(isDark ? 1 : 0)).current;

  const handleToggleTheme = () => {
    Animated.spring(spin, { toValue: isDark ? 0 : 1, useNativeDriver: true, speed: 14, bounciness: 10 }).start();
    toggleTheme();
  };

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-surface dark:bg-surface-dark">
      <TopBar title="Settings" />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View className="gap-3 px-5 pt-4">
          <SettingsRow
            index={0}
            icon={isDark ? 'moon' : 'sunny'}
            label="Dark Mode"
            right={
              <Animated.View style={{ transform: [{ rotate }] }}>
                <Switch
                  value={isDark}
                  onValueChange={handleToggleTheme}
                  trackColor={{ false: '#e2e8f0', true: '#0049B7' }}
                  thumbColor="#ffffff"
                />
              </Animated.View>
            }
          />
          <SettingsRow index={1} icon="notifications-outline" label="Notification preferences" />
          <SettingsRow index={2} icon="shield-checkmark-outline" label="Privacy & security" />
          <SettingsRow
            index={3}
            icon="document-text-outline"
            label="Privacy Policy"
            onPress={() => {
              WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL).catch(() => {});
            }}
          />
          <SettingsRow index={4} icon="information-circle-outline" label="About WiZdom" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
