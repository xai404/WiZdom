import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { AtSign, Eraser, Lock, Milestone, Pin, Search, UserCheck, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button, ConfirmDialog, IconButton } from '../ui';
import { useInterval } from '../../hooks/useInterval';
import { useAuth } from '../../context/AuthContext';
import {
  clearStudentChat,
  deleteStudentChatMessage,
  editStudentChatMessage,
  fetchStudentChat,
  postStudentChatMessage,
  toggleMessagePin,
} from '../../api/students';
import { getSocket } from '../../lib/socket';
import ChatBubble from './ChatBubble';
import ChatComposer from './ChatComposer';
import MessageSearchBar from './MessageSearchBar';
import type { ChatMessage, ResponseHandler } from '../../types';

const POLL_MS = 6500;

// What the poll compares tick-to-tick to decide whether the thread changed
// and state needs replacing. Includes `text` and `edited` so an edit made
// elsewhere (another admin, or the student from the app) is picked up, not
// just new/deleted messages.
const chatSignature = (messages: ChatMessage[]) =>
  messages.map((m) => `${m._id}:${m.deleted ? 1 : 0}:${m.edited ? 1 : 0}:${m.text}`).join('|');

const dayKey = (iso: string) => new Date(iso).toDateString();

const dayLabel = (iso: string) => {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(iso) === dayKey(today.toISOString())) return 'Today';
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return 'Yesterday';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

interface ChatTabProps {
  studentId: string;
  stages: string[];
  currentStage: string;
  responsibleDepartment: string | null;
  lastHandledBy: ResponseHandler | null;
  awaitingSinceMessageId: string | null;
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  // Called after a send and on every poll tick — lets the parent re-pull
  // the student doc so the accountability header/card badge stay live.
  onAfterChange: () => void;
  // Closed accounts reject writes server-side (adminChatController) too —
  // this just replaces the composer with a WhatsApp-style "can't message
  // this thread" banner so nobody has to hit send and get a 403 to find out.
  isClosed: boolean;
}

