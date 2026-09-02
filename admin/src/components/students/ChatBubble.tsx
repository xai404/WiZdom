import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AtSign, Check, CheckCheck, Clock, CornerUpLeft, Milestone, MoreVertical, Pencil, Pin, PinOff, Trash2, X } from 'lucide-react';
import clsx from 'clsx';
import { relativeTime } from './JourneyTab';
import type { ChatMessage } from '../../types';

// A message can only be edited within this window of when it was sent —
// mirrors the backend's own enforcement in adminChatController.editAdminMessage
// (which is the actual guard; this just keeps the option from being offered
// once it would be rejected anyway).
const EDIT_WINDOW_MS = 10 * 60 * 1000;

interface ChatBubbleProps {
  message: ChatMessage;
  quoted: ChatMessage | null;
  highlighted: boolean;
  currentUserId: string | null;
  isAwaitingTarget: boolean;
  onReply: () => void;
  onDelete: () => void;
  onEditSave: (newText: string) => Promise<void>;
  onTogglePin: () => void;
  onJumpToQuote: (id: string) => void;
}

const ChatBubble = forwardRef<HTMLDivElement, ChatBubbleProps>(
  ({ message, quoted, highlighted, currentUserId, isAwaitingTarget, onReply, onDelete, onEditSave, onTogglePin, onJumpToQuote }, ref) => {
    // A message only renders on the right when it's the CURRENT staff
    // member's own message. Every other message — a different staff
    // member's, or the student's — renders on the left, regardless of
    // message.sender. This is what tells a co-admin's message apart from
    // "my" message instead of collapsing every admin-side sender together.
    const isStaffMessage = message.sender === 'admin';
    const isSelf = isStaffMessage && !!message.senderId && message.senderId === currentUserId;
    const canEdit = isSelf && !message.deleted && Date.now() - new Date(message.createdAt).getTime() < EDIT_WINDOW_MS;

    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState(message.text);
    const [saving, setSaving] = useState(false);

    const startEdit = () => {
      setDraft(message.text);
      setIsEditing(true);
    };
    const cancelEdit = () => {
      setIsEditing(false);
      setDraft(message.text);
    };
    const saveEdit = async () => {
      const trimmed = draft.trim();
      if (!trimmed || trimmed === message.text) {
        setIsEditing(false);
        return;
      }
      setSaving(true);
      try {
        await onEditSave(trimmed);
        setIsEditing(false);
      } finally {
        setSaving(false);
      }
    };

    return (
      <div ref={ref} className={clsx('flex', isSelf ? 'justify-end' : 'justify-start')}>
        <div className="flex max-w-[75%] items-center gap-1">
          {isSelf && !message.deleted && !isEditing && (
            <BubbleMenu
              onReply={onReply}
              onDelete={onDelete}
              onEdit={startEdit}
              onTogglePin={onTogglePin}
              pinned={message.pinned}
              showDelete={isStaffMessage}
              showEdit={canEdit}
              align="right"
            />
          )}

          <div
            className={clsx(
              'relative rounded-2xl border px-4 py-2.5 text-slate-700 transition-shadow',
              isSelf ? 'border-sky-100 bg-sky-50' : 'border-slate-200 bg-slate-50',
              highlighted && 'ring-2 ring-offset-2 ring-brand-400',
              message.pinned && !highlighted && 'ring-1 ring-amber-400'
            )}
          >
            {message.pinned && !message.deleted && (
              <Pin
                size={11}
                className={clsx('absolute -top-1.5 rotate-45 text-amber-500', isSelf ? '-left-1.5' : '-right-1.5')}
                fill="currentColor"
              />
            )}
            {message.deleted ? (
              <p className="text-sm italic text-slate-400">This message was deleted</p>
            ) : isEditing ? (
              <div className="flex min-w-56 flex-col gap-1.5">
                <textarea
                  autoFocus
                  rows={2}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      saveEdit();
                    } else if (e.key === 'Escape') {
                      cancelEdit();
                    }
                  }}
                  className="w-full resize-none rounded-lg border border-brand-200 bg-white px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={saving}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                  >
                    <X size={12} /> Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveEdit}
                    disabled={saving || !draft.trim()}
                    className="flex items-center gap-1 rounded-lg bg-brand-600 px-2 py-1 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    <Check size={12} /> {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {message.department && (
                  <div className="mb-1.5 flex items-center gap-1 border-b border-slate-200 pb-1 text-[10px] font-semibold">
                    <AtSign size={10} className="text-emerald-500" />
                    <span className="text-emerald-600">{message.department}</span>
                  </div>
                )}
                {quoted && (
                  <button
                    type="button"
                    onClick={() => onJumpToQuote(quoted._id)}
                    className="mb-1.5 block w-full rounded-lg border-l-2 border-brand-300 bg-white px-2 py-1 text-left text-xs text-slate-500 hover:bg-brand-50"
                  >
                    <span className="block font-medium">{quoted.senderName}</span>
                    <span className="block truncate">{quoted.deleted ? 'This message was deleted' : quoted.text}</span>
                  </button>
                )}
                {message.stage && (
                  <span className="mb-1 inline-flex items-center gap-0.5 rounded-full bg-brand-50 px-1.5 py-0.5 text-[9px] font-medium text-brand-700">
                    <Milestone size={9} /> {message.stage}
                  </span>
                )}
                {isAwaitingTarget && (
                  <span className="mb-1 ml-1 inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">
                    <Clock size={9} /> Awaiting Reply
                  </span>
                )}
                <p className="text-sm leading-snug">{message.text}</p>
              </>
            )}
            <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
              <span>
                {message.senderName} · {relativeTime(message.createdAt)}
                {message.edited && !message.deleted && ' · edited'}
              </span>
              {isSelf &&
                !message.deleted &&
                (message.fullyRead ? (
                  <CheckCheck size={12} className="text-sky-500" />
                ) : (
                  <Check size={12} />
                ))}
            </p>
          </div>

          {!isSelf && !message.deleted && (
            <BubbleMenu
              onReply={onReply}
              onDelete={onDelete}
              onEdit={startEdit}
              onTogglePin={onTogglePin}
              pinned={message.pinned}
              showDelete={isStaffMessage}
              showEdit={canEdit}
              align="left"
            />
          )}
        </div>
      </div>
    );
  }
);
ChatBubble.displayName = 'ChatBubble';

