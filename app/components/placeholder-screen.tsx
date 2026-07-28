import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopBar } from '@/components/top-bar';
import { useAppTheme } from '@/hooks/use-app-theme';

type PlaceholderScreenProps = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
};

export function PlaceholderScreen({ title, icon, description }: PlaceholderScreenProps) {
  const { isDark } = useAppTheme();

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark">
      <TopBar title={title} />
      <View className="flex-1 items-center justify-center px-10">
        <View className="mb-5 h-20 w-20 items-center justify-center rounded-3xl bg-brand-50 dark:bg-card-dark">
          <Ionicons name={icon} size={32} color={isDark ? '#8bb4fd' : '#0049B7'} />
        </View>
        <Text className="text-xl font-bold text-slate-900 dark:text-white">{title}</Text>
        <Text className="mt-2 text-center text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {description}
        </Text>
      </View>
    </SafeAreaView>
  );
}
