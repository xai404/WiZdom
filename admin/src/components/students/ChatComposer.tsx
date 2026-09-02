import { useEffect, useState } from 'react';
import { AtSign, Milestone, Paperclip, Send, Smile, X } from 'lucide-react';
import { Button, IconButton, Select } from '../ui';
import { fetchActiveDepartments } from '../../api/employees';
import { EMPLOYEE_DEPARTMENTS } from '../../types';
import type { ChatMessage } from '../../types';

interface ChatComposerProps {
  stages: string[];
  replyingTo: ChatMessage | null;
  onCancelReply: () => void;
  onSend: (text: string, stage: string | null, replyToId: string | null, department: string | null) => Promise<void>;
}

const ChatComposer = ({ stages, replyingTo, onCancelReply, onSend }: ChatComposerProps) => {
  const [text, setText] = useState('');
  const [stage, setStage] = useState('');
  const [department, setDepartment] = useState('');
  const [sending, setSending] = useState(false);
  // Only departments with an active employee — tagging one nobody staffs
  // would open an "awaiting reply" nothing can ever auto-resolve. Falls
  // back to the full list while the fetch is in flight so the dropdown
  // isn't empty on first render.
  const [taggableDepartments, setTaggableDepartments] = useState<readonly string[]>(EMPLOYEE_DEPARTMENTS);

  useEffect(() => {
    fetchActiveDepartments()
      .then(setTaggableDepartments)
      .catch(() => {});
  }, []);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await onSend(text.trim(), stage || null, replyingTo?._id ?? null, department || null);
      setText('');
      setStage('');
      setDepartment('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t border-slate-100 p-3">
      {replyingTo && (
        <div className="mb-2 flex items-center justify-between rounded-xl border-l-2 border-brand-400 bg-brand-50 px-3 py-2 text-xs">
          <div className="min-w-0">
            <p className="font-medium text-brand-700">Replying to {replyingTo.senderName}</p>
            <p className="truncate text-slate-500">{replyingTo.deleted ? 'This message was deleted' : replyingTo.text}</p>
          </div>
          <button type="button" onClick={onCancelReply} className="ml-2 shrink-0 text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <div className="w-36 shrink-0">
          <Select
            icon={<AtSign size={13} />}
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className={`py-1.5! pl-8! text-xs! ${department ? 'font-medium text-brand-700' : 'text-slate-400'}`}
          >
            <option value="">Tag team…</option>
            {taggableDepartments.map((d) => (
              <option key={d} value={d}>
                @{d}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-40 shrink-0">
          <Select
            icon={<Milestone size={13} />}
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className={`py-1.5! pl-8! text-xs! ${stage ? 'font-medium text-brand-700' : 'text-slate-400'}`}
          >
            <option value="">Tag stage…</option>
            {stages.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
        <IconButton icon={<Paperclip size={15} />} label="Attach a file (coming soon)" disabled />
        <IconButton icon={<Smile size={15} />} label="Add an emoji (coming soon)" disabled />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message…"
          className="min-w-40 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <Button onClick={handleSend} loading={sending} icon={<Send size={16} />} size="sm">
          Send
        </Button>
      </div>
    </div>
  );
};

export default ChatComposer;
