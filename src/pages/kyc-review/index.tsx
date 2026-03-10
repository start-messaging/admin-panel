import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Loader2,
} from 'lucide-react';
import { getKycList } from '@/apis/admin.api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { KycStatus } from '@/types';

const STATUS_TABS: { label: string; value: KycStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

const STATUS_BADGE: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  pending: {
    label: 'Pending',
    className: 'bg-amber-100 text-amber-700',
    icon: Clock,
  },
  approved: {
    label: 'Approved',
    className: 'bg-green-100 text-green-700',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-700',
    icon: XCircle,
  },
};

export function KycReviewPage() {
  const [activeTab, setActiveTab] = useState<KycStatus | 'all'>('pending');
  const [page, setPage] = useState(1);
  const limit = 15;

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'kyc', activeTab, page],
    queryFn: () =>
      getKycList({
        page,
        limit,
        ...(activeTab !== 'all' && { status: activeTab }),
      }),
  });

  const users = data?.data ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">KYC Reviews</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review and manage customer KYC submissions
        </p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 rounded-lg border bg-muted/50 p-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setActiveTab(tab.value);
              setPage(1);
            }}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              activeTab === tab.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : users.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center text-muted-foreground">
          <FileText className="mb-2 size-10 opacity-40" />
          <p className="text-sm">No KYC submissions found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((user) => {
            const badge = STATUS_BADGE[user.kycStatus];
            const BadgeIcon = badge?.icon;

            return (
              <Link
                key={user.id}
                to={`/kyc-review/${user.id}`}
                className="flex items-center justify-between rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {user.firstName?.[0]}
                      {user.lastName?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  {user.businessName && (
                    <p className="ml-[3.25rem] mt-1 truncate text-sm text-muted-foreground">
                      {user.businessName}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-4">
                  {user.kycSubmittedAt && (
                    <span className="hidden text-xs text-muted-foreground sm:block">
                      {new Date(user.kycSubmittedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  )}
                  {badge && (
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                        badge.className,
                      )}
                    >
                      {BadgeIcon && <BadgeIcon className="size-3" />}
                      {badge.label}
                    </span>
                  )}
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({pagination?.total} total)
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
