import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button, Card, Select } from '../ui';
import type { ChatMessage, JourneyStage, JourneyStageStatus } from '../../types';

const STATUS_META: Record<JourneyStageStatus, { label: string; dot: string; text: string; bg: string }> = {
  pending: { label: 'Pending', dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' },
  in_progress: { label: 'In Progress', dot: 'bg-yellow-400', text: 'text-yellow-700', bg: 'bg-yellow-50' },
  completed: { label: 'Completed', dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
};

const relativeTime = (iso: string | null) => {
  if (!iso) return null;
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
};

interface JourneyTabProps {
  journey: JourneyStage[];
  remarksByStage: Map<string, ChatMessage>;
  onStatusChange: (title: string, status: JourneyStageStatus) => Promise<void>;
  onPostRemark: (title: string, text: string) => Promise<void>;
}

const JourneyTab = ({ journey, remarksByStage, onStatusChange, onPostRemark }: JourneyTabProps) => (
  <div className="space-y-3">
    {journey.map((stage, index) => (
      <JourneyRow
        key={stage.title}
        stage={stage}
        index={index}
        remark={remarksByStage.get(stage.title) ?? null}
        onStatusChange={onStatusChange}
        onPostRemark={onPostRemark}
      />
    ))}
  </div>
);

const JourneyRow = ({
  stage,
  index,
  remark,
  onStatusChange,
  onPostRemark,
}: {
  stage: JourneyStage;
  index: number;
  remark: ChatMessage | null;
  onStatusChange: (title: string, status: JourneyStageStatus) => Promise<void>;
  onPostRemark: (title: string, text: string) => Promise<void>;
}) => {
  const [saving, setSaving] = useState(false);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const meta = STATUS_META[stage.status];

  const handleStatus = async (status: JourneyStageStatus) => {
    if (status === stage.status || saving) return;
    setSaving(true);
    try {
      await onStatusChange(stage.title, status);
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (!comment.trim() || sending) return;
    setSending(true);
    try {
      await onPostRemark(stage.title, comment.trim());
      setComment('');
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className={`p-4 transition-opacity ${stage.status === 'pending' && index > 0 ? 'opacity-80' : ''}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.bg}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-800">{stage.title}</p>
            <p className={`text-xs font-medium ${meta.text}`}>
              {meta.label}
              {stage.updatedAt ? ` · ${relativeTime(stage.updatedAt)}` : ''}
            </p>
          </div>
        </div>

        <div className="self-start sm:self-auto">
          <Select
            value={stage.status}
            disabled={saving}
            onChange={(e) => handleStatus(e.target.value as JourneyStageStatus)}
            className={`min-w-40 font-medium ${meta.text}`}
          >
            {(Object.keys(STATUS_META) as JourneyStageStatus[]).map((status) => (
              <option key={status} value={status}>
                {STATUS_META[status].label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-3 min-h-11 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
        {remark ? <p className="text-sm text-slate-600">{remark.deleted ? 'This message was deleted' : remark.text}</p> : null}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Write a remark for this stage…"
          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <Button size="sm" variant="secondary" onClick={handleSend} disabled={!comment.trim() || sending} loading={sending} icon={<Send size={14} />}>
          Save
        </Button>
      </div>
    </Card>
  );
};

export { STATUS_META, relativeTime };
export default JourneyTab;
