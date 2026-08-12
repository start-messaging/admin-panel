import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Wallet, CheckCircle2, AlertTriangle } from 'lucide-react';
import { topupWallet, getUsers, type TopupResult } from '@/apis/admin.api';
import type { User } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxSearchInput,
} from '@/components/ui/combobox';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';

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

/**
 * Why the credit is being made, offered as presets over the customer-visible
 * description.
 *
 * A wallet credit means two completely different things depending on where the
 * money came from — the customer paid us out of band, or we gave it away — and
 * the ledger line is the only place the customer finds out which. Left to free
 * text that distinction got written a different way every time, or omitted.
 *
 * These fill the description rather than being a separate field because
 * description is the only channel the customer actually reads; a category
 * stored beside it would need a schema change and still would not appear in
 * their history. They are a starting point, not the finished sentence — the
 * field stays editable so the specifics (which invoice, which outage) can be
 * added, which is what "say why, not just what" asks for.
 */
const TOPUP_REASONS = [
  {
    key: 'payment',
    label: 'Payment received',
    template: 'Payment received — credited to your wallet',
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    hint: 'They paid us outside the app (bank transfer, UPI). Real money in.',
  },
  {
    key: 'goodwill',
    label: 'Goodwill credit',
    template: 'Goodwill credit for the disruption on ',
    tone: 'border-amber-200 bg-amber-50 text-amber-800',
    hint: 'Compensation for something that went wrong. Finish the sentence.',
  },
  {
    key: 'promo',
    label: 'Promotional credit',
    template: 'Promotional credit — added to your wallet at no charge',
    tone: 'border-blue-200 bg-blue-50 text-blue-800',
    hint: 'A bonus or campaign credit. Nothing was paid for this.',
  },
] as const;

export function TopupPage() {
  // `email` is still the only thing sent to the API. The picker is a way to
  // fill it accurately, not a replacement for it — a customer who does not
  // come back from search (a stale page, an odd spelling) can still be
  // credited by typing the address, which is how this screen worked before.
  const [email, setEmail] = useState('');
  const [picked, setPicked] = useState<User | null>(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [debounced, setDebounced] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [result, setResult] = useState<TopupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The customer search runs against a multi-column trigram query, so it is
  // debounced rather than fired per keystroke — the same reason the customers
  // list submits its search on Enter instead of as you type.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(email.trim()), 250);
    return () => clearTimeout(t);
  }, [email]);

  const matches = useQuery({
    queryKey: ['admin', 'users', 'topup-picker', debounced],
    queryFn: () => getUsers({ search: debounced, limit: 8 }),
    // Two characters is the point where the result set stops being "everyone".
    enabled: customerOpen && debounced.length >= 2,
    placeholderData: (prev) => prev,
  });

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
      setReason(null);
      setDescription('');
      setInternalNote('');
      // The picked customer carried a balance read before the credit; drop it
      // rather than leave a stale figure under the box. The result panel below
      // shows the authoritative before → after.
      setPicked(null);
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
          Find a customer and credit their wallet. The credit is immediate and
          recorded against you in the ledger.
        </p>
      </div>

      <div className="max-w-xl rounded-xl border bg-card p-5 shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Customer
            </label>
            <Combobox<User, false>
              open={customerOpen}
              onOpenChange={setCustomerOpen}
              items={matches.data?.data ?? []}
              inputValue={email}
              // The combobox reports three different reasons for an input
              // change and they must not be treated alike.
              //
              // `item-press` is the combobox filling the box with the chosen
              // email. Treating that as typing cleared `picked`, which left
              // the value null, which made the combobox reset the box -- so
              // picking a customer emptied the field instead of filling it.
              //
              // `input-clear` is the combobox reverting the box to match the
              // selection, which fires on blur. Honouring it wiped a typed-out
              // address the moment focus moved to Amount, and typing the
              // address is the whole fallback for a customer search cannot
              // reach. This screen wants the text kept either way, and it is
              // still clearable by selecting it and deleting -- that arrives
              // as `input-change`.
              //
              // Only genuine typing invalidates an earlier choice.
              onInputValueChange={(v, details) => {
                const reason = (details as { reason?: string } | undefined)
                  ?.reason;
                if (reason === 'input-clear') return;
                setEmail(v);
                if (reason === 'input-change') setPicked(null);
              }}
              itemToStringLabel={(u) => u.email}
              isItemEqualToValue={(a, b) => a.id === b.id}
              // Must reflect the real selection: a hardcoded null told the
              // combobox nothing was ever selected, so it kept resetting the
              // input to match.
              value={picked}
              onValueChange={(user) => {
                if (!user) return;
                setEmail(user.email);
                setPicked(user);
                setCustomerOpen(false);
              }}
            >
              <ComboboxSearchInput
                placeholder="Search by name, email or business…"
                onFocus={() => setCustomerOpen(true)}
              />

              <ComboboxContent>
                {matches.isFetching && (matches.data?.data.length ?? 0) === 0 ? (
                  <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                    Searching…
                  </p>
                ) : (
                  <>
                    <ComboboxList>
                      {(u: User) => (
                        <ComboboxItem key={u.id} value={u}>
                          <span className="block truncate font-medium">
                            {u.firstName} {u.lastName}
                            {u.businessName ? ` · ${u.businessName}` : ''}
                          </span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {u.email}
                            {u.walletBalance !== undefined &&
                              ` · ${formatINR(u.walletBalance)} balance`}
                          </span>
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                    <ComboboxEmpty>
                      {email.trim().length < 2
                        ? 'Type at least two characters to search.'
                        : 'No customer matches — you can still type the full email.'}
                    </ComboboxEmpty>
                  </>
                )}
              </ComboboxContent>
            </Combobox>

            {picked ? (
              <p className="mt-1 text-[10px] text-muted-foreground">
                Crediting{' '}
                <strong className="text-foreground">
                  {picked.firstName} {picked.lastName}
                </strong>
                {picked.walletBalance !== undefined && (
                  <> — balance now {formatINR(picked.walletBalance)}</>
                )}
              </p>
            ) : (
              <p className="mt-1 text-[10px] text-muted-foreground">
                Pick a customer from the list, or type their full email.
              </p>
            )}
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
              Reason
            </label>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {TOPUP_REASONS.map((r) => {
                const on = reason === r.key;
                return (
                  <button
                    key={r.key}
                    type="button"
                    title={r.hint}
                    onClick={() => {
                      setReason(r.key);
                      setDescription(r.template);
                    }}
                    className={cn(
                      'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
                      on
                        ? r.tone
                        : 'border-dashed text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>

            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Description — the customer sees this
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                // Once the text stops matching the preset it picked, the chip
                // is no longer describing what will be sent.
                setReason((current) => {
                  const picked = TOPUP_REASONS.find((x) => x.key === current);
                  return picked && e.target.value.startsWith(picked.template)
                    ? current
                    : null;
                });
              }}
              placeholder="Goodwill credit — failed sends on 2026-08-07"
              maxLength={200}
              className="h-9 w-full rounded-md border bg-background px-3 text-xs"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              {reason
                ? TOPUP_REASONS.find((r) => r.key === reason)?.hint
                : 'Appears in their transaction history. Say why, not just what.'}
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
