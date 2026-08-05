import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  delay?: number;
}

// Debounced search box — keeps its own local draft so typing feels
// instant, and only propagates to the parent (i.e. fires an API call)
// `delay`ms after the user stops typing.
const SearchInput = ({ value, onChange, placeholder = 'Search…', className, delay = 350 }: SearchInputProps) => {
  const [draft, setDraft] = useState(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setDraft(value), [value]);

  const handleChange = (next: string) => {
    setDraft(next);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => onChange(next), delay);
  };

  const handleClear = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setDraft('');
    onChange('');
  };

  return (
    <div className={`relative ${className ?? ''}`}>
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-9 pl-9 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
      {draft && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};

export default SearchInput;
