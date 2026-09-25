import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, TextInput, View } from 'react-native';

import { CallButton } from '@/components/call-button';
import { useAuth } from '@/context/auth-context';
import { useAppTheme } from '@/hooks/use-app-theme';

const PRIMARY = '#0049B7';
const ACCENT = '#3B82F6';

function getInitials(name?: string) {
  if (!name) return 'S';
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'S'
  );
}

type ChatHeaderProps = {
  searchOpen: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onToggleSearch: () => void;
};

export function ChatHeader({ searchOpen, searchQuery, onSearchChange, onToggleSearch }: ChatHeaderProps) {
  const { user } = useAuth();
  const { isDark } = useAppTheme();

  // Group/team name when the student belongs to a cohort, otherwise their
  // own name. Uses the existing groupName field — no fake default names.
  const chatTitle = user?.groupName?.trim() || user?.name?.trim() || 'Student';

  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [fade]);

  const canGoBack = router.canGoBack();

  return (
    <Animated.View style={{ opacity: fade }}>
      <LinearGradient
        colors={isDark ? ['#00132e', '#0B1E45', PRIMARY] : ['#00132e', PRIMARY, ACCENT]}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: 14,
          paddingBottom: 16,
          paddingHorizontal: 14,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          shadowColor: '#0049B7',
          shadowOpacity: 0.3,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        }}>
        <View className="flex-row items-center gap-2">
          {canGoBack ? (
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              className="h-9 w-9 items-center justify-center rounded-full active:bg-white/10">
              <Ionicons name="chevron-back" size={22} color="#ffffff" />
            </Pressable>
          ) : null}

          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.18)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.3)',
            }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#ffffff' }}>{getInitials(chatTitle)}</Text>
          </View>

          <View style={{ flex: 1, marginLeft: 4 }}>
            {searchOpen ? (
              <TextInput
                autoFocus
                value={searchQuery}
                onChangeText={onSearchChange}
                placeholder="Search this discussion..."
                placeholderTextColor="rgba(255,255,255,0.55)"
                style={{ fontSize: 15, color: '#ffffff', paddingVertical: 2 }}
              />
            ) : (
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#ffffff' }} numberOfLines={1}>
                {chatTitle}
              </Text>
            )}
          </View>

          {searchOpen ? (
            <Pressable
              onPress={onToggleSearch}
              hitSlop={10}
              className="h-9 w-9 items-center justify-center rounded-full active:bg-white/10">
              <Ionicons name="close" size={20} color="#ffffff" />
            </Pressable>
          ) : (
            <>
              <CallButton color="#ffffff" size={36} />
              <Pressable
                onPress={onToggleSearch}
                hitSlop={10}
                className="h-9 w-9 items-center justify-center rounded-full active:bg-white/10">
                <Ionicons name="search-outline" size={20} color="#ffffff" />
              </Pressable>
            </>
          )}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}
