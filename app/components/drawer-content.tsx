import { Ionicons } from '@expo/vector-icons';
import { DrawerContentScrollView, type DrawerContentComponentProps } from '@react-navigation/drawer';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { useAuth } from '@/context/auth-context';
import { useAppTheme } from '@/hooks/use-app-theme';

type MenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
};

const MENU_ITEMS: MenuItem[] = [
  { icon: 'home-outline', label: 'Dashboard', route: '/dashboard' },
  { icon: 'chatbubble-ellipses-outline', label: 'My Messages', route: '/messages' },
  { icon: 'compass-outline', label: 'My Journey', route: '/my-journey' },
  { icon: 'document-text-outline', label: 'My Documents', route: '/documents' },
  { icon: 'notifications-outline', label: 'Notifications', route: '/notifications' },
  { icon: 'person-outline', label: 'My Profile', route: '/profile' },
  { icon: 'settings-outline', label: 'Settings', route: '/settings' },
];

function getInitials(name?: string) {
  if (!name) return 'S';
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '');
  return initials.join('') || 'S';
}

export function DrawerContent(props: DrawerContentComponentProps) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const navigateTo = (route: string) => {
    props.navigation.closeDrawer();
    router.push(route as never);
  };

  const handleLogout = () => {
    props.navigation.closeDrawer();
    logout();
    router.replace('/login');
  };

  return (
    <View className="flex-1 bg-surface dark:bg-surface-dark">
      <DrawerContentScrollView {...props} contentContainerStyle={{ flexGrow: 1 }}>
        <View className="border-b border-slate-100 px-6 pb-7 pt-5 dark:border-slate-800">
          <LinearGradient
            colors={['#3B82F6', '#0049B7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#0049B7',
              shadowOpacity: 0.35,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 6 },
              elevation: 6,
            }}>
            <Text className="text-2xl font-bold text-white">{getInitials(user?.name)}</Text>
          </LinearGradient>
          <Text className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
            {user?.name ?? 'Student'}
          </Text>
          <Text className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {user?.email ?? 'student@wizdom.app'}
          </Text>
        </View>

        <View className="flex-1 px-3 pt-3">
          {MENU_ITEMS.map((item) => (
            <PressableScale key={item.route} onPress={() => navigateTo(item.route)} scaleTo={0.98}>
              <View className="mb-1 flex-row items-center gap-4 rounded-2xl px-3 py-3.5">
                <Ionicons name={item.icon} size={21} color={isDark ? '#8bb4fd' : '#0049B7'} />
                <Text className="text-[15px] font-medium text-slate-700 dark:text-slate-200">
                  {item.label}
                </Text>
              </View>
            </PressableScale>
          ))}
        </View>
      </DrawerContentScrollView>

      <View
        className="border-t border-slate-100 px-3 pt-3 dark:border-slate-800"
        style={{ paddingBottom: insets.bottom + 12 }}>
        <View className="mb-1 flex-row items-center justify-between rounded-2xl px-3 py-3">
          <View className="flex-row items-center gap-4">
            <Ionicons name="moon-outline" size={21} color="#0049B7" />
            <Text className="text-[15px] font-medium text-slate-700 dark:text-slate-200">Dark Mode</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: '#e2e8f0', true: '#0049B7' }}
            thumbColor="#ffffff"
          />
        </View>

        <Pressable
          onPress={handleLogout}
          className="flex-row items-center gap-4 rounded-2xl px-3 py-3.5 active:bg-red-50 dark:active:bg-red-950">
          <Ionicons name="log-out-outline" size={21} color="#ef4444" />
          <Text className="text-[15px] font-semibold text-red-500">Logout</Text>
        </Pressable>
      </View>
    </View>
  );
}
