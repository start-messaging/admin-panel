import { useState } from 'react';
import { Loader2, Monitor, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EmailPreviewResult } from '@/types/email';

interface EmailPreviewProps {
  preview: EmailPreviewResult | undefined;
  isLoading: boolean;
  /** Address whose data the preview is merged with, if any. */
  previewFor: string;
  onPreviewForChange: (email: string) => void;
}

/**
 * Renders the campaign exactly as the server will send it.
 *
 * The HTML goes into a sandboxed iframe rather than into the page. Two reasons:
 * the panel's Tailwind reset would otherwise restyle the email and show a
 * layout no recipient will ever see, and the body is arbitrary HTML that must
 * not be able to reach the admin session around it.
 */
export function EmailPreview({
  preview,
  isLoading,
  previewFor,
  onPreviewForChange,
}: EmailPreviewProps) {
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [showText, setShowText] = useState(false);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
          <button
            type="button"
            onClick={() => setViewport('desktop')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              viewport === 'desktop'
                ? 'bg-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Monitor className="size-3.5" />
            Desktop
          </button>
          <button
            type="button"
            onClick={() => setViewport('mobile')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              viewport === 'mobile'
                ? 'bg-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Smartphone className="size-3.5" />
            Mobile
          </button>
          <button
            type="button"
            onClick={() => setShowText((s) => !s)}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              showText
                ? 'bg-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
            // The text part is what a spam filter reads and what text-only
            // clients show, so it is worth being able to look at.
            title="Show the plain-text alternative"
          >
            Plain text
          </button>
        </div>

        <input
          type="email"
          className="h-8 w-full rounded-md border bg-background px-2 text-xs sm:w-56"
          placeholder="Preview as… (customer email)"
          value={previewFor}
          onChange={(e) => onPreviewForChange(e.target.value)}
        />
      </div>

      {preview && (
        <div className="rounded-lg border bg-muted/20 px-3 py-2">
          <p className="truncate text-sm font-medium">{preview.subject}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {preview.isSampleData
              ? 'Merged with sample data — enter a customer email above to use real values'
              : `Merged with ${preview.context.email}`}
          </p>
        </div>
      )}

      <div className="relative min-h-[420px] flex-1 overflow-hidden rounded-xl border bg-[#f5f6f8]">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {showText ? (
          <pre className="h-full overflow-auto whitespace-pre-wrap bg-background p-4 font-mono text-xs leading-relaxed">
            {preview?.text ?? ''}
          </pre>
        ) : (
          <div className="flex h-full justify-center overflow-auto p-3">
            <iframe
              title="Email preview"
              // No allow-same-origin: the frame must not be able to reach the
              // parent document or its storage. No allow-scripts either — an
              // email client would not run them, so neither should the preview.
              sandbox=""
              srcDoc={preview?.html ?? ''}
              className={cn(
                'h-full border-0 bg-white transition-all',
                viewport === 'mobile'
                  ? 'w-[390px] rounded-2xl shadow-lg'
                  : 'w-full',
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
}
