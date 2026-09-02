import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';

import { useAuth } from '@/context/auth-context';
import { useJourney } from '@/context/journey-context';
import { useAppTheme } from '@/hooks/use-app-theme';

const PRIMARY = '#0049B7';
const GOLD = '#f59e0b';
const TOTAL_FEE_STARS = 4;

// Fees fully paid -> all 4 stars filled; half payment -> 2 of 4; anything
// else (free/unset) -> 0 filled, i.e. 4 blank stars by default.
function filledFeeStars(paymentStatus?: string | null): number {
  if (paymentStatus === 'Paid in Full') return 4;
  if (paymentStatus === 'Half Payment') return 2;
  return 0;
}

function FeeStars({ paymentStatus, isDark }: { paymentStatus?: string | null; isDark: boolean }) {
  const filled = filledFeeStars(paymentStatus);
  return (
    <View className="mt-1 flex-row gap-0.5">
      {Array.from({ length: TOTAL_FEE_STARS }, (_, i) => (
        <Ionicons
          key={i}
          name={i < filled ? 'star' : 'star-outline'}
          size={12}
          color={i < filled ? GOLD : isDark ? '#475569' : '#cbd5e1'}
        />
      ))}
    </View>
  );
}

// Goal-gradient framing — the closer a student is to finishing, the more
// specifically the copy calls that out, since motivation to finish a task
// rises as the perceived remaining distance shrinks. Deliberately not
// generic filler at every step.
function motivationalLine(fraction: number, remaining: number): string {
  if (fraction >= 1) return "You're all done! 🎉";
  if (fraction === 0) return 'Every journey starts with one step — let’s begin! 🚀';
  if (remaining === 1) return 'Just 1 step left — the finish line is right there!';
  if (fraction >= 0.75) return `So close! Only ${remaining} steps stand between you and done.`;
  if (fraction >= 0.5) return "You're over halfway there — keep this momentum going!";
  if (fraction >= 0.25) return 'Great start — every step you finish makes the next one faster.';
  return "You're building momentum — let's keep it moving!";
}

// Shared by the Progress screen and the Dashboard so both show the exact
// same overall-progress summary — trophy, animated bar, and the "X of Y
// stages completed • Only N left" line. Self-contained (reads useJourney()
// itself) so either screen can just drop it in with no prop wiring.
export function JourneyHeroCard() {
  const { journey } = useJourney();
  const { user } = useAuth();
  const { isDark } = useAppTheme();
  const barWidth = useRef(new Animated.Value(0)).current;

  const completed = journey?.filter((s) => s.status === 'completed').length ?? 0;
  const total = journey?.length ?? 0;
  const remaining = total - completed;
  const fraction = total > 0 ? completed / total : 0;

  useEffect(() => {
    Animated.timing(barWidth, { toValue: fraction, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [fraction, barWidth]);

  const widthPct = barWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  if (!journey || journey.length === 0) return null;

  return (
    <View
      className="mb-4 rounded-3xl px-5 py-5 dark:bg-card-dark"
      style={{
        backgroundColor: isDark ? undefined : '#ffffff',
        shadowColor: '#0B2A66',
        shadowOpacity: isDark ? 0 : 0.1,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 10 },
        elevation: isDark ? 0 : 3,
      }}>
      <View className="flex-row items-start justify-between">
        <View>
          <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Overall Progress
          </Text>
          <FeeStars paymentStatus={user?.paymentStatus} isDark={isDark} />
          <View className="mt-1 flex-row items-baseline gap-1.5">
            <Text className="text-3xl font-extrabold" style={{ color: isDark ? '#8bb4fd' : PRIMARY }}>
              {Math.round(fraction * 100)}%
            </Text>
            <Text className="text-sm font-semibold text-slate-400 dark:text-slate-500">Completed</Text>
          </View>
        </View>

        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : '#fff7e6',
          }}>
          <Ionicons name="trophy" size={24} color={GOLD} />
        </View>
      </View>

      <View className="mt-4" style={{ height: 10, borderRadius: 999, backgroundColor: isDark ? '#1c2740' : '#eef2f7', overflow: 'hidden' }}>
        <Animated.View style={{ height: '100%', width: widthPct, borderRadius: 999, overflow: 'hidden' }}>
          <LinearGradient
            colors={isDark ? ['#5f97fa', '#8bb4fd'] : ['#0049B7', '#3B82F6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      </View>

      <Text className="mt-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">
        {completed} of {total} stages completed{remaining > 0 ? ` • Only ${remaining} step${remaining === 1 ? '' : 's'} left` : ''}
      </Text>
      <Text className="mt-1.5 text-[13px] font-bold" style={{ color: isDark ? '#8bb4fd' : PRIMARY }}>
        {motivationalLine(fraction, remaining)}
      </Text>
    </View>
  );
}
