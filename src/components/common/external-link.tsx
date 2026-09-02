import type { AnchorHTMLAttributes } from 'react';
import { ExternalLink as ExternalLinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The single way to render any href that is not a react-router route, so
 * "leaving the panel opens a new tab" is a convention of the codebase rather
 * than per-callsite memory.
 *
 * Scope decision: only links that LEAVE the panel open a new tab — an admin
 * verifying leads keeps their place in the list. Internal react-router
 * navigation stays in-tab: new-tabbing route changes would break SPA
 * navigation and the back button, and real `<Link>` anchors already support
 * cmd/middle-click for anyone who wants a tab.
 *
 * The component inspects the href and chooses — callers never decide:
 * - http(s) → `target="_blank" rel="noopener noreferrer"` (wa.me included).
 * - `mailto:` / `tel:` → a plain anchor WITHOUT target. They open the
 *   mail/phone app and never navigate the tab, and `target="_blank"` on them
 *   spawns ugly blank tabs in some browsers.
 * - Anything else non-web (e.g. `blob:` download hrefs) also stays plain —
 *   downloads never navigate either.
 */

interface ExternalLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  /** Appends a small external-link glyph where it aids scanning. */
  icon?: boolean;
}

export function ExternalLink({
  href,
  icon = false,
  className,
  children,
  ...rest
}: ExternalLinkProps) {
  const opensNewTab = /^https?:\/\//i.test(href);

  return (
    <a
      href={href}
      {...(opensNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={className}
      {...rest}
    >
      {children}
      {icon && (
        <ExternalLinkIcon
          aria-hidden
          className={cn(
            'inline size-3.5 shrink-0 align-[-0.125em]',
            children != null && 'ml-1',
          )}
        />
      )}
    </a>
  );
}
