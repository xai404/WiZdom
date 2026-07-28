import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopBar } from '@/components/top-bar';
import { useAuth } from '@/context/auth-context';

function getInitials(name?: string) {
  if (!name) return 'S';
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'S';
}

export default function ProfileScreen() {
  const { user } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark">
      <TopBar title="My Profile" />
      <View className="flex-1 items-center px-8 pt-8">
        <View className="h-24 w-24 items-center justify-center rounded-full bg-brand-600">
          <Text className="text-3xl font-bold text-white">{getInitials(user?.name)}</Text>
        </View>
        <Text className="mt-5 text-xl font-bold text-slate-900 dark:text-white">
          {user?.name ?? 'Student'}
        </Text>
        <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {user?.email ?? 'student@wizdom.app'}
        </Text>

        <View className="mt-10 w-full max-w-sm rounded-3xl bg-card p-6 dark:bg-card-dark">
          <Text className="text-sm text-slate-500 dark:text-slate-400">
            Full profile editing — course, intake, and documents — is coming soon.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
