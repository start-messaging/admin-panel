import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Wallet, CheckCircle2, AlertTriangle } from 'lucide-react';
import { topupWallet, type TopupResult } from '@/apis/admin.api';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/constants';

/**
 * Manual wallet credit, replacing the psql script that was run by hand.
 *
 * Keyed on email rather than user id because that is what a support ticket
 * carries; a mistyped uuid would silently credit a stranger, a mistyped email
 * simply fails to match. The description is customer-visible, so the form
 * says so rather than leaving it to be discovered afterwards.
 */

const formatINR = (amount: number | string) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(Number(amount));

const QUICK_AMOUNTS = [100, 500, 1000, 5000];

export function TopupPage() {
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [result, setResult] = useState<TopupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      topupWallet({
        email: email.trim(),
        amount: Number(amount),
        description: description.trim(),
        internalNote: internalNote.trim() || undefined,
      }),
    onSuccess: (data) => {
      setResult(data);
      setError(null);
      // Only the money fields are cleared. The email survives so a second
      // credit to the same customer does not mean retyping it, which is when
      // the wrong address gets pasted in.
      setAmount('');
      setDescription('');
      setInternalNote('');
    },
    onError: (e: unknown) => {
      setResult(null);
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      setError(err.response?.data?.error?.message ?? 'Top-up failed');
    },
  });

  const parsed = Number(amount);
  const canSubmit =
    email.trim().includes('@') &&
    Number.isFinite(parsed) &&
    parsed > 0 &&
    description.trim().length >= 3 &&
    !mutation.isPending;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <Wallet className="size-5 text-muted-foreground" />
          Manual top-up
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Credit a customer's wallet by email. The credit is immediate and
          recorded against you in the ledger.
        </p>
      </div>

      <div className="max-w-xl rounded-xl border bg-card p-5 shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Customer email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@example.com"
              className="h-9 w-full rounded-md border bg-background px-3 text-xs"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Amount (INR)
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="500"
              className="h-9 w-full rounded-md border bg-background px-3 text-xs tabular-nums"
            />
            <div className="mt-2 flex gap-2">
              {QUICK_AMOUNTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAmount(String(a))}
                  className="rounded-md border px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted"
                >
                  {formatINR(a)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Description — the customer sees this
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Goodwill credit — failed sends on 2026-08-07"
              maxLength={200}
              className="h-9 w-full rounded-md border bg-background px-3 text-xs"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              Appears in their transaction history. Say why, not just what.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Internal note (optional) — not shown to the customer
            </label>
            <input
              type="text"
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              placeholder="Approved by …, ticket #412"
              maxLength={200}
              className="h-9 w-full rounded-md border bg-background px-3 text-xs"
            />
          </div>

          <Button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit}
            className="w-full"
          >
            {mutation.isPending
              ? 'Crediting…'
              : parsed > 0
                ? `Credit ${formatINR(parsed)}`
                : 'Credit wallet'}
          </Button>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-3 text-xs text-green-900">
            <div className="mb-1.5 flex items-center gap-2 font-semibold">
              <CheckCircle2 className="size-4" />
              Credited {formatINR(result.amount)}
            </div>
            <p>
              <Link
                to={ROUTES.CUSTOMER_DETAIL.replace(':userId', result.user.id)}
                className="underline"
              >
                {result.user.email}
              </Link>{' '}
              — balance {formatINR(result.balanceBefore)} →{' '}
              <strong className="tabular-nums">
                {formatINR(result.balanceAfter)}
              </strong>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
