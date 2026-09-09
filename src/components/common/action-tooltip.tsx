import type { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * Explains what a button DOES before it is clicked — reserved for actions
 * with consequences (sends an email, recrawls a site, finalises a payout),
 * where "what happens when I press this?" deserves an answer up front.
 *
 * The child render receives the tooltip's trigger props and spreads them
 * onto the real control, so the button itself is the trigger: hover and
 * keyboard focus both open it, and nothing extra lands in the tab order.
 * Note that a disabled button swallows pointer events, so the tooltip only
 * shows while the action is actually available — acceptable, since the copy
 * describes what clicking does.
 */
interface ActionTooltipProps {
  help: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  children: TooltipPrimitive.Trigger.Props['render'];
}

export function ActionTooltip({ help, side = 'bottom', children }: ActionTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent
        side={side}
        sideOffset={6}
        className="max-w-xs text-xs leading-relaxed text-balance"
      >
        {help}
      </TooltipContent>
    </Tooltip>
  );
}
