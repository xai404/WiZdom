import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatBackground } from '@/components/chat-background';
import { ChatHeader } from '@/components/chat-header';
import { EmptyState } from '@/components/empty-state';
import { LottieLoader } from '@/components/lottie-loader';
import { getStageMetaBySlug, getStageMetaByTitle } from '@/constants/journey-meta';
import { useChat } from '@/context/chat-context';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { ChatMessage } from '@/lib/chat-api';
import { formatDateSeparator, formatMessageTime } from '@/lib/format-date';

const PRIMARY = '#0049B7';
const ACCENT = '#3B82F6';

type ListItem =
  | { type: 'separator'; id: string; label: string }
  | { type: 'message'; id: string; message: ChatMessage };

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

// Student replies are always labeled "You". Admin/employee messages show
// the staff member's name with their department in brackets, e.g.
// "fiona (Editing)" — both fields are already present in the API response
// (see lib/chat-api.ts), this is purely a display change, not a new data
// need.
function getSenderDisplay(message: ChatMessage): string {
  if (message.sender === 'student') return 'You';
  const name = message.senderName;
  const department = message.senderRole;
  if (name && department) return `${name} (${department})`;
  return name || department || 'Admin';
}

export default function GroupChatScreen() {
  const params = useLocalSearchParams<{ stage?: string }>();
  const { isDark } = useAppTheme();
  const { messages, loading, error, reload, sendReply, markRead } = useChat();

  const [draft, setDraft] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScrollToLatest, setShowScrollToLatest] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const listRef = useRef<FlatList<ListItem>>(null);
  const highlightOpacity = useRef(new Animated.Value(0)).current;
  const scrolledToStageRef = useRef<string | null>(null);

  // Mirrors the Admin Panel's ChatTab poll (POLL_MS = 6500) — push delivery
  // alone isn't reliable enough (Expo Go, OS battery optimizations, denied
  // permissions), so poll while this screen is actually open, same as admin
  // does while its chat tab is open.
  useFocusEffect(
    useCallback(() => {
      reload();
      markRead();
      const interval = setInterval(reload, 6500);
      return () => clearInterval(interval);
    }, [reload, markRead])
  );

  const items = useMemo<ListItem[]>(() => {
    const source = messages ?? [];
    const query = searchQuery.trim().toLowerCase();

    if (query) {
      return source
        .filter((message) => message.text.toLowerCase().includes(query))
        .map((message) => ({ type: 'message', id: message._id, message }));
    }

    const result: ListItem[] = [];
    let lastDay: string | null = null;
    for (const message of source) {
      const day = new Date(message.createdAt).toDateString();
      if (day !== lastDay) {
        result.push({ type: 'separator', id: `sep-${day}`, label: formatDateSeparator(message.createdAt) });
        lastDay = day;
      }
      result.push({ type: 'message', id: message._id, message });
    }
    return result;
  }, [messages, searchQuery]);

  // Resolved client-side against the already-loaded thread (mirrors the
  // Admin Panel) so a later delete of a quoted/pinned message is reflected
  // live without a second fetch.
  const messagesById = useMemo(() => new Map((messages ?? []).map((m) => [m._id, m])), [messages]);
  const pinnedMessages = useMemo(() => (messages ?? []).filter((m) => m.pinned && !m.deleted), [messages]);
  const latestPinned = pinnedMessages[pinnedMessages.length - 1] ?? null;

  const triggerHighlight = useCallback(
    (id: string) => {
      setHighlightedId(id);
      highlightOpacity.setValue(1);
      Animated.timing(highlightOpacity, {
        toValue: 0,
        duration: 1200,
        delay: 350,
        useNativeDriver: true,
      }).start(() => setHighlightedId(null));
    },
    [highlightOpacity]
  );

  // Shared by the action card, tapping a quoted reply, and the header's
  // pin shortcut — all three just need to land on a known message id and
  // flash it.
  const scrollToMessageId = useCallback(
    (id: string) => {
      const targetIndex = items.findIndex((item) => item.type === 'message' && item.message._id === id);
      if (targetIndex === -1) return;
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ index: targetIndex, animated: true, viewPosition: 0.35 });
        triggerHighlight(id);
      });
    },
    [items, triggerHighlight]
  );

  // Smart navigation: land on the latest message tagged with whatever stage
  // the student tapped on the Dashboard.
  useEffect(() => {
    const targetSlug = params.stage;
    if (!targetSlug || !messages || messages.length === 0) return;
    if (scrolledToStageRef.current === targetSlug) return;

    const meta = getStageMetaBySlug(targetSlug);
    if (!meta) return;

    let targetIndex = -1;
    for (let i = items.length - 1; i >= 0; i -= 1) {
      const item = items[i];
      if (item.type === 'message' && item.message.stage === meta.title) {
        targetIndex = i;
        break;
      }
    }
    if (targetIndex === -1) return;

    scrolledToStageRef.current = targetSlug;
    const targetItem = items[targetIndex] as Extract<ListItem, { type: 'message' }>;
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: targetIndex, animated: true, viewPosition: 0.35 });
      triggerHighlight(targetItem.message._id);
    });
  }, [params.stage, messages, items, triggerHighlight]);

  const handleSend = () => {
    if (!draft.trim()) return;
    sendReply(draft, replyingTo?.stage ?? null, replyingTo?._id ?? null);
    setDraft('');
    setReplyingTo(null);
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  };

  const handleScroll = (event: { nativeEvent: { contentOffset: { y: number }; contentSize: { height: number }; layoutMeasurement: { height: number } } }) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    setShowScrollToLatest(distanceFromBottom > 260);
  };

  const isInitialLoading = loading && !messages;
  const pendingStageScroll = !!params.stage && scrolledToStageRef.current !== params.stage;

  return (
    <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
      <ChatBackground />

      <ChatHeader
        searchOpen={searchOpen}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onToggleSearch={() => {
          if (searchOpen) setSearchQuery('');
          setSearchOpen((v) => !v);
        }}
      />

      {latestPinned && !searchOpen ? (
        <PinnedMessageBar
          message={latestPinned}
          count={pinnedMessages.length}
          isDark={isDark}
          onPress={() => scrollToMessageId(latestPinned._id)}
        />
      ) : null}

      <KeyboardAvoidingView
        // Android had no `behavior` at all here (`undefined`), so opening
        // the keyboard didn't resize/push this screen's own content —
        // the composer just sat underneath it. 'height' shrinks this
        // view's own box to fit above the keyboard, mirroring what
        // 'padding' does on iOS.
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={{ flex: 1 }}>
        <View style={{ flex: 1, position: 'relative' }}>
          {isInitialLoading ? (
            <LottieLoader label="Loading your discussion…" />
          ) : error ? (
            <View className="flex-1 items-center justify-center px-10">
              <Ionicons name="cloud-offline-outline" size={32} color="#94a3b8" />
              <Text className="mt-3 text-center text-sm text-slate-500 dark:text-slate-400">{error}</Text>
              <Pressable onPress={reload} className="mt-5 rounded-full bg-brand-600 px-5 py-2.5 active:bg-brand-700">
                <Text className="text-sm font-semibold text-white">Try Again</Text>
              </Pressable>
            </View>
          ) : items.length === 0 ? (
            <EmptyState
              icon="chatbubble-ellipses-outline"
              title={searchQuery ? 'No matches' : 'Welcome to your Journey Discussion'}
              description={
                searchQuery
                  ? 'No messages match your search.'
                  : "Say hello to the WiZdom team — this is your dedicated space for your study abroad journey."
              }
            />
          ) : (
            <FlatList
              ref={listRef}
              data={items}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16, paddingBottom: 12 }}
              onScroll={handleScroll}
              scrollEventThrottle={32}
              onScrollToIndexFailed={(info) => {
                setTimeout(() => {
                  listRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.35 });
                }, 250);
              }}
              onContentSizeChange={() => {
                if (!pendingStageScroll && !showScrollToLatest) {
                  listRef.current?.scrollToEnd({ animated: false });
                }
              }}
              renderItem={({ item, index }) => {
                if (item.type === 'separator') {
                  return <DateSeparator label={item.label} isDark={isDark} />;
                }

                return (
                  <MessageRow
                    message={item.message}
                    index={index}
                    isDark={isDark}
                    isHighlighted={highlightedId === item.message._id}
                    highlightOpacity={highlightOpacity}
                    quoted={item.message.replyTo ? (messagesById.get(item.message.replyTo) ?? null) : null}
                    onReply={() => setReplyingTo(item.message)}
                    onJumpToQuoted={scrollToMessageId}
                  />
                );
              }}
            />
          )}

          {showScrollToLatest ? (
            <Pressable
              onPress={() => listRef.current?.scrollToEnd({ animated: true })}
              style={{
                position: 'absolute',
                right: 16,
                bottom: 16,
                shadowColor: '#0049B7',
                shadowOpacity: 0.3,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 6 },
                elevation: 6,
              }}
              className="h-11 w-11 items-center justify-center rounded-full bg-brand-600">
              <Ionicons name="arrow-down" size={20} color="#ffffff" />
            </Pressable>
          ) : null}
        </View>

        {replyingTo ? (
          <View
            className="mx-3 mb-1 flex-row items-center gap-2 rounded-2xl px-3.5 py-2.5"
            style={{
              backgroundColor: isDark ? 'rgba(15,23,42,0.85)' : '#ffffff',
              shadowColor: '#0f172a',
              shadowOpacity: isDark ? 0 : 0.06,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: isDark ? 0 : 2,
            }}>
            <View className="h-8 w-1 rounded-full bg-brand-600" />
            <View className="flex-1">
              <Text className="text-xs font-semibold text-brand-600 dark:text-brand-300" numberOfLines={1}>
                Replying to {getSenderDisplay(replyingTo)}
                {replyingTo.stage ? ` · ${replyingTo.stage}` : ''}
              </Text>
              <Text numberOfLines={1} className="text-xs text-slate-500 dark:text-slate-400">
                {replyingTo.text}
              </Text>
            </View>
            <Pressable onPress={() => setReplyingTo(null)} hitSlop={8}>
              <Ionicons name="close" size={16} color={isDark ? '#94a3b8' : '#64748b'} />
            </Pressable>
          </View>
        ) : null}

        {/* Premium floating composer. */}
        <View style={{ paddingHorizontal: 12, paddingBottom: 32, paddingTop: 4 }}>
          <View
            className="flex-row items-end gap-2 rounded-[28px] px-3.5 py-2"
            style={{
              backgroundColor: isDark ? '#111c33' : '#ffffff',
              shadowColor: '#0f172a',
              shadowOpacity: isDark ? 0.3 : 0.1,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 8 },
              elevation: 6,
            }}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Reply to WiZdom Team..."
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
              multiline
              className="max-h-28 flex-1 py-2 text-[15px]"
              // Typed-text color set explicitly here rather than via a
              // `dark:` className — on this input the className-based color
              // wasn't reliably applying (text effectively invisible), same
              // reason placeholderTextColor above is already explicit.
              style={{ textAlignVertical: 'center', color: isDark ? '#ffffff' : '#0f172a' }}
            />

            <Pressable onPress={handleSend} disabled={!draft.trim()}>
              <LinearGradient
                colors={draft.trim() ? [ACCENT, PRIMARY] : isDark ? ['#1e293b', '#1e293b'] : ['#e2e8f0', '#e2e8f0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Ionicons name="send" size={19} color={draft.trim() ? '#ffffff' : isDark ? '#64748b' : '#94a3b8'} />
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function DateSeparator({ label, isDark }: { label: string; isDark: boolean }) {
  const lineColor = isDark ? '#1e293b' : '#dbe4f3';
  return (
    <View className="my-4 flex-row items-center gap-3">
      <View style={{ flex: 1, height: 1, backgroundColor: lineColor }} />
      <Text
        className="rounded-full px-3.5 py-1 text-[11px] font-semibold"
        style={{
          backgroundColor: isDark ? '#111c33' : '#ffffff',
          color: isDark ? '#94a3b8' : '#64748b',
          shadowColor: '#0f172a',
          shadowOpacity: isDark ? 0 : 0.05,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 1 },
        }}>
        {label}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: lineColor }} />
    </View>
  );
}

