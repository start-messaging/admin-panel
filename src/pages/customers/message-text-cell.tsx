/**
 * The text that went to the provider, clamped for a table row.
 *
 * `renderedContent` is stored with every 4-8 digit run masked, so the live code
 * is never in it, and it is null on rows sent before 2026-08-08. The full text
 * is in the title and in the message detail modal; the row only has to say
 * what the message was, so an operator scanning for the wrong wording does not
 * have to open each one.
 */
export function MessageTextCell({ text }: { text: string | null }) {
  if (!text) return <span className="italic opacity-60">—</span>;
  return (
    <p
      className="line-clamp-2 max-w-sm whitespace-pre-wrap break-words font-mono text-[11px] leading-snug"
      title={text}
    >
      {text}
    </p>
  );
}
