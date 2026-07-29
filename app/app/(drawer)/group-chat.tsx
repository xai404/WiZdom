import { Ionicons } from '@expo/vector-icons';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { ChatBubbleSkeleton } from '@/components/skeleton';
import { Toast } from '@/components/toast';
import { getStageMetaBySlug, getStageMetaByTitle } from '@/constants/journey-meta';
import { useChat } from '@/context/chat-context';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { ChatMessage } from '@/lib/chat-api';
import { formatDateSeparator, formatMessageTime } from '@/lib/format-date';

const COUNSELLOR_NAME = 'Aditi Sharma';

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

function TypingDots() {
  const dots = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: 1, duration: 340, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 340, useNativeDriver: true }),
          Animated.delay((2 - i) * 150),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#94a3b8', opacity: dot }}
        />
      ))}
    </View>
  );
}

export default function GroupChatScreen() {
  const params = useLocalSearchParams<{ stage?: string }>();
  const navigation = useNavigation<DrawerNavigationProp<Record<string, object | undefined>>>();
  const { isDark } = useAppTheme();
  const { messages, loading, error, reload, sendReply, markRead } = useChat();

  const [draft, setDraft] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showScrollToLatest, setShowScrollToLatest] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [typingVisible, setTypingVisible] = useState(false);

  const listRef = useRef<FlatList<ListItem>>(null);
  const highlightOpacity = useRef(new Animated.Value(0)).current;
  const scrolledToStageRef = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      markRead();
    }, [markRead])
  );

  useEffect(() => {
    const showTimer = setTimeout(() => setTypingVisible(true), 900);
    const hideTimer = setTimeout(() => setTypingVisible(false), 3100);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

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
    sendReply(draft, replyingTo?.stage ?? null);
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
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={['top', 'left', 'right']}>
      <View className="flex-row items-center gap-2 border-b border-slate-100 px-3 py-3 dark:border-slate-800">
        <Pressable
          onPress={() => navigation.toggleDrawer()}
          hitSlop={12}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-slate-100 dark:active:bg-slate-800">
          <Ionicons name="menu-outline" size={24} color={isDark ? '#f1f5f9' : '#0f172a'} />
        </Pressable>

        <View className="flex-1">
          {searchOpen ? (
            <TextInput
              autoFocus
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search conversation..."
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
              className="text-[15px] text-slate-900 dark:text-white"
            />
          ) : (
            <>
              <Text className="text-base font-bold text-slate-900 dark:text-white" numberOfLines={1}>
                Group Chat
              </Text>
              <Text className="text-[11px] text-slate-400 dark:text-slate-500" numberOfLines={1}>
                You, {COUNSELLOR_NAME} & counsellors
              </Text>
            </>
          )}
        </View>

        <Pressable
          onPress={() => {
            if (searchOpen) {
              setSearchOpen(false);
              setSearchQuery('');
            } else {
              setSearchOpen(true);
            }
          }}
          hitSlop={10}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-slate-100 dark:active:bg-slate-800">
          <Ionicons name={searchOpen ? 'close' : 'search-outline'} size={20} color={isDark ? '#f1f5f9' : '#0f172a'} />
        </Pressable>
        <Pressable
          onPress={() => setToastMessage('No pinned messages yet.')}
          hitSlop={10}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-slate-100 dark:active:bg-slate-800">
          <Ionicons name="pin-outline" size={19} color={isDark ? '#f1f5f9' : '#0f172a'} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={{ flex: 1 }}>
        <View style={{ flex: 1, position: 'relative' }}>
          {isInitialLoading ? (
            <View style={{ flex: 1, padding: 16 }}>
              <ChatBubbleSkeleton align="left" />
              <ChatBubbleSkeleton align="right" />
              <ChatBubbleSkeleton align="left" />
              <ChatBubbleSkeleton align="left" />
            </View>
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
              title={searchQuery ? 'No matches' : 'Start the conversation'}
              description={
                searchQuery
                  ? 'No messages match your search.'
                  : "Say hello to your counsellor — this is the one place you'll ever need to check."
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
              ListFooterComponent={
                typingVisible ? (
                  <View className="mt-1 flex-row items-center gap-2">
                    <View className="h-6 w-6 items-center justify-center rounded-full bg-brand-100 dark:bg-slate-800">
                      <Text className="text-[9px] font-bold text-brand-600 dark:text-brand-300">
                        {getInitials(COUNSELLOR_NAME)}
                      </Text>
                    </View>
                    <View className="rounded-full bg-card px-3 py-2 dark:bg-card-dark">
                      <TypingDots />
                    </View>
                  </View>
                ) : null
              }
              renderItem={({ item }) => {
                if (item.type === 'separator') {
                  return (
                    <View className="my-3 flex-row items-center justify-center">
                      <Text className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {item.label}
                      </Text>
                    </View>
                  );
                }

                const isAdmin = item.message.sender === 'admin';
                const isHighlighted = highlightedId === item.message._id;
                const stageMeta = item.message.stage ? getStageMetaByTitle(item.message.stage) : null;

                return (
                  <Pressable onLongPress={() => setReplyingTo(item.message)} delayLongPress={280}>
                    <View className={`mb-3 flex-row ${isAdmin ? 'justify-start' : 'justify-end'}`}>
                      {isAdmin ? (
                        <View className="mr-2 h-8 w-8 items-center justify-center rounded-full bg-brand-100 dark:bg-slate-800">
                          <Text className="text-[11px] font-bold text-brand-600 dark:text-brand-300">
                            {getInitials(item.message.senderName)}
                          </Text>
                        </View>
                      ) : null}
                      <View style={{ maxWidth: '76%' }}>
                        {isAdmin ? (
                          <Text className="mb-1 ml-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            {item.message.senderName}
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
                                borderRadius: 22,
                                backgroundColor: '#f59e0b',
                                opacity: highlightOpacity.interpolate({ inputRange: [0, 1], outputRange: [0, 0.22] }),
                              }}
                            />
                          ) : null}
                          <View
                            className="rounded-2xl px-4 py-2.5"
                            style={{
                              backgroundColor: isAdmin ? (isDark ? '#1c2740' : '#ffffff') : '#0049B7',
                              borderTopLeftRadius: isAdmin ? 4 : 18,
                              borderTopRightRadius: isAdmin ? 18 : 4,
                              shadowColor: '#0f172a',
                              shadowOpacity: isDark ? 0 : 0.05,
                              shadowRadius: 8,
                              shadowOffset: { width: 0, height: 3 },
                              elevation: isDark ? 0 : 1,
                            }}>
                            {stageMeta ? (
                              <View
                                className="mb-1.5 flex-row items-center gap-1 self-start rounded-full px-2 py-0.5"
                                style={{ backgroundColor: isAdmin ? (isDark ? '#25324d' : '#eef5ff') : 'rgba(255,255,255,0.16)' }}>
                                <Ionicons
                                  name={stageMeta.icon}
                                  size={11}
                                  color={isAdmin ? (isDark ? '#8bb4fd' : '#0049B7') : '#ffffff'}
                                />
                                <Text
                                  className="text-[10px] font-semibold"
                                  style={{ color: isAdmin ? (isDark ? '#8bb4fd' : '#0049B7') : '#ffffff' }}>
                                  {stageMeta.title}
                                </Text>
                              </View>
                            ) : null}
                            <Text className={isAdmin ? 'text-[15px] text-slate-800 dark:text-slate-100' : 'text-[15px] text-white'}>
                              {item.message.text}
                            </Text>
                          </View>
                        </View>
                        <View className={`mt-1 flex-row items-center gap-1 ${isAdmin ? 'ml-1 justify-start' : 'mr-1 justify-end'}`}>
                          <Text className="text-[11px] text-slate-400 dark:text-slate-500">
                            {formatMessageTime(item.message.createdAt)}
                          </Text>
                          {!isAdmin ? <Ionicons name="checkmark-done" size={13} color="#8bb4fd" /> : null}
                        </View>
                      </View>
                    </View>
                  </Pressable>
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
          <View className="flex-row items-center gap-2 border-t border-slate-100 bg-slate-50 px-4 py-2 dark:border-slate-800 dark:bg-slate-900">
            <View className="h-8 w-1 rounded-full bg-brand-600" />
            <View className="flex-1">
              <Text className="text-xs font-semibold text-brand-600 dark:text-brand-300" numberOfLines={1}>
                Replying to {replyingTo.senderName}
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

        <View
          className="flex-row items-end gap-2 border-t border-slate-100 px-3 py-3 dark:border-slate-800"
          style={{ backgroundColor: isDark ? '#0B1220' : '#F8FAFC' }}>
          <Pressable
            onPress={() => setToastMessage('Attachments coming soon.')}
            hitSlop={8}
            className="h-11 w-11 items-center justify-center rounded-full active:bg-slate-200 dark:active:bg-slate-800">
            <Ionicons name="attach-outline" size={22} color={isDark ? '#94a3b8' : '#64748b'} />
          </Pressable>
          <Pressable
            onPress={() => setToastMessage('Image sharing coming soon.')}
            hitSlop={8}
            className="h-11 w-11 items-center justify-center rounded-full active:bg-slate-200 dark:active:bg-slate-800">
            <Ionicons name="image-outline" size={22} color={isDark ? '#94a3b8' : '#64748b'} />
          </Pressable>
          <View className="flex-1 flex-row items-end rounded-3xl bg-card px-4 py-2 dark:bg-card-dark">
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Type your message..."
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
              multiline
              className="max-h-28 flex-1 py-1.5 text-[15px] text-slate-900 dark:text-white"
              style={{ textAlignVertical: 'center' }}
            />
          </View>
          <Pressable
            onPress={handleSend}
            disabled={!draft.trim()}
            className="h-11 w-11 items-center justify-center rounded-full"
            style={{ backgroundColor: draft.trim() ? '#0049B7' : isDark ? '#1e293b' : '#e2e8f0' }}>
            <Ionicons name="send" size={18} color={draft.trim() ? '#ffffff' : isDark ? '#64748b' : '#94a3b8'} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Toast message={toastMessage} onHide={() => setToastMessage(null)} />
    </SafeAreaView>
  );
}
