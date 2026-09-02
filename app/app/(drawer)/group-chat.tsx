import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatBackground } from '@/components/chat-background';
import { ChatHeader } from '@/components/chat-header';
import { EmptyState } from '@/components/empty-state';
import { LottieLoader } from '@/components/lottie-loader';
import { DEPARTMENTS } from '@/constants/departments';
import { getStageMetaBySlug, getStageMetaByTitle } from '@/constants/journey-meta';
import { useAuth } from '@/context/auth-context';
import { useChat } from '@/context/chat-context';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { ChatMessage } from '@/lib/chat-api';
import { fetchActiveDepartments } from '@/lib/departments-api';
import { formatDateSeparator, formatMessageTime } from '@/lib/format-date';

const PRIMARY = '#0049B7';
const ACCENT = '#3B82F6';

// A message can only be edited within this window of sending it — mirrors
// the backend guard in studentChatController.editMyMessage; this just keeps
// the option from being offered once it would be rejected anyway.
const EDIT_WINDOW_MS = 10 * 60 * 1000;

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
  const { token } = useAuth();
  const { messages, loading, error, reload, sendReply, deleteMessage, editMessage, markRead, unreadCount } = useChat();
  const isFocused = useIsFocused();

  const [draft, setDraft] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [taggedDepartment, setTaggedDepartment] = useState<string | null>(null);
  const [showDeptPicker, setShowDeptPicker] = useState(false);
  // Shows every department by default, and narrows to only the ones with
  // an active employee once GET /api/student/departments resolves — that
  // route isn't live on the deployed API yet, so this fallback keeps the
  // picker usable in the meantime instead of showing "no teams available".
  // See lib/departments-api.ts.
  const [taggableDepartments, setTaggableDepartments] = useState<string[]>([...DEPARTMENTS]);

  useEffect(() => {
    if (!token) return;
    fetchActiveDepartments(token).then((depts) => {
      if (depts.length > 0) setTaggableDepartments(depts);
    });
  }, [token]);
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

  // A message that arrives (e.g. via the real-time socket) while this
  // screen is already open must be marked read immediately — otherwise
  // the Chats tab badge (chat-context's unreadCount) would briefly tick up
  // even though the student is looking straight at it. Gated on
  // unreadCount so this only fires an actual markRead() call when there's
  // something new to clear, not on every poll/render.
  useEffect(() => {
    if (isFocused && unreadCount > 0) markRead();
  }, [isFocused, unreadCount, markRead]);

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

  const handleDeleteMessage = useCallback(
    (message: ChatMessage) => {
      Alert.alert('Delete message?', 'This will remove the message for everyone in this chat.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMessage(message._id) },
      ]);
    },
    [deleteMessage]
  );

  const handleSend = () => {
    if (!draft.trim()) return;
    sendReply(draft, replyingTo?.stage ?? null, replyingTo?._id ?? null, taggedDepartment);
    setDraft('');
    setReplyingTo(null);
    setTaggedDepartment(null);
    setShowDeptPicker(false);
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
                    onDelete={() => handleDeleteMessage(item.message)}
                    onEditSave={(text) => editMessage(item.message._id, text)}
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

        {taggedDepartment && !showDeptPicker ? (
          <View
            className="mx-3 mb-1 flex-row items-center gap-2 rounded-2xl px-3.5 py-2"
            style={{
              backgroundColor: isDark ? 'rgba(15,23,42,0.85)' : '#ffffff',
              shadowColor: '#0f172a',
              shadowOpacity: isDark ? 0 : 0.06,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: isDark ? 0 : 2,
            }}>
            <Ionicons name="pricetag" size={14} color={PRIMARY} />
            <Text className="flex-1 text-xs font-semibold text-brand-600 dark:text-brand-300">
              Tagging {taggedDepartment} Team
            </Text>
            <Pressable onPress={() => setTaggedDepartment(null)} hitSlop={8}>
              <Ionicons name="close" size={16} color={isDark ? '#94a3b8' : '#64748b'} />
            </Pressable>
          </View>
        ) : null}

        {showDeptPicker ? (
          <View
            className="mx-3 mb-1 rounded-2xl px-2.5 py-2.5"
            style={{
              backgroundColor: isDark ? 'rgba(15,23,42,0.85)' : '#ffffff',
              shadowColor: '#0f172a',
              shadowOpacity: isDark ? 0 : 0.06,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: isDark ? 0 : 2,
            }}>
            <Text className="mb-2 ml-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Tag a team
            </Text>
            {taggableDepartments.length === 0 ? (
              <Text className="ml-1 text-xs text-slate-400 dark:text-slate-500">No teams available right now.</Text>
            ) : (
              <View className="flex-row flex-wrap gap-1.5">
                {taggableDepartments.map((dept) => {
                  const selected = taggedDepartment === dept;
                  return (
                    <Pressable
                      key={dept}
                      onPress={() => {
                        setTaggedDepartment(selected ? null : dept);
                        setShowDeptPicker(false);
                      }}
                      className="rounded-full px-3 py-1.5"
                      style={{ backgroundColor: selected ? PRIMARY : isDark ? '#1e293b' : '#eef1f6' }}>
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: selected ? '#ffffff' : isDark ? '#cbd5e1' : '#475569' }}>
                        @{dept}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
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
            <Pressable
              onPress={() => setShowDeptPicker((v) => !v)}
              hitSlop={8}
              className="h-9 w-9 items-center justify-center self-center rounded-full"
              style={{ backgroundColor: taggedDepartment || showDeptPicker ? (isDark ? '#25324d' : '#eef5ff') : 'transparent' }}
              accessibilityLabel="Tag a team">
              <Ionicons
                name="pricetag-outline"
                size={18}
                color={taggedDepartment || showDeptPicker ? PRIMARY : isDark ? '#64748b' : '#94a3b8'}
              />
            </Pressable>

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
  onDelete,
  onEditSave,
  onJumpToQuoted,
}: {
  message: ChatMessage;
  index: number;
  isDark: boolean;
  isHighlighted: boolean;
  highlightOpacity: Animated.Value;
  quoted: ChatMessage | null;
  onReply: () => void;
  onDelete: () => void;
  onEditSave: (text: string) => Promise<void>;
  onJumpToQuoted: (id: string) => void;
}) {
  const isAdmin = message.sender === 'admin';
  const senderDisplay = getSenderDisplay(message);
  const stageMeta = message.stage ? getStageMetaByTitle(message.stage) : null;

  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(message.text);
  const [savingEdit, setSavingEdit] = useState(false);
  // Only the student's own, not-deleted messages, and only for the first
  // 10 minutes — same rule the Admin Panel applies to staff messages.
  const canEdit = !isAdmin && !message.deleted && Date.now() - new Date(message.createdAt).getTime() < EDIT_WINDOW_MS;

  const startEdit = () => {
    setEditDraft(message.text);
    setIsEditing(true);
  };
  const cancelEdit = () => {
    setIsEditing(false);
    setEditDraft(message.text);
  };
  const saveEdit = async () => {
    const trimmed = editDraft.trim();
    if (!trimmed || trimmed === message.text) {
      cancelEdit();
      return;
    }
    setSavingEdit(true);
    try {
      await onEditSave(trimmed);
      setIsEditing(false);
    } finally {
      setSavingEdit(false);
    }
  };

  const fade = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 320, delay: Math.min(index * 20, 300), easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 320, delay: Math.min(index * 20, 300), easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One "⋮" menu per message instead of a row of loose icons: tap it to get
  // Reply / Edit / Delete (Edit + Delete only on the student's own,
  // not-deleted, still-editable messages — mirrors the Admin Panel's
  // per-bubble menu). Positioned against the trigger with measureInWindow
  // and shown in a Modal so it floats above the FlatList without being
  // clipped by a row near the screen edge.
  const { width: screenW, height: screenH } = useWindowDimensions();
  const kebabRef = useRef<View>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  const menuItems: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean }[] = [
    { icon: 'arrow-undo-outline', label: 'Reply', onPress: onReply },
    ...(canEdit ? [{ icon: 'pencil-outline' as const, label: 'Edit', onPress: startEdit }] : []),
    ...(!isAdmin && !message.deleted ? [{ icon: 'trash-outline' as const, label: 'Delete', onPress: onDelete, danger: true }] : []),
  ];

  const MENU_WIDTH = 168;
  const openMenu = () => {
    kebabRef.current?.measureInWindow((x, y, w, h) => {
      const estHeight = menuItems.length * 46 + 10;
      let top = y + h + 6;
      if (top + estHeight > screenH - 24) top = Math.max(24, y - estHeight - 6);
      let left = isAdmin ? x : x + w - MENU_WIDTH;
      left = Math.min(Math.max(left, 8), screenW - MENU_WIDTH - 8);
      setMenuPos({ top, left });
      setMenuOpen(true);
    });
  };
  const runItem = (fn: () => void) => {
    setMenuOpen(false);
    // let the menu Modal finish dismissing before opening an Alert (delete)
    // or swapping the bubble into edit mode — stacking either on top of a
    // still-animating Modal is flaky on both platforms.
    setTimeout(fn, 160);
  };

  const kebabButton =
    message.deleted || isEditing ? null : (
      <Pressable
        ref={kebabRef}
        onPress={openMenu}
        hitSlop={8}
        className="h-7 w-7 items-center justify-center self-center rounded-full active:bg-slate-100 dark:active:bg-slate-800">
        <Ionicons name="ellipsis-vertical" size={15} color={isDark ? '#64748b' : '#94a3b8'} />
      </Pressable>
    );

  const menu = (
    <Modal transparent visible={menuOpen} animationType="fade" onRequestClose={() => setMenuOpen(false)}>
      <Pressable className="flex-1" onPress={() => setMenuOpen(false)}>
        {menuPos ? (
          <View
            style={{
              position: 'absolute',
              top: menuPos.top,
              left: menuPos.left,
              width: MENU_WIDTH,
              borderRadius: 14,
              paddingVertical: 5,
              backgroundColor: isDark ? '#1c2740' : '#ffffff',
              borderWidth: 1,
              borderColor: isDark ? '#334155' : '#e8ecf3',
              shadowColor: '#0f172a',
              shadowOpacity: 0.18,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 8,
            }}>
            {menuItems.map((item) => (
              <Pressable
                key={item.label}
                onPress={() => runItem(item.onPress)}
                className="flex-row items-center gap-3 px-4 py-2.5 active:bg-slate-100 dark:active:bg-slate-800">
                <Ionicons
                  name={item.icon}
                  size={16}
                  color={item.danger ? '#ef4444' : isDark ? '#cbd5e1' : '#475569'}
                />
                <Text
                  className={`text-[14px] ${item.danger ? 'text-red-500' : 'text-slate-700 dark:text-slate-200'}`}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </Pressable>
    </Modal>
  );

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY }] }}>
      <Pressable onLongPress={onReply} delayLongPress={280}>
        <View className={`mb-4 flex-row items-center ${isAdmin ? 'justify-start' : 'justify-end'}`}>
          {!isAdmin ? kebabButton : null}
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
              ) : isEditing ? (
                <View
                  style={{
                    minWidth: 220,
                    borderRadius: 22,
                    borderTopRightRadius: 6,
                    borderWidth: 1,
                    borderColor: isDark ? '#334155' : '#c7d2fe',
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    paddingHorizontal: 14,
                    paddingVertical: 11,
                  }}>
                  <TextInput
                    autoFocus
                    multiline
                    value={editDraft}
                    onChangeText={setEditDraft}
                    editable={!savingEdit}
                    className="text-[15px] text-slate-800 dark:text-slate-100"
                    style={{ minHeight: 38, padding: 0 }}
                  />
                  <View className="mt-2 flex-row items-center justify-end gap-2">
                    <Pressable
                      onPress={cancelEdit}
                      disabled={savingEdit}
                      hitSlop={6}
                      className="rounded-lg px-2.5 py-1 active:bg-slate-100 dark:active:bg-slate-800">
                      <Text className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={saveEdit}
                      disabled={savingEdit || !editDraft.trim()}
                      hitSlop={6}
                      className="rounded-lg px-3 py-1 active:opacity-80"
                      style={{ backgroundColor: PRIMARY, opacity: savingEdit || !editDraft.trim() ? 0.5 : 1 }}>
                      <Text className="text-[12px] font-semibold text-white">{savingEdit ? 'Saving…' : 'Save'}</Text>
                    </Pressable>
                  </View>
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
              {message.edited && !message.deleted ? (
                <Text className="text-[11px] text-slate-400 dark:text-slate-500">· edited</Text>
              ) : null}
              {!isAdmin ? (
                <Ionicons
                  name="checkmark-done"
                  size={14}
                  color={message.fullyRead ? '#3B82F6' : isDark ? '#64748b' : '#94a3b8'}
                />
              ) : null}
            </View>
          </View>
          {isAdmin ? kebabButton : null}
        </View>
      </Pressable>
      {menu}
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

      {/* Only ever present on the student's own sent messages — admin-tagged
          departments are internal routing and stripped before this ever
          reaches the app (see studentChatController.getMyChat). */}
      {message.department ? (
        <View
          className="mb-1.5 flex-row items-center gap-1.5 self-start rounded-full px-3 py-1"
          style={{ backgroundColor: isAdmin ? (isDark ? '#25324d' : '#eef5ff') : 'rgba(255,255,255,0.18)' }}>
          <Ionicons name="pricetag" size={12} color={isAdmin ? (isDark ? '#8bb4fd' : '#0049B7') : '#ffffff'} />
          <Text className="text-[11px] font-bold" style={{ color: isAdmin ? (isDark ? '#8bb4fd' : '#0049B7') : '#ffffff' }}>
            {message.department} Team
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
