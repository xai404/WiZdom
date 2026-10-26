import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

type EmptyStateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
};

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  const { isDark } = useAppTheme();

  return (
    <View className="items-center justify-center px-8 py-16">
      <View
        className="mb-5 h-[84px] w-[84px] items-center justify-center rounded-[28px]"
        style={{
          backgroundColor: isDark ? 'rgba(134,201,155,0.12)' : '#eef4fd',
          borderWidth: 1,
          borderColor: isDark ? 'rgba(134,201,155,0.18)' : '#dbe7fb',
        }}>
        <Ionicons name={icon} size={34} color={isDark ? '#93c5fd' : '#1d4ed8'} />
      </View>
      <Text className="text-lg font-bold text-slate-900 dark:text-white">{title}</Text>
      <Text className="mt-2 text-center text-sm leading-relaxed text-slate-500 dark:text-slate-400">
        {description}
      </Text>
    </View>
  );
}
