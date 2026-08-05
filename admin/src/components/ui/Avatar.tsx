import clsx from 'clsx';
import { API_ORIGIN } from '../../api/client';

const INITIALS_PALETTE = [
  'bg-brand-100 text-brand-700',
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
];

const paletteFor = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return INITIALS_PALETTE[hash % INITIALS_PALETTE.length];
};

const initialsFor = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}

const Avatar = ({ name, src, size = 40, className }: AvatarProps) => {
  if (src) {
    return (
      <img
        src={src.startsWith('http') ? src : `${API_ORIGIN}${src}`}
        alt={name}
        style={{ width: size, height: size }}
        className={clsx('shrink-0 rounded-full object-cover ring-2 ring-white', className)}
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className={clsx(
        'flex shrink-0 items-center justify-center rounded-full font-semibold',
        paletteFor(name || '?'),
        className
      )}
    >
      {initialsFor(name || '?') || '?'}
    </div>
  );
};

export default Avatar;
