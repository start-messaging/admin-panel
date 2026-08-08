import { cn } from '@/lib/utils';

/**
 * Palette keys rather than raw classes, so the server can name a colour
 * without knowing anything about Tailwind.
 */
const COLOURS: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
  red: 'bg-red-100 text-red-700 border-red-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  green: 'bg-green-100 text-green-700 border-green-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  violet: 'bg-violet-100 text-violet-700 border-violet-200',
};

export function TagChip({
  label,
  colour = 'slate',
  title,
  derived = false,
  onRemove,
  className,
}: {
  label: string;
  colour?: string;
  title?: string;
  /** Derived tags are computed, so they are shown dashed and cannot be removed. */
  derived?: boolean;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium',
        COLOURS[colour] ?? COLOURS.slate,
        derived && 'border-dashed',
        className,
      )}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 opacity-50 hover:opacity-100"
          aria-label={`Remove ${label}`}
        >
          ×
        </button>
      )}
    </span>
  );
}