const ChatTab = ({
  studentId,
  stages,
  currentStage,
  responsibleDepartment,
  lastHandledBy,
  awaitingSinceMessageId,
  messages,
  setMessages,
  onAfterChange,
  isClosed,
}: ChatTabProps) => {
  const { user } = useAuth();
  const canClearChat = user?.role === 'super_admin' || user?.role === 'admin';
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [pinnedListOpen, setPinnedListOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const bubbleRefs = useRef(new Map<string, HTMLDivElement>());
  const isAtBottomRef = useRef(true);
  const signatureRef = useRef('');
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messagesById = useMemo(() => new Map(messages.map((m) => [m._id, m])), [messages]);
  const replyingTo = replyingToId ? (messagesById.get(replyingToId) ?? null) : null;
  const pinnedMessages = useMemo(() => messages.filter((m) => m.pinned && !m.deleted), [messages]);
  const latestPinned = pinnedMessages[pinnedMessages.length - 1] ?? null;

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.trim().toLowerCase();
    return messages.filter((m) => !m.deleted && m.text.toLowerCase().includes(q));
  }, [messages, searchQuery]);

  const scrollToBottom = () => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  };

  useEffect(() => {
    scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  useEffect(() => {
    if (isAtBottomRef.current) scrollToBottom();
  }, [messages.length]);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  useInterval(async () => {
    if (document.hidden) return;
    try {
      const fresh = await fetchStudentChat(studentId);
      const signature = chatSignature(fresh);
      if (signature !== signatureRef.current) {
        signatureRef.current = signature;
        setMessages(fresh);
        // A poll-detected change (e.g. another admin's reply) can also flip
        // the accountability state — re-pull the student doc alongside it.
        onAfterChange();
      }
    } catch {
      // Transient poll failures are silently ignored — the next tick retries.
    }
  }, POLL_MS);

  // Real-time delivery — the poll above stays as a fallback/reconciliation
  // mechanism (per the socket rollout plan) rather than being removed. The
  // socket connection itself is owned by AuthContext (connected on
  // login/session-restore, torn down on logout/401); this effect only
  // attaches/detaches the message listener for whichever student is
  // currently open, so switching students never leaves a stale listener
  // reacting to the wrong thread.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (incoming: ChatMessage & { studentId: string }) => {
      if (incoming.studentId !== studentId) return;
      setMessages((prev) => (prev.some((m) => m._id === incoming._id) ? prev : [...prev, incoming]));
      onAfterChange();
    };

    // An existing message changed in place elsewhere — another admin (or the
    // student) edited/deleted/pinned it. Replace by _id; never append.
    const handleUpdatedMessage = (incoming: ChatMessage & { studentId: string }) => {
      if (incoming.studentId !== studentId) return;
      setMessages((prev) => prev.map((m) => (m._id === incoming._id ? incoming : m)));
    };

    const handleThreadCleared = (payload: { studentId: string }) => {
      if (payload.studentId !== studentId) return;
      setMessages([]);
      onAfterChange();
    };

    socket.on('chat:new-message', handleNewMessage);
    socket.on('chat:message-updated', handleUpdatedMessage);
    socket.on('chat:thread-cleared', handleThreadCleared);
    return () => {
      socket.off('chat:new-message', handleNewMessage);
      socket.off('chat:message-updated', handleUpdatedMessage);
      socket.off('chat:thread-cleared', handleThreadCleared);
    };
  }, [studentId, setMessages, onAfterChange]);

  const handleSend = async (text: string, stage: string | null, replyToId: string | null, department: string | null) => {
    await postStudentChatMessage(studentId, text, stage, replyToId, department);
    const fresh = await fetchStudentChat(studentId);
    signatureRef.current = chatSignature(fresh);
    isAtBottomRef.current = true;
    setMessages(fresh);
    setReplyingToId(null);
    onAfterChange();
  };

  const handleDelete = async (messageId: string) => {
    const updated = await deleteStudentChatMessage(studentId, messageId);
    setMessages((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
  };

  const handleEdit = async (messageId: string, text: string) => {
    const updated = await editStudentChatMessage(studentId, messageId, text);
    setMessages((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
  };

  const handleTogglePin = async (messageId: string) => {
    const updated = await toggleMessagePin(studentId, messageId);
    setMessages((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
  };

  // Hard delete — every message is gone, including stage-tagged ones (which
  // double as Journey tab remarks). setMessages([]) here is also what makes
  // the Journey tab's remarks disappear immediately: StudentDetailPanel
  // derives remarksByStage from this same messages array.
  const handleClearChat = async () => {
    setClearing(true);
    try {
      await clearStudentChat(studentId);
      setMessages([]);
      setClearConfirmOpen(false);
      onAfterChange();
    } finally {
      setClearing(false);
    }
  };

  const scrollToMessage = (id: string) => {
    bubbleRefs.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedId(id);
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    highlightTimeoutRef.current = setTimeout(() => setHighlightedId(null), 1200);
  };

  useEffect(() => () => {
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-(--shadow-panel)">
      {!searchOpen && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-white px-3 py-1.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Milestone size={12} className="text-slate-400" />
              {currentStage}
            </span>
            {responsibleDepartment && (
              <span className="flex items-center gap-0.5 font-medium text-emerald-600">
                <AtSign size={12} />
                {responsibleDepartment}
              </span>
            )}
            {lastHandledBy && (
              <span className="flex items-center gap-1">
                <UserCheck size={12} className="text-slate-400" />
                Last handled by {lastHandledBy.name}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {canClearChat && (
              <Button
                size="sm"
                variant="danger"
                icon={<Eraser size={14} />}
                onClick={() => setClearConfirmOpen(true)}
              >
                Clear chat
              </Button>
            )}
            <IconButton icon={<Search size={15} />} label="Search messages" onClick={() => setSearchOpen(true)} />
          </div>
        </div>
      )}

      {latestPinned && !searchOpen && (
        <div className="relative border-b border-amber-100 bg-amber-50">
          <button
            type="button"
            onClick={() => (pinnedMessages.length > 1 ? setPinnedListOpen((v) => !v) : scrollToMessage(latestPinned._id))}
            className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-amber-100/70"
          >
            <Pin size={13} className="shrink-0 text-amber-500" fill="currentColor" />
            <div className="min-w-0 flex-1">
              {pinnedMessages.length > 1 && (
                <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                  {pinnedMessages.length} pinned messages — tap to view all
                </p>
              )}
              <p className="truncate text-xs text-amber-800">
                <span className="font-medium">{latestPinned.senderName}:</span>{' '}
                {latestPinned.deleted ? 'This message was deleted' : latestPinned.text}
              </p>
            </div>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                handleTogglePin(latestPinned._id);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleTogglePin(latestPinned._id);
                }
              }}
              className="shrink-0 rounded-lg p-1 text-amber-500 hover:bg-amber-200/60"
              aria-label="Unpin message"
            >
              <X size={13} />
            </span>
          </button>

          <AnimatePresence>
            {pinnedListOpen && pinnedMessages.length > 1 && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setPinnedListOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.12 }}
                  className="absolute inset-x-0 top-full z-50 max-h-64 overflow-y-auto border-b border-amber-200 bg-white shadow-(--shadow-panel)"
                >
                  {pinnedMessages.map((pm) => (
                    <button
                      key={pm._id}
                      type="button"
                      onClick={() => {
                        setPinnedListOpen(false);
                        scrollToMessage(pm._id);
                      }}
                      className="flex w-full items-center gap-2 border-b border-amber-50 px-3 py-2 text-left transition last:border-b-0 hover:bg-amber-50"
                    >
                      <Pin size={12} className="shrink-0 text-amber-500" fill="currentColor" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs text-amber-800">
                          <span className="font-medium">{pm.senderName}:</span>{' '}
                          {pm.deleted ? 'This message was deleted' : pm.text}
                        </p>
                      </div>
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      )}

      {searchOpen && (
        <MessageSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onClose={() => {
            setSearchOpen(false);
            setSearchQuery('');
          }}
          resultCount={filteredMessages.length}
        />
      )}

      <div ref={listRef} onScroll={handleScroll} className="chat-pattern-bg min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {filteredMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            {searchQuery ? 'No matching messages.' : 'No messages yet.'}
          </div>
        ) : (
          filteredMessages.map((msg, i) => {
            const prev = filteredMessages[i - 1];
            const showDateSeparator = !prev || dayKey(prev.createdAt) !== dayKey(msg.createdAt);
            const quoted = msg.replyTo ? (messagesById.get(msg.replyTo) ?? null) : null;

            return (
              <div key={msg._id}>
                {showDateSeparator && (
                  <div className="my-3 flex items-center justify-center">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-500">
                      {dayLabel(msg.createdAt)}
                    </span>
                  </div>
                )}
                <ChatBubble
                  ref={(el) => {
                    if (el) bubbleRefs.current.set(msg._id, el);
                    else bubbleRefs.current.delete(msg._id);
                  }}
                  message={msg}
                  quoted={quoted}
                  highlighted={highlightedId === msg._id}
                  currentUserId={user?.id ?? null}
                  isAwaitingTarget={!!awaitingSinceMessageId && awaitingSinceMessageId === msg._id}
                  onReply={() => setReplyingToId(msg._id)}
                  onDelete={() => handleDelete(msg._id)}
                  onEditSave={(text) => handleEdit(msg._id, text)}
                  onTogglePin={() => handleTogglePin(msg._id)}
                  onJumpToQuote={scrollToMessage}
                />
              </div>
            );
          })
        )}
      </div>

      {isClosed ? (
        <div className="flex items-center justify-center gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3.5 text-center text-sm text-slate-500">
          <Lock size={14} className="shrink-0 text-slate-400" />
          This student's account is closed — messaging is disabled.
        </div>
      ) : (
        <ChatComposer
          stages={stages}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingToId(null)}
          onSend={handleSend}
        />
      )}

      <ConfirmDialog
        open={clearConfirmOpen}
        title="Clear this entire chat?"
        description="Every message in this conversation will be permanently deleted, including any journey stage remarks that came from chat messages. This cannot be undone."
        confirmLabel="Clear Chat"
        loading={clearing}
        onConfirm={handleClearChat}
        onCancel={() => setClearConfirmOpen(false)}
      />
    </div>
  );
};

export default ChatTab;
