import { forwardRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AtSign, Check, CheckCheck, Clock, CornerUpLeft, Milestone, MoreVertical, Pin, PinOff, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { relativeTime } from './JourneyTab';
import type { ChatMessage } from '../../types';

interface ChatBubbleProps {
  message: ChatMessage;
  quoted: ChatMessage | null;
  highlighted: boolean;
  currentUserId: string | null;
  isAwaitingTarget: boolean;
  onReply: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onJumpToQuote: (id: string) => void;
}

const ChatBubble = forwardRef<HTMLDivElement, ChatBubbleProps>(
  ({ message, quoted, highlighted, currentUserId, isAwaitingTarget, onReply, onDelete, onTogglePin, onJumpToQuote }, ref) => {
    // A message only renders on the right when it's the CURRENT staff
    // member's own message. Every other message — a different staff
    // member's, or the student's — renders on the left, regardless of
    // message.sender. This is what tells a co-admin's message apart from
    // "my" message instead of collapsing every admin-side sender together.
    const isStaffMessage = message.sender === 'admin';
    const isSelf = isStaffMessage && !!message.senderId && message.senderId === currentUserId;

    return (
      <div ref={ref} className={clsx('flex', isSelf ? 'justify-end' : 'justify-start')}>
        <div className="flex max-w-[75%] items-center gap-1">
          {isSelf && !message.deleted && (
            <BubbleMenu onReply={onReply} onDelete={onDelete} onTogglePin={onTogglePin} pinned={message.pinned} showDelete={isStaffMessage} align="right" />
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
            <BubbleMenu onReply={onReply} onDelete={onDelete} onTogglePin={onTogglePin} pinned={message.pinned} showDelete={isStaffMessage} align="left" />
          )}
        </div>
      </div>
    );
  }
);
ChatBubble.displayName = 'ChatBubble';

const BubbleMenu = ({
  onReply,
  onDelete,
  onTogglePin,
  pinned,
  showDelete,
  align,
}: {
  onReply: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  pinned: boolean;
  showDelete: boolean;
  align: 'left' | 'right';
}) => {
  const [open, setOpen] = useState(false);

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
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Message actions"
        className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
      >
        <MoreVertical size={14} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              className={clsx(
                'absolute top-7 z-50 w-40 overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-(--shadow-panel)',
                align === 'right' ? 'right-0' : 'left-0'
              )}
            >
              {item(<CornerUpLeft size={13} />, 'Reply', onReply)}
              {item(pinned ? <PinOff size={13} /> : <Pin size={13} />, pinned ? 'Unpin' : 'Pin', onTogglePin)}
              {showDelete && item(<Trash2 size={13} />, 'Delete', onDelete, true)}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatBubble;
