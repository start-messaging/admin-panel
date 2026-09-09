import type { ReactNode } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * Wraps a status badge (or any small inline element) so hovering or focusing
 * it explains that specific state — "what does 'no contact' actually mean?"
 * answered in place instead of over Slack.
 *
 * The children render exactly as the callsite styled them (the badge keeps
 * its own colour classes via `className`), so converting a raw badge span to
 * HelpBadge changes nothing visually and keeps the accessible name = the
 * badge text. Copy comes from the shared maps in src/lib/help-copy.ts keyed
 * by enum value, so the same status reads the same everywhere.
 */
interface HelpBadgeProps {
  /** Without copy the badge renders plain — no dead cursor-help affordance. */
  help?: string;
  className?: string;
  children: ReactNode;
}

export function HelpBadge({ help, className, children }: HelpBadgeProps) {
  if (!help) {
    return <span className={className}>{children}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={(props) => (
          <span
            {...props}
            tabIndex={0}
            className={cn('cursor-help', className, props.className)}
          >
            {children}
          </span>
        )}
      />
      <TooltipContent
        side="top"
        sideOffset={4}
        className="max-w-xs text-xs leading-relaxed text-balance"
      >
        {help}
      </TooltipContent>
    </Tooltip>
  );
}
