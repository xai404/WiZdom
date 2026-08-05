import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Linking, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { SupportContact } from '@/constants/contacts';
import { useAuth } from '@/context/auth-context';
import { useAppTheme } from '@/hooks/use-app-theme';
import { fetchSupportContacts } from '@/lib/support-contacts-api';

// Compact call icon for the header — tap opens a picker for WiZdom (super
// admin), the Editing Team, and the Application Team, fetched live each
// time so it always reflects whoever currently holds each role.
export function CallButton({ color, size = 44 }: { color?: string; size?: number } = {}) {
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<SupportContact[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  const handleOpen = () => {
    setOpen(true);
    if (!token) return;
    setLoadError('');
    fetchSupportContacts(token)
      .then(setContacts)
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Could not load contacts.'));
  };

  // A slow "breathing" dot so the button reads as alive/tappable at rest,
  // not just on press — scaled down to suit a compact header icon.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(900),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const pressIn = () => {
    Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  };
  const pressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  };

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  const handleCall = (contact: SupportContact) => {
    setOpen(false);
    Alert.alert(`Call ${contact.label}?`, contact.phone, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Call', onPress: () => Linking.openURL(`tel:${contact.phone}`) },
    ]);
  };

  return (
    <>
      <Pressable
        onPress={handleOpen}
        onPressIn={pressIn}
        onPressOut={pressOut}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Call support"
        className="items-center justify-center rounded-full active:bg-white/10"
        style={{ height: size, width: size }}>
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: size * 0.23,
            height: size * 0.23,
            borderRadius: size * 0.12,
            backgroundColor: color ?? '#0049B7',
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          }}
        />
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="call" size={size * 0.48} color={color ?? (isDark ? '#8bb4fd' : '#0049B7')} />
        </Animated.View>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          onPress={() => setOpen(false)}
          style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' }}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="rounded-t-3xl bg-card px-5 pt-3 dark:bg-card-dark"
            style={{ paddingBottom: insets.bottom + 20 }}>
            <View className="mb-4 h-1.5 w-10 self-center rounded-full bg-slate-200 dark:bg-slate-700" />
            <Text className="mb-1 text-lg font-bold text-slate-900 dark:text-white">Contact Support</Text>
            <Text className="mb-4 text-sm text-slate-500 dark:text-slate-400">Tap a contact to call.</Text>

            {!contacts && !loadError ? (
              <View className="items-center py-6">
                <ActivityIndicator size="small" color={isDark ? '#8bb4fd' : '#0049B7'} />
              </View>
            ) : loadError ? (
              <Text className="mb-2 text-center text-sm text-slate-500 dark:text-slate-400">{loadError}</Text>
            ) : contacts && contacts.length === 0 ? (
              <Text className="mb-2 text-center text-sm text-slate-500 dark:text-slate-400">
                No support contacts are set up yet.
              </Text>
            ) : (
              contacts?.map((contact) => (
                <Pressable
                  key={contact.key}
                  onPress={() => handleCall(contact)}
                  className="mb-2 flex-row items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 active:opacity-70 dark:bg-slate-900/40">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-50 dark:bg-slate-800">
                    <Ionicons name="call-outline" size={18} color={isDark ? '#8bb4fd' : '#0049B7'} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[15px] font-semibold text-slate-800 dark:text-white">{contact.label}</Text>
                    <Text className="text-xs text-slate-400 dark:text-slate-500">
                      {contact.name ? `${contact.name} · Tap to call` : 'Tap to call'}
                    </Text>
                  </View>
                </Pressable>
              ))
            )}

            <Pressable
              onPress={() => setOpen(false)}
              className="mt-2 items-center rounded-2xl border border-slate-200 py-3.5 dark:border-slate-700">
              <Text className="text-sm font-semibold text-slate-600 dark:text-slate-300">Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