// WhatsApp-style pinned message strip — same pinned message / pin toggle
// data and logic as before (staff-only, read-only here), just a direct,
// compact "here's the pinned message" bar instead of framing it as an
// "action item".
function PinnedMessageBar({
  message,
  count,
  isDark,
  onPress,
}: {
  message: ChatMessage;
  count: number;
  isDark: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="mx-3 mt-3 flex-row items-center gap-2.5 rounded-2xl px-3.5 py-2.5"
      style={{
        backgroundColor: isDark ? '#111c33' : '#ffffff',
        shadowColor: '#0f172a',
        shadowOpacity: isDark ? 0 : 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: isDark ? 0 : 2,
      }}>
      <Ionicons name="pin" size={16} color="#d97706" />
      <View style={{ flex: 1 }}>
        {count > 1 ? (
          <Text className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#d97706' }}>
            {count} pinned messages
          </Text>
        ) : null}
        <Text numberOfLines={1} className="text-[13px]" style={{ color: isDark ? '#e2e8f0' : '#334155' }}>
          <Text className="font-semibold">{getSenderDisplay(message)}: </Text>
          {message.deleted ? 'This message was deleted' : message.text}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={isDark ? '#64748b' : '#94a3b8'} />
    </Pressable>
  );
}

function MessageRow({
  message,
  index,
  isDark,
  isHighlighted,
  highlightOpacity,
  quoted,
  onReply,
  onJumpToQuoted,
}: {
  message: ChatMessage;
  index: number;
  isDark: boolean;
  isHighlighted: boolean;
  highlightOpacity: Animated.Value;
  quoted: ChatMessage | null;
  onReply: () => void;
  onJumpToQuoted: (id: string) => void;
}) {
  const isAdmin = message.sender === 'admin';
  const senderDisplay = getSenderDisplay(message);
  const stageMeta = message.stage ? getStageMetaByTitle(message.stage) : null;

  const fade = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 320, delay: Math.min(index * 20, 300), easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 320, delay: Math.min(index * 20, 300), easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const replyButton = (
    <Pressable
      onPress={onReply}
      hitSlop={8}
      className="h-7 w-7 items-center justify-center self-center rounded-full active:bg-slate-100 dark:active:bg-slate-800">
      <Ionicons name="arrow-undo-outline" size={15} color={isDark ? '#64748b' : '#94a3b8'} />
    </Pressable>
  );

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY }] }}>
      <Pressable onLongPress={onReply} delayLongPress={280}>
        <View className={`mb-4 flex-row items-center ${isAdmin ? 'justify-start' : 'justify-end'}`}>
          {!isAdmin ? replyButton : null}
          {isAdmin ? (
            <LinearGradient
              colors={isDark ? ['#25324d', '#1c2740'] : ['#dbe9ff', '#eef5ff']}
              style={{ marginRight: 8, height: 34, width: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }}>
              <Text className="text-[11px] font-bold text-brand-600 dark:text-brand-300">
                {getInitials(message.senderName || message.senderRole || 'Admin')}
              </Text>
            </LinearGradient>
          ) : null}
          <View style={{ maxWidth: '76%' }}>
            {isAdmin ? (
              <Text className="mb-1 ml-1 text-[12.5px] font-bold text-slate-700 dark:text-slate-200">
                {senderDisplay}
              </Text>
            ) : null}
            <View style={{ position: 'relative' }}>
              {isHighlighted ? (
                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: -6,
                    right: -6,
                    top: -6,
                    bottom: -6,
                    borderRadius: 24,
                    backgroundColor: '#f59e0b',
                    opacity: highlightOpacity.interpolate({ inputRange: [0, 1], outputRange: [0, 0.22] }),
                  }}
                />
              ) : null}

              {isAdmin ? (
                <View
                  className="rounded-[22px] px-4 py-3"
                  style={{
                    backgroundColor: isDark ? '#111c33' : '#ffffff',
                    borderTopLeftRadius: 6,
                    borderWidth: 1,
                    borderColor: isDark ? '#1e293b' : '#eef1f6',
                    shadowColor: '#0f172a',
                    shadowOpacity: isDark ? 0 : 0.06,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: isDark ? 0 : 2,
                  }}>
                  <MessageBubbleContent message={message} quoted={quoted} stageMeta={stageMeta} isAdmin isDark={isDark} onJumpToQuoted={onJumpToQuoted} />
                </View>
              ) : (
                <LinearGradient
                  colors={[ACCENT, PRIMARY]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: 22,
                    borderTopRightRadius: 6,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    shadowColor: '#0049B7',
                    shadowOpacity: 0.25,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 3,
                  }}>
                  <MessageBubbleContent message={message} quoted={quoted} stageMeta={stageMeta} isAdmin={false} isDark={isDark} onJumpToQuoted={onJumpToQuoted} />
                </LinearGradient>
              )}
            </View>

            <View className={`mt-1.5 flex-row items-center gap-1 ${isAdmin ? 'ml-1 justify-start' : 'mr-1 justify-end'}`}>
              <Text className="text-[11px] text-slate-400 dark:text-slate-500">{formatMessageTime(message.createdAt)}</Text>
              {!isAdmin ? (
                <Ionicons
                  name="checkmark-done"
                  size={14}
                  color={message.fullyRead ? '#3B82F6' : isDark ? '#64748b' : '#94a3b8'}
                />
              ) : null}
            </View>
          </View>
          {isAdmin ? replyButton : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

function MessageBubbleContent({
  message,
  quoted,
  stageMeta,
  isAdmin,
  isDark,
  onJumpToQuoted,
}: {
  message: ChatMessage;
  quoted: ChatMessage | null;
  stageMeta: ReturnType<typeof getStageMetaByTitle> | null;
  isAdmin: boolean;
  isDark: boolean;
  onJumpToQuoted: (id: string) => void;
}) {
  if (message.deleted) {
    return (
      <Text className="text-[15px] italic" style={{ color: isAdmin ? (isDark ? '#64748b' : '#94a3b8') : 'rgba(255,255,255,0.7)' }}>
        This message was deleted
      </Text>
    );
  }

  return (
    <>
      {message.pinned ? (
        <View
          className="mb-1.5 flex-row items-center gap-1 self-start rounded-full px-2 py-0.5"
          style={{ backgroundColor: isAdmin ? (isDark ? '#3a2e0d' : '#fffbeb') : 'rgba(255,255,255,0.2)' }}>
          <Ionicons name="pin" size={10} color={isAdmin ? '#d97706' : '#ffffff'} />
          <Text className="text-[10px] font-semibold" style={{ color: isAdmin ? '#b45309' : '#ffffff' }}>
            Pinned
          </Text>
        </View>
      ) : null}

      {quoted ? (
        <Pressable
          onPress={() => onJumpToQuoted(quoted._id)}
          className="mb-1.5 rounded-lg border-l-2 px-2 py-1"
          style={{
            borderLeftColor: isAdmin ? (isDark ? '#8bb4fd' : '#0049B7') : 'rgba(255,255,255,0.6)',
            backgroundColor: isAdmin ? (isDark ? '#0f1729' : '#f8fafc') : 'rgba(255,255,255,0.14)',
          }}>
          <Text className="text-[11px] font-semibold" style={{ color: isAdmin ? (isDark ? '#8bb4fd' : '#0049B7') : '#ffffff' }}>
            {getSenderDisplay(quoted)}
          </Text>
          <Text
            numberOfLines={1}
            className="text-[11px]"
            style={{ color: isAdmin ? (isDark ? '#94a3b8' : '#64748b') : 'rgba(255,255,255,0.85)' }}>
            {quoted.deleted ? 'This message was deleted' : quoted.text}
          </Text>
        </Pressable>
      ) : null}

      {stageMeta ? (
        <View
          className="mb-1.5 flex-row items-center gap-1.5 self-start rounded-full px-3 py-1"
          style={{ backgroundColor: isAdmin ? (isDark ? '#25324d' : '#eef5ff') : 'rgba(255,255,255,0.18)' }}>
          <Ionicons name={stageMeta.icon} size={12} color={isAdmin ? (isDark ? '#8bb4fd' : '#0049B7') : '#ffffff'} />
          <Text className="text-[11px] font-bold" style={{ color: isAdmin ? (isDark ? '#8bb4fd' : '#0049B7') : '#ffffff' }}>
            {stageMeta.title}
          </Text>
        </View>
      ) : null}

      <Text
        className={isAdmin ? 'text-[15px] leading-[21px] text-slate-800 dark:text-slate-100' : 'text-[15px] leading-[21px] text-white'}>
        {message.text}
      </Text>
    </>
  );
}
