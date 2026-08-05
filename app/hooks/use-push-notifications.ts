import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/context/auth-context';
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
 * the backend — then refreshes the in-app feed whenever a push arrives
 * while the app is foregrounded. Best-effort throughout: this must never
 * block or break the app for a student on a simulator, on Expo Go (remote
 * push isn't supported there on Android since SDK 53+), or who denies the
 * permission prompt.
 */
export function usePushNotifications() {
  const { token } = useAuth();
  const { reload } = useNotifications();
  const registeredForToken = useRef<string | null>(null);

  useEffect(() => {
    if (!token || registeredForToken.current === token) return;

    (async () => {
      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') return;

        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const pushToken = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);

        registeredForToken.current = token;
        await registerPushToken(token, pushToken.data);
      } catch {
        // Push isn't available in this environment (e.g. Expo Go on
        // Android, or a simulator without notification capabilities) —
        // the in-app notification feed still works via polling.
      }
    })();
  }, [token]);

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(() => {
      reload();
    });
    return () => subscription.remove();
  }, [reload]);
}
