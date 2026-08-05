import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { ProgressTimeline } from '@/components/progress-timeline';
import { TravelHeroBanner } from '@/components/travel-hero-banner';
import { todaysMessage } from '@/constants/motivational-messages';

export default function DashboardScreen() {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-surface dark:bg-surface-dark">
      <AppHeader />
      <TravelHeroBanner quote={todaysMessage()} />
      <ProgressTimeline />
    </SafeAreaView>
  );
}
