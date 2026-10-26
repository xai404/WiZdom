import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

// Shared building blocks for the SIF, LOR and SOP tabs.

export const SIF_PRIMARY = '#1d4ed8';

export function Field({
  label,
  hint,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
}: {
  label: string;
  hint?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}) {
  const { isDark } = useAppTheme();
  return (
    <View className="mb-3.5">
      <Text className="mb-1 text-[13px] font-semibold text-slate-700 dark:text-slate-200">{label}</Text>
      {hint ? <Text className="mb-1.5 text-[11.5px] leading-4 text-slate-400 dark:text-slate-500">{hint}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
        multiline={multiline}
        keyboardType={keyboardType}
        className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[14px] text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        style={multiline ? { minHeight: 88, textAlignVertical: 'top' } : undefined}
      />
    </View>
  );
}

// Blue info banner at the top of each tab.
export function IntroNote({ children }: { children: string }) {
  const { isDark } = useAppTheme();
  return (
    <View className="mb-4 flex-row gap-2.5 rounded-2xl bg-brand-50 px-3.5 py-3 dark:bg-brand-950/50">
      <Ionicons name="information-circle-outline" size={16} color={isDark ? '#93c5fd' : SIF_PRIMARY} />
      <Text className="flex-1 text-[12px] leading-4 text-brand-700 dark:text-brand-200">{children}</Text>
    </View>
  );
}

// Dashed "+ Add another …" button under repeatable blocks.
export function AddRowButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { isDark } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-center gap-1.5 rounded-xl border border-dashed border-brand-300 py-2.5 active:bg-brand-50 dark:border-slate-700 dark:active:bg-slate-800">
      <Ionicons name="add" size={16} color={isDark ? '#93c5fd' : SIF_PRIMARY} />
      <Text className="text-[13px] font-semibold text-brand-600 dark:text-brand-300">{label}</Text>
    </Pressable>
  );
}

// Bordered block for one repeatable row (recommender, experience) with a
// title and a Remove link.
export function RowCard({
  title,
  onRemove,
  children,
}: {
  title: string;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  const { isDark } = useAppTheme();
  return (
    <View className="mb-2.5 rounded-xl border border-slate-200 p-3.5 dark:border-slate-700">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-[12px] font-bold uppercase tracking-wide text-brand-600 dark:text-brand-300">{title}</Text>
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          className="flex-row items-center gap-1 rounded-lg px-2 py-1 active:bg-red-50 dark:active:bg-red-950">
          <Ionicons name="trash-outline" size={13} color={isDark ? '#64748b' : '#94a3b8'} />
          <Text className="text-[12px] text-slate-400 dark:text-slate-500">Remove</Text>
        </Pressable>
      </View>
      {children}
    </View>
  );
}

// Big Yes / No question card (e.g. "Do you need assistance with your LOR?").
export function YesNoQuestion({
  question,
  hint,
  value,
  onChange,
}: {
  question: string;
  hint?: string;
  value: '' | 'yes' | 'no';
  onChange: (v: 'yes' | 'no') => void;
}) {
  return (
    <View className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-card-dark">
      <Text className="text-[14.5px] font-bold text-slate-900 dark:text-white">{question}</Text>
      {hint ? <Text className="mt-1 text-[12px] leading-4 text-slate-400 dark:text-slate-500">{hint}</Text> : null}
      <View className="mt-3 flex-row gap-2.5">
        {(['yes', 'no'] as const).map((opt) => {
          const selected = value === opt;
          return (
            <Pressable
              key={opt}
              onPress={() => onChange(opt)}
              className={`flex-1 items-center rounded-xl border py-2.5 active:opacity-80 ${
                selected
                  ? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-950'
                  : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
              }`}>
              <Text
                className={`text-[14px] ${
                  selected ? 'font-bold text-brand-700 dark:text-brand-200' : 'font-semibold text-slate-600 dark:text-slate-300'
                }`}>
                {opt === 'yes' ? 'Yes' : 'No'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Text className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-[12.5px] text-red-600 dark:bg-red-950 dark:text-red-300">
      {message}
    </Text>
  );
}

export function LoadErrorBanner({ show, onRetry }: { show: boolean; onRetry: () => void }) {
  if (!show) return null;
  return (
    <Pressable
      onPress={onRetry}
      className="mb-3 flex-row items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 active:opacity-80 dark:bg-amber-950">
      <Ionicons name="cloud-offline-outline" size={15} color="#d97706" />
      <Text className="flex-1 text-[12px] text-amber-700 dark:text-amber-300">
        Couldn&apos;t load your saved answers. You can still fill this in — tap to retry.
      </Text>
    </Pressable>
  );
}

export function SaveBar({
  dirty,
  saving,
  savedNote,
  onSave,
}: {
  dirty: boolean;
  saving: boolean;
  savedNote: string | null;
  onSave: () => void;
}) {
  return (
    <View className="border-t border-slate-100 bg-surface px-5 py-3 dark:border-slate-800 dark:bg-surface-dark">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-[12px] text-slate-400 dark:text-slate-500">
          {dirty ? 'Unsaved changes' : (savedNote ?? 'Not filled in yet')}
        </Text>
        <Pressable
          onPress={onSave}
          disabled={!dirty || saving}
          className="flex-row items-center gap-1.5 rounded-xl px-5 py-2.5 active:opacity-90"
          style={{ backgroundColor: SIF_PRIMARY, opacity: !dirty || saving ? 0.5 : 1 }}>
          {saving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Ionicons name="save-outline" size={15} color="#ffffff" />
          )}
          <Text className="text-[14px] font-semibold text-white">Save</Text>
        </Pressable>
      </View>
    </View>
  );
}

export const savedTimeNote = () =>
  `Saved ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
