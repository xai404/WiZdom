import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

const PRIMARY = '#0049B7';
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const parseISO = (v: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v ?? '');
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  if (mo < 0 || mo > 11 || d < 1 || d > 31) return null;
  return { y, m: mo, d };
};
const formatDisplay = (v: string) => {
  const p = parseISO(v);
  return p ? `${p.d} ${MONTHS[p.m]} ${p.y}` : '';
};

// A tap-to-open calendar date picker — pure JS, no native module, so it
// works identically in Expo Go and every build with no rebuild. Month and
// year are chosen directly: tap the "Month Year" title to jump to a year
// grid, then a month grid, then the day. Value is a plain 'YYYY-MM-DD'
// string, the same shape the admin panel's <input type="date"> produces.
export function DateField({
  label,
  hint,
  value,
  onChange,
  minYear,
  maxYear,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  minYear?: number;
  maxYear?: number;
}) {
  const { isDark } = useAppTheme();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'day' | 'month' | 'year'>('day');
  const selected = parseISO(value);
  const now = new Date();
  const [view, setView] = useState({
    y: selected?.y ?? now.getFullYear(),
    m: selected?.m ?? now.getMonth(),
  });

  const yearStart = minYear ?? 1940;
  const yearEnd = maxYear ?? now.getFullYear() + 15;
  const years = useMemo(() => {
    const out: number[] = [];
    for (let y = yearEnd; y >= yearStart; y -= 1) out.push(y);
    return out;
  }, [yearStart, yearEnd]);

  const grid = useMemo(() => {
    const firstDay = new Date(view.y, view.m, 1).getDay();
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i += 1) cells.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [view]);

  const openPicker = () => {
    setView({ y: selected?.y ?? now.getFullYear(), m: selected?.m ?? now.getMonth() });
    setMode('day');
    setOpen(true);
  };
  const shiftMonth = (delta: number) =>
    setView((v) => {
      const next = new Date(v.y, v.m + delta, 1);
      return { y: next.getFullYear(), m: next.getMonth() };
    });

  return (
    <View className="mb-3.5">
      <Text className="mb-1 text-[13px] font-semibold text-slate-700 dark:text-slate-200">{label}</Text>
      {hint ? <Text className="mb-1.5 text-[11.5px] leading-4 text-slate-400 dark:text-slate-500">{hint}</Text> : null}

      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={openPicker}
          className="flex-1 flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 active:opacity-80 dark:border-slate-700 dark:bg-slate-900">
          <Text
            className={`text-[14px] ${value ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>
            {formatDisplay(value) || 'Select date'}
          </Text>
          <Ionicons name="calendar-outline" size={16} color={isDark ? '#8bb4fd' : PRIMARY} />
        </Pressable>
        {value ? (
          <Pressable
            onPress={() => onChange('')}
            hitSlop={8}
            className="rounded-lg p-1.5 active:bg-slate-100 dark:active:bg-slate-800">
            <Ionicons name="close-circle" size={18} color={isDark ? '#64748b' : '#94a3b8'} />
          </Pressable>
        ) : null}
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} className="flex-1 items-center justify-center bg-black/40 px-8">
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-[340px] rounded-2xl bg-white p-4 dark:bg-card-dark">
            {/* Header */}
            <View className="mb-3 flex-row items-center justify-between">
              <Pressable
                onPress={() => setMode(mode === 'day' ? 'year' : 'day')}
                className="flex-row items-center gap-1 rounded-lg px-1 py-1 active:bg-slate-100 dark:active:bg-slate-800">
                <Text className="text-[14px] font-bold text-slate-900 dark:text-white">
                  {MONTHS[view.m]} {view.y}
                </Text>
                <Ionicons
                  name={mode === 'day' ? 'chevron-down' : 'chevron-up'}
                  size={15}
                  color={isDark ? '#94a3b8' : '#64748b'}
                />
              </Pressable>
              {mode === 'day' ? (
                <View className="flex-row">
                  <Pressable onPress={() => shiftMonth(-1)} hitSlop={8} className="rounded-lg p-1.5 active:bg-slate-100 dark:active:bg-slate-800">
                    <Ionicons name="chevron-back" size={18} color={isDark ? '#cbd5e1' : '#475569'} />
                  </Pressable>
                  <Pressable onPress={() => shiftMonth(1)} hitSlop={8} className="rounded-lg p-1.5 active:bg-slate-100 dark:active:bg-slate-800">
                    <Ionicons name="chevron-forward" size={18} color={isDark ? '#cbd5e1' : '#475569'} />
                  </Pressable>
                </View>
              ) : null}
            </View>

            {/* Year grid */}
            {mode === 'year' ? (
              <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
                <View className="flex-row flex-wrap">
                  {years.map((y) => {
                    const isSel = y === view.y;
                    return (
                      <Pressable
                        key={y}
                        onPress={() => {
                          setView((v) => ({ ...v, y }));
                          setMode('month');
                        }}
                        className="items-center justify-center py-2.5"
                        style={{ width: '25%' }}>
                        <Text
                          className={`text-[13px] ${
                            isSel ? 'font-bold text-brand-600 dark:text-brand-300' : 'text-slate-700 dark:text-slate-200'
                          }`}>
                          {y}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            ) : null}

            {/* Month grid */}
            {mode === 'month' ? (
              <View className="flex-row flex-wrap">
                {MONTHS_SHORT.map((mo, i) => {
                  const isSel = i === view.m;
                  return (
                    <Pressable
                      key={mo}
                      onPress={() => {
                        setView((v) => ({ ...v, m: i }));
                        setMode('day');
                      }}
                      className="items-center justify-center py-3"
                      style={{ width: '33.333%' }}>
                      <Text
                        className={`text-[13px] ${
                          isSel ? 'font-bold text-brand-600 dark:text-brand-300' : 'text-slate-700 dark:text-slate-200'
                        }`}>
                        {mo}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {/* Day grid */}
            {mode === 'day' ? (
              <>
                <View className="mb-1 flex-row">
                  {WEEKDAYS.map((w, i) => (
                    <Text key={i} className="flex-1 text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                      {w}
                    </Text>
                  ))}
                </View>
                <View className="flex-row flex-wrap">
                  {grid.map((day, i) => {
                    const isSel =
                      day != null && selected?.y === view.y && selected?.m === view.m && selected?.d === day;
                    return (
                      <View key={i} className="items-center justify-center" style={{ width: `${100 / 7}%`, height: 40 }}>
                        {day != null ? (
                          <Pressable
                            onPress={() => {
                              onChange(toISO(view.y, view.m, day));
                              setOpen(false);
                            }}
                            className={`h-9 w-9 items-center justify-center rounded-full active:opacity-80 ${
                              isSel ? '' : 'active:bg-slate-100 dark:active:bg-slate-800'
                            }`}
                            style={isSel ? { backgroundColor: PRIMARY } : undefined}>
                            <Text
                              className={`text-[13px] ${
                                isSel ? 'font-bold text-white' : 'text-slate-700 dark:text-slate-200'
                              }`}>
                              {day}
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              </>
            ) : null}

            <View className="mt-2 flex-row items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
              <Pressable
                onPress={() => {
                  onChange('');
                  setOpen(false);
                }}
                className="rounded-lg px-3 py-1.5 active:bg-slate-100 dark:active:bg-slate-800">
                <Text className="text-[12.5px] font-medium text-slate-500 dark:text-slate-400">Clear</Text>
              </Pressable>
              <Pressable
                onPress={() => setOpen(false)}
                className="rounded-lg px-3 py-1.5 active:bg-slate-100 dark:active:bg-slate-800">
                <Text className="text-[12.5px] font-semibold text-brand-600 dark:text-brand-300">Close</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
