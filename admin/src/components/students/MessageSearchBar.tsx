import { Search, X } from 'lucide-react';

interface MessageSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  resultCount: number;
}

const MessageSearchBar = ({ value, onChange, onClose, resultCount }: MessageSearchBarProps) => (
  <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
    <Search size={15} className="shrink-0 text-slate-400" />
    <input
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Search messages…"
      className="flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
    />
    {value && (
      <span className="shrink-0 text-xs text-slate-400">
        {resultCount} {resultCount === 1 ? 'result' : 'results'}
      </span>
    )}
    <button type="button" onClick={onClose} className="shrink-0 text-slate-400 hover:text-slate-600">
      <X size={15} />
    </button>
  </div>
);

export default MessageSearchBar;
