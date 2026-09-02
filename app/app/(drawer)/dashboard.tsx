import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { GreetingOverlay } from '@/components/greeting-overlay';
import { ProgressTimeline } from '@/components/progress-timeline';
import { TravelHeroBanner } from '@/components/travel-hero-banner';
import { todaysMessage } from '@/constants/motivational-messages';
import { useAuth } from '@/context/auth-context';

export default function DashboardScreen() {
  const { user } = useAuth();
  const { justLoggedIn } = useLocalSearchParams<{ justLoggedIn?: string }>();
  const [showGreeting, setShowGreeting] = useState(() => justLoggedIn === '1');

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-surface dark:bg-surface-dark">
      <AppHeader />
      <TravelHeroBanner quote={todaysMessage()} />
      <ProgressTimeline />
      <GreetingOverlay name={user?.name} visible={showGreeting} onDone={() => setShowGreeting(false)} />
    </SafeAreaView>
  );
}
