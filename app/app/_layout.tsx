import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '../global.css';
import { AuthProvider } from '@/context/auth-context';
import { ChatProvider } from '@/context/chat-context';
import { JourneyProvider } from '@/context/journey-context';
import { NotificationsProvider } from '@/context/notifications-context';
import { useAppTheme, useHydrateAppTheme } from '@/hooks/use-app-theme';

function RootNavigation() {
  useHydrateAppTheme();
  const { isDark } = useAppTheme();

  return (
    <>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(drawer)" />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <JourneyProvider>
            <ChatProvider>
              <NotificationsProvider>
                <RootNavigation />
              </NotificationsProvider>
            </ChatProvider>
          </JourneyProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
