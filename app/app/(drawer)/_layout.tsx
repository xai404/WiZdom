import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Linking, Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { JourneyCelebrationModal } from '@/components/journey-celebration-modal';
import { useChat } from '@/context/chat-context';
import { useAppTheme } from '@/hooks/use-app-theme';
import { usePushNotifications } from '@/hooks/use-push-notifications';

const UNIVERSITY_COURSES_URL = 'https://studyx.cc';

// Folder is still named "(drawer)" (a route group, invisible in the URL) —
// renaming it would mean moving every screen file for a purely cosmetic
// win. The navigator itself is a bottom tab bar now, not a drawer: Home,
// Progress, Chats and Courses are the four primary destinations. Profile
// stays routable (the header avatar on Home/Progress opens it) but isn't a
// tab of its own — it would otherwise duplicate that same header shortcut.
export default function TabsLayout() {
  usePushNotifications();
  const { unreadCount } = useChat();
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

  const activeColor = isDark ? '#8bb4fd' : '#0049B7';
  const inactiveColor = isDark ? '#64748b' : '#94a3b8';
  const barBottomPadding = Math.max(insets.bottom, 10);

  // On native, React Navigation's bottom-tabs constrains the tabBarIcon
  // slot to a small icon-sized box internally no matter what you render
  // inside it — packing icon+label together there gets the label severely
  // clipped ("Home" → "HO…") regardless of any width/height set on our own
  // wrapper View, since an ANCESTOR is the one constraining it. The
  // library's built-in label system doesn't have this problem (it gives
  // the label its own row), so native uses that. Web is the one platform
  // where the built-in label wasn't reliably showing under the icon at
  // all, so web keeps the old combined custom render instead.
  const renderIconOnly =
    (iconName: keyof typeof Ionicons.glyphMap, iconNameFocused: keyof typeof Ionicons.glyphMap) =>
    ({ color, focused }: { color: string; focused: boolean }) => (
      <Ionicons name={focused ? iconNameFocused : iconName} size={22} color={color} />
    );

  const renderIconWithLabel =
    (iconName: keyof typeof Ionicons.glyphMap, iconNameFocused: keyof typeof Ionicons.glyphMap, label: string) =>
    ({ color, focused }: { color: string; focused: boolean }) => (
      <View style={{ height: 44, width: 64, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
        <Ionicons name={focused ? iconNameFocused : iconName} size={22} color={color} />
        <Text allowFontScaling={false} style={{ fontSize: 10.5, fontWeight: '600', color, lineHeight: 13 }} numberOfLines={1}>
          {label}
        </Text>
      </View>
    );

  // allowFontScaling={false} here specifically: if the phone's system text
  // size is set above the default (an accessibility setting), RN scales
  // every bit of text by that same factor by default, including nav
  // labels — since layout doesn't grow to match, "Home" can get clipped to
  // "HO…" identically on every tab. Rendering the label manually (instead
  // of via tabBarLabelStyle, which can only set a style, not this prop)
  // makes it immune to that setting so it's never at the mercy of it.
  const renderLabel =
    (label: string) =>
    ({ color, focused }: { color: string; focused: boolean }) => (
      <Text
        allowFontScaling={false}
        numberOfLines={1}
        style={{ fontSize: 10.5, fontWeight: focused ? '700' : '600', color, marginTop: 2 }}>
        {label}
      </Text>
    );

  const isWeb = Platform.OS === 'web';
  const renderTab = (
    iconName: keyof typeof Ionicons.glyphMap,
    iconNameFocused: keyof typeof Ionicons.glyphMap,
    label: string
  ) => (isWeb ? renderIconWithLabel(iconName, iconNameFocused, label) : renderIconOnly(iconName, iconNameFocused));

  return (
    <>
      {/* Mounted once here (rather than inside ProgressTimeline, which both
          Home and Progress render) so the one-time completion check can't
          race between two simultaneously-mounted instances. */}
      <JourneyCelebrationModal />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: !isWeb,
          tabBarLabelStyle: { fontSize: 10.5, fontWeight: '600' },
          tabBarActiveTintColor: activeColor,
          tabBarInactiveTintColor: inactiveColor,
          tabBarStyle: {
            backgroundColor: isDark ? '#0b1220' : '#ffffff',
            borderTopWidth: 0,
            height: 70 + barBottomPadding,
            paddingTop: 10,
            paddingBottom: barBottomPadding,
            shadowColor: '#0f172a',
            shadowOpacity: isDark ? 0 : 0.06,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: -4 },
            elevation: 12,
          },
          tabBarItemStyle: { paddingVertical: 4 },
        }}>
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Home',
            tabBarIcon: renderTab('home-outline', 'home', 'Home'),
            tabBarLabel: renderLabel('Home'),
          }}
        />
        <Tabs.Screen
          name="progress"
          options={{
            title: 'Progress',
            tabBarIcon: renderTab('trending-up-outline', 'trending-up', 'Progress'),
            tabBarLabel: renderLabel('Progress'),
          }}
        />
        <Tabs.Screen
          name="group-chat"
          options={{
            title: 'Chats',
            tabBarIcon: renderTab('chatbubble-ellipses-outline', 'chatbubble-ellipses', 'Chats'),
            tabBarLabel: renderLabel('Chats'),
            tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          }}
        />
        <Tabs.Screen
          name="courses"
          options={{
            title: 'Courses',
            tabBarIcon: renderTab('school-outline', 'school', 'Courses'),
            tabBarLabel: renderLabel('Courses'),
          }}
          listeners={{
            tabPress: (e) => {
              // This tab never actually navigates in-app — it's a shortcut to
              // the external university/course-guidance site, same URL as the
              // "Country & Course Guidance" journey stage's "Open Portal" link.
              e.preventDefault();
              Linking.openURL(UNIVERSITY_COURSES_URL);
            },
          }}
        />

        {/* Reachable via router.push, hidden from the tab bar itself. */}
        <Tabs.Screen name="profile" options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
        <Tabs.Screen name="documents" options={{ href: null }} />
        <Tabs.Screen name="support" options={{ href: null }} />
      </Tabs>
    </>
  );
}
