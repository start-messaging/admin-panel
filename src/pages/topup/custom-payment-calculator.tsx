import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calculator, Check, Copy } from 'lucide-react';
import { getCustomPaymentQuote } from '@/apis/admin.api';

/**
 * Works out a payment made outside the app.
 *
 * A customer who pays through a Razorpay payment link or a hand-made payment
 * pays the gateway's fee on top, exactly as in the checkout. Two questions come
 * up, and each is one answer on this card:
 *
 *   - "I am about to send a payment link for ₹1,000 of credit: for how much?"
 *   - "They paid ₹1,024.17: how much do I credit?"
 *
 * Both are answered by the server, with the same rule the in-app checkout
 * uses, so a custom payment costs what an app top-up would and the figure here
 * cannot drift from it. Nothing is computed in the browser.
 *
 * A direct bank or UPI transfer outside Razorpay carries no gateway fee, so the
 * credit is simply what arrived — the card says so rather than leaving it to be
 * remembered.
 */

const formatINR = (amount: number | string) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
    Number(amount),
  );

/** Debounced so a quote is requested when typing pauses, not per keystroke. */
function useDebounced(value: string, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

const asAmount = (raw: string) => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export function CustomPaymentCalculator({
  credit,
  onUseCredit,
}: {
  /** The amount currently typed into the form: the credit to be given. */
  credit: string;
  /** Fills the form's amount with a credit worked out from a payment. */
  onUseCredit: (amount: number) => void;
}) {
  const [paid, setPaid] = useState('');
  const [copied, setCopied] = useState(false);

  const creditNumber = asAmount(useDebounced(credit));
  const paidNumber = asAmount(useDebounced(paid));

  const forward = useQuery({
    queryKey: ['admin', 'custom-payment-quote', 'credit', creditNumber],
    queryFn: () => getCustomPaymentQuote({ credit: creditNumber as number }),
    enabled: creditNumber !== null,
    staleTime: 60_000,
  });

  const back = useQuery({
    queryKey: ['admin', 'custom-payment-quote', 'paid', paidNumber],
    queryFn: () => getCustomPaymentQuote({ paid: paidNumber as number }),
    enabled: paidNumber !== null,
    staleTime: 60_000,
  });

  const copy = async (value: number) => {
    try {
      await navigator.clipboard.writeText(value.toFixed(2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be refused (insecure context, denied permission).
      // The figure is on screen either way; copying is a convenience.
    }
  };

  return (
    <div className="max-w-xl space-y-4 rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Calculator className="size-4 text-muted-foreground" />
        Custom payment calculator
      </div>
      <p className="text-[11px] text-muted-foreground">
        For payments taken through Razorpay outside the app (a payment link).
        Razorpay takes its fee from what the customer pays, so ask for the
        credit plus that fee. A plain bank or UPI transfer has no fee: credit
        exactly what arrived.
      </p>

      <div>
        <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Creating the payment
        </p>
        {creditNumber === null ? (
          <p className="text-xs text-muted-foreground">
            Enter the amount to credit above, and this shows what to ask the
            customer to pay.
          </p>
        ) : forward.isError ? (
          <p className="text-xs text-red-700">Could not work that out.</p>
        ) : forward.data ? (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span>
              To credit <strong>{formatINR(forward.data.amount)}</strong>, create
              the payment for
            </span>
            <strong className="text-sm tabular-nums">
              {formatINR(forward.data.chargedAmount)}
            </strong>
            <button
              type="button"
              onClick={() => void copy(forward.data.chargedAmount)}
              className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted"
            >
              {copied ? (
                <Check className="size-3" />
              ) : (
                <Copy className="size-3" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <span className="basis-full text-[11px] text-muted-foreground">
              {formatINR(forward.data.amount)} credit +{' '}
              {formatINR(forward.data.convenienceFee)} gateway fee
            </span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Working it out…</p>
        )}
      </div>

      <div className="border-t pt-3">
        <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          They already paid through Razorpay
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={paid}
            onChange={(e) => setPaid(e.target.value)}
            placeholder="Amount they paid, e.g. 1024.17"
            className="h-8 w-56 rounded-md border bg-background px-3 text-xs tabular-nums"
          />
          {paidNumber !== null && back.data && (
            <>
              <span className="text-xs">
                → credit <strong>{formatINR(back.data.amount)}</strong>
              </span>
              <button
                type="button"
                onClick={() => onUseCredit(back.data.amount)}
                className="rounded-md border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted"
              >
                Use as amount
              </button>
            </>
          )}
        </div>
        {paidNumber !== null && back.isError && (
          <p className="mt-1 text-xs text-red-700">Could not work that out.</p>
        )}
        {paidNumber !== null &&
          back.data &&
          back.data.chargedAmount !== paidNumber && (
            <p className="mt-1 text-[11px] text-amber-700">
              {formatINR(paidNumber)} is not a payment the app could have
              produced, so this credits the largest amount it covers (
              {formatINR(back.data.chargedAmount)} worth). Check it was meant
              to go through Razorpay.
            </p>
          )}
      </div>
    </div>
  );
}