const MENU_MARGIN = 8;

const BubbleMenu = ({
  onReply,
  onDelete,
  onEdit,
  onTogglePin,
  pinned,
  showDelete,
  showEdit,
  align,
}: {
  onReply: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onTogglePin: () => void;
  pinned: boolean;
  showDelete: boolean;
  showEdit: boolean;
  align: 'left' | 'right';
}) => {
  const [open, setOpen] = useState(false);
  // Captured once, at open time — the trigger button's own position. The
  // dropdown itself is portaled to <body> (fixed positioning, clamped to
  // the viewport) specifically so it's never clipped by the chat panel's
  // `overflow-y-auto` scroll container the way an absolutely-positioned
  // in-flow dropdown would be for any message near the bottom of the
  // visible scroll area.
  const [anchor, setAnchor] = useState<{ top: number; bottom: number; left: number; right: number } | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setAnchor({ top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right });
      // Rough starting position (below the button); corrected against the
      // menu's real measured size in the layout effect below, before paint.
      setCoords({ top: rect.bottom + 4, left: align === 'right' ? rect.right - 160 : rect.left });
    }
    setOpen((v) => !v);
  };

  // Runs before the browser paints, so the flip/clamp correction below never
  // flashes the menu in the wrong spot first.
  useLayoutEffect(() => {
    if (!open || !anchor || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();

    let top = anchor.bottom + 4;
    if (top + rect.height > window.innerHeight - MENU_MARGIN) {
      top = anchor.top - rect.height - 4;
    }
    top = Math.min(Math.max(top, MENU_MARGIN), Math.max(MENU_MARGIN, window.innerHeight - rect.height - MENU_MARGIN));

    let left = align === 'right' ? anchor.right - rect.width : anchor.left;
    left = Math.min(Math.max(left, MENU_MARGIN), Math.max(MENU_MARGIN, window.innerWidth - rect.width - MENU_MARGIN));

    setCoords((prev) => (prev && prev.top === top && prev.left === left ? prev : { top, left }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, anchor]);

  // Close on scroll (of the chat panel or anything else) or resize, rather
  // than trying to keep a fixed-position portal glued to a scrolling
  // anchor — matches how most chat UIs handle a scroll while a message
  // menu is open. `true` (capture) so this catches scroll on the chat
  // panel's own inner scroll container, not just window-level scroll.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const item = (icon: React.ReactNode, label: string, onClick: () => void, danger = false) => (
    <button
      type="button"
      onClick={() => {
        onClick();
        setOpen(false);
      }}
      className={clsx(
        'flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium transition-colors',
        danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-50'
      )}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="relative shrink-0 self-start pt-1">
      <button
        ref={btnRef}
        type="button"
        onClick={toggleOpen}
        aria-label="Message actions"
        className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
      >
        <MoreVertical size={14} />
      </button>

      {open &&
        coords &&
        createPortal(
          <AnimatePresence>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              style={{ position: 'fixed', top: coords.top, left: coords.left }}
              className="z-50 w-40 overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-(--shadow-panel)"
            >
              {item(<CornerUpLeft size={13} />, 'Reply', onReply)}
              {showEdit && item(<Pencil size={13} />, 'Edit', onEdit)}
              {item(pinned ? <PinOff size={13} /> : <Pin size={13} />, pinned ? 'Unpin' : 'Pin', onTogglePin)}
              {showDelete && item(<Trash2 size={13} />, 'Delete', onDelete, true)}
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};

export default ChatBubble;
