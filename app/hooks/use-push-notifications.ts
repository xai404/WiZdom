import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/context/auth-context';
import { useChat } from '@/context/chat-context';
import { useNotifications } from '@/context/notifications-context';
import { registerPushToken } from '@/lib/notifications-api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Requests permission, obtains an Expo push token, and registers it with
 * the backend.
 *
 * In Expo Go, remote push notifications are not supported on Android,
 * so registration is skipped automatically. Notifications continue to
 * work normally in Development Builds and Production builds.
 */
export function usePushNotifications() {
  const { token } = useAuth();
  const { reload } = useNotifications();
  const { reload: reloadChat } = useChat();
  const registeredForToken = useRef<string | null>(null);

  useEffect(() => {
    if (!token || registeredForToken.current === token) return;

    (async () => {
      // Skip push registration in Expo Go
      if (
        Constants.executionEnvironment ===
        ExecutionEnvironment.StoreClient
      ) {
        console.log(
          'Expo Go detected. Skipping push notification registration.'
        );
        return;
      }

      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }

        const { status: existingStatus } =
          await Notifications.getPermissionsAsync();

        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } =
            await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          return;
        }

        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId;

        const pushToken = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined
        );

        registeredForToken.current = token;

        await registerPushToken(token, pushToken.data);

        console.log('Push token registered successfully.');
      } catch (error) {
        console.log(
          'Push notifications unavailable in this environment:',
          error
        );
      }
    })();
  }, [token]);

  useEffect(() => {
    const subscription =
      Notifications.addNotificationReceivedListener(() => {
        reload();
        reloadChat();
      });

    return () => subscription.remove();
  }, [reload, reloadChat]);
}