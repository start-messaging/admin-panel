import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * A label — table column header, filter caption, field name — that explains
 * itself on hover or keyboard focus, so a new team member can read what a
 * screen means without asking.
 *
 * Two rules keep it honest:
 * - The accessible name stays the label text: the glyph is aria-hidden and
 *   the help copy lives in the tooltip, so screen readers and test locators
 *   still see "Signals", not a paragraph.
 * - The glyph only appears where a tooltip exists — a column without one
 *   renders plain text, so the icon itself signals "there is more here".
 *
 * The trigger is a focusable span (tabIndex=0): the panel's TooltipProvider
 * (mounted in main.tsx) opens it on focus as well as hover.
 */
interface HeaderTooltipProps {
  label: string;
  help: string;
  className?: string;
}

export function HeaderTooltip({ label, help, className }: HeaderTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={(props) => (
          <span
            {...props}
            tabIndex={0}
            className={cn(
              'inline-flex cursor-help items-center gap-1 rounded-sm focus-visible:outline-2 focus-visible:outline-ring',
              className,
              props.className,
            )}
          >
            {label}
            <HelpCircle
              aria-hidden
              className="size-3 shrink-0 text-muted-foreground/60"
            />
          </span>
        )}
      />
      <TooltipContent
        side="bottom"
        sideOffset={6}
        className="max-w-xs text-xs leading-relaxed text-balance"
      >
        {help}
      </TooltipContent>
    </Tooltip>
  );
}
