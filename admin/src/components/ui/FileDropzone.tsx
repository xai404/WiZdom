import { useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { ImagePlus, X } from 'lucide-react';
import clsx from 'clsx';

interface FileDropzoneProps {
  previewUrl?: string | null;
  onFileSelect: (file: File | null) => void;
  label?: string;
}

const FileDropzone = ({ previewUrl, onFileSelect, label = 'Profile Picture' }: FileDropzoneProps) => {
  const [dragOver, setDragOver] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    setLocalPreview(URL.createObjectURL(file));
    onFileSelect(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const preview = localPreview || previewUrl;

  const clear = () => {
    setLocalPreview(null);
    onFileSelect(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={clsx(
          'relative flex h-28 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition',
          dragOver ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-slate-50 hover:border-brand-300'
        )}
      >
        {preview ? (
          <>
            <img src={preview} alt="Preview" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clear();
              }}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/60 text-white hover:bg-slate-900/80"
            >
              <X size={12} />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 text-slate-400">
            <ImagePlus size={22} />
            <span className="text-[11px]">Upload</span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
};

export default FileDropzone;
