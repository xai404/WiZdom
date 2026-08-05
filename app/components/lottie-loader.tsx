import LottieView from 'lottie-react-native';
import { Text, View } from 'react-native';

import spinnerAnimation from '@/assets/lottie/loading-spinner.json';
import { useAppTheme } from '@/hooks/use-app-theme';

// Shared loading indicator for initial-load states (chat, journey,
// notifications) — a small Lottie spinner instead of a spinning
// ActivityIndicator, in the same spot the skeleton placeholders used to be.
export function LottieLoader({ label }: { label?: string }) {
  const { isDark } = useAppTheme();

  return (
    <View className="flex-1 items-center justify-center py-16">
      <LottieView source={spinnerAnimation} autoPlay loop style={{ width: 64, height: 64 }} />
      {label ? (
        <Text className="mt-2 text-sm text-slate-400 dark:text-slate-500">{label}</Text>
      ) : null}
    </View>
  );
}
