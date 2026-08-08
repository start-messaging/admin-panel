import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MessageSquare, Search } from 'lucide-react';
import { searchMessages } from '@/apis/admin.api';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { MessageDetailModal } from '@/pages/customers/message-detail-modal';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { AdminMessage, MessageStatus } from '@/types';

/**
 * Look up a phone number across every customer.
 *
 * The customer-detail messages tab can only answer "what did this account
 * send"; when a recipient complains, the only thing anyone has is the number,
 * and finding it meant guessing the account first. This asks the question the
 * other way round, and each row opens the same detail view — template,
 * rendered text, the provider's own words — so "where did it fail" is one
 * click from the number.
 */

const STATUS_BADGE: Record<string, string> = {
  delivered: 'bg-green-100 text-green-700',
  sent: 'bg-blue-100 text-blue-700',
  queued: 'bg-amber-100 text-amber-700',
  initiated: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-500',
};

const STATUS_OPTIONS = [
  'all',
  'initiated',
  'queued',
  'sent',
  'delivered',
  'failed',
  'expired',
] as const;

const formatINR = (amount: number | string) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(Number(amount));

export function MessagesLookupPage() {
  const [phoneInput, setPhoneInput] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'all' | MessageStatus>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selected, setSelected] = useState<AdminMessage | null>(null);

  const query = useQuery({
    queryKey: ['admin', 'message-search', phone, status, page, limit],
    // Only ever fires on an explicit search: an unfiltered query would page
    // through every message on the platform.
    enabled: phone.trim().length > 0,
    queryFn: () =>
      searchMessages({
        page,
        limit,
        phoneNumber: phone.trim(),
        status: status === 'all' ? undefined : status,
      }),
  });

  const search = () => {
    setPage(1);
    setPhone(phoneInput);
  };

  const messages = query.data?.data ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <MessageSquare className="size-5 text-muted-foreground" />
          Number lookup
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Search a recipient number across all customers to see every attempt
          and why it failed.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Phone number
            </label>
            <input
              type="text"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder="9034036898"
              className="h-9 w-56 rounded-md border bg-background px-3 font-mono text-xs"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value as 'all' | MessageStatus);
              }}
              className="h-9 rounded-md border bg-background px-3 text-xs capitalize"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={search} className="h-9">
            <Search className="mr-1.5 size-3.5" />
            Search
          </Button>
        </div>

        {!phone ? (
          <p className="py-10 text-center text-xs text-muted-foreground">
            Enter a number to search. Spaces and country codes are fine —
            <span className="font-mono"> +91 90340 36898</span> and
            <span className="font-mono"> 9034036898</span> both match.
          </p>
        ) : query.isLoading ? (
          <p className="py-10 text-center text-xs text-muted-foreground">
            Searching…
          </p>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-xs text-muted-foreground">
            No messages found for <span className="font-mono">{phone}</span>.
            Nothing has ever been sent to this number.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                    <th className="px-4 py-2.5 font-semibold">Recipient</th>
                    <th className="px-4 py-2.5 font-semibold">Customer</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 font-semibold">Template</th>
                    <th className="min-w-[220px] px-4 py-2.5 font-semibold">
                      Why it failed (provider)
                    </th>
                    <th className="px-4 py-2.5 text-right font-semibold">Cost</th>
                    <th className="px-4 py-2.5 font-semibold">Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((msg: AdminMessage) => (
                    <tr
                      key={msg.id}
                      onClick={() => setSelected(msg)}
                      className="cursor-pointer border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 font-mono text-[11px]">
                        {msg.phoneNumber}
                      </td>
                      <td className="px-4 py-3">
                        {msg.user ? (
                          <Link
                            to={ROUTES.CUSTOMER_DETAIL.replace(
                              ':userId',
                              msg.userId,
                            )}
                            onClick={(e) => e.stopPropagation()}
                            className="text-primary hover:underline"
                          >
                            {msg.user.email}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase',
                            STATUS_BADGE[msg.status] ??
                              'bg-gray-100 text-gray-600',
                          )}
                        >
                          {msg.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {msg.otpTemplate?.name ?? (
                          <span className="italic opacity-60">—</span>
                        )}
                      </td>
                      <td className="max-w-md px-4 py-3 align-top text-muted-foreground">
                        <p className="whitespace-pre-wrap break-words text-[11px] leading-snug">
                          {msg.providerFailureReason ??
                            msg.providerStatusDescription ??
                            '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {formatINR(msg.costAmount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-muted-foreground">
                        {new Date(msg.createdAt).toLocaleDateString('en-IN')}{' '}
                        {new Date(msg.createdAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {query.data?.pagination && (
              <Pagination
                className="mt-2 border-t pt-3"
                pagination={query.data.pagination}
                onPageChange={setPage}
                onLimitChange={setLimit}
                isLoading={query.isPlaceholderData}
                itemLabel="messages"
              />
            )}
          </div>
        )}
      </div>

      {selected && (
        <MessageDetailModal
          message={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
