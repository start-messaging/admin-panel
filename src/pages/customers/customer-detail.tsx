import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Mail,
  Phone,
  Globe,
  Building2,
  MapPin,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Loader2,
  Calendar,
  User as UserIcon,
  ToggleLeft,
  ToggleRight,
  Wallet,
  MessageSquare,
  IndianRupee,
  Key,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getUserDetail,
  updateUserStatus,
  getCustomerOverview,
  getCustomerMessages,
} from '@/apis/admin.api';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/api-error';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { KycStatus, MessageStatus } from '@/types';

const KYC_CONFIG: Record<
  KycStatus,
  { label: string; className: string; icon: typeof Clock }
> = {
  pending: { label: 'Pending Review', className: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700', icon: XCircle },
  not_submitted: {
    label: 'Not Submitted',
    className: 'bg-gray-100 text-gray-500',
    icon: Shield,
  },
};

const STATUS_BADGE: Record<string, string> = {
  delivered: 'bg-green-100 text-green-700',
  sent: 'bg-blue-100 text-blue-700',
  queued: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-500',
};

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}

export function CustomerDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Message filters
  const [messagesPage, setMessagesPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | MessageStatus>('all');
  const [phoneFilter, setPhoneFilter] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: user, isLoading } = useQuery({
    queryKey: ['admin', 'user', userId],
    queryFn: () => getUserDetail(userId!),
    enabled: !!userId,
  });

  const { data: overview } = useQuery({
    queryKey: ['admin', 'user-overview', userId],
    queryFn: () => getCustomerOverview(userId!),
    enabled: !!userId,
  });

  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: [
      'admin',
      'user-messages',
      userId,
      messagesPage,
      statusFilter,
      phoneFilter,
      startDate,
      endDate,
    ],
    queryFn: () =>
      getCustomerMessages(userId!, {
        page: messagesPage,
        limit: 20,
        status: statusFilter === 'all' ? undefined : statusFilter,
        phoneNumber: phoneFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
    enabled: !!userId,
  });

  const statusMutation = useMutation({
    mutationFn: (isActive: boolean) => updateUserStatus(userId!, { isActive }),
    onSuccess: (updatedUser) => {
      toast.success(
        updatedUser.isActive ? 'User activated successfully' : 'User suspended successfully',
      );
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', userId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });

  const hasFilters = statusFilter !== 'all' || phoneFilter || startDate || endDate;

  function clearFilters() {
    setStatusFilter('all');
    setPhoneFilter('');
    setPhoneInput('');
    setStartDate('');
    setEndDate('');
    setMessagesPage(1);
  }

  function applyPhoneFilter() {
    setPhoneFilter(phoneInput);
    setMessagesPage(1);
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-muted-foreground">User not found</p>
        <Button variant="link" onClick={() => navigate(ROUTES.CUSTOMERS)}>
          Back to Customers
        </Button>
      </div>
    );
  }

  const kyc = KYC_CONFIG[user.kycStatus];
  const KycIcon = kyc.icon;

  const messages = messagesData?.data ?? [];
  const msgPagination = messagesData?.pagination;
  const totalPages = msgPagination ? Math.ceil(msgPagination.total / msgPagination.limit) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate(ROUTES.CUSTOMERS)}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {user.firstName?.[0]}
              {user.lastName?.[0]}
            </div>
            <div>
              <h1 className="text-xl font-bold">
                {user.firstName} {user.lastName}
              </h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
              user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
            )}
          >
            <span
              className={cn(
                'size-1.5 rounded-full',
                user.isActive ? 'bg-green-500' : 'bg-red-500',
              )}
            />
            {user.isActive ? 'Active' : 'Suspended'}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
              kyc.className,
            )}
          >
            <KycIcon className="size-3" />
            {kyc.label}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Summary Stats */}
        {overview && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:col-span-2">
            <StatCard
              icon={Wallet}
              label="Wallet Balance"
              value={formatINR(overview.wallet.balance)}
            />
            <StatCard
              icon={MessageSquare}
              label="Total Messages"
              value={overview.messages.totalMessages.toLocaleString('en-IN')}
            />
            <StatCard
              icon={IndianRupee}
              label="Total Spent"
              value={formatINR(overview.messages.totalSpent)}
            />
            <StatCard
              icon={Key}
              label="API Keys"
              value={overview.apiKeyCount.toString()}
            />
          </div>
        )}

        {/* Profile Information */}
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <UserIcon className="size-4 text-muted-foreground" />
            Profile Information
          </h2>
          <div className="space-y-3">
            <InfoRow icon={Mail} label="Email" value={user.email} />
            <InfoRow icon={Phone} label="Mobile" value={user.mobileNumber ?? 'Not provided'} />
            <InfoRow icon={Globe} label="Country" value={user.country ?? 'Not provided'} />
            <InfoRow
              icon={CheckCircle2}
              label="Mobile Verified"
              value={user.mobileVerified ? 'Yes' : 'No'}
              valueClassName={user.mobileVerified ? 'text-green-600' : 'text-muted-foreground'}
            />
            <InfoRow
              icon={Calendar}
              label="Registered"
              value={new Date(user.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            />
          </div>
        </div>

        {/* Account Details */}
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <Shield className="size-4 text-muted-foreground" />
            Account Details
          </h2>
          <div className="space-y-3">
            <InfoRow
              icon={UserIcon}
              label="Role"
              value={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            />
            <InfoRow
              icon={CheckCircle2}
              label="Onboarding"
              value={user.hasCompletedOnboarding ? 'Completed' : 'Incomplete'}
              valueClassName={
                user.hasCompletedOnboarding ? 'text-green-600' : 'text-amber-600'
              }
            />
            <InfoRow
              icon={Building2}
              label="Company"
              value={user.companyName ?? 'Not provided'}
            />
            <InfoRow
              icon={Globe}
              label="Website"
              value={user.websiteUrl ?? 'Not provided'}
              isLink={!!user.websiteUrl}
            />
          </div>
        </div>

        {/* Business / KYC Details */}
        <div className="rounded-xl border bg-card p-5 lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <Building2 className="size-4 text-muted-foreground" />
            Business & KYC Details
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoRow
              icon={Building2}
              label="Business Name"
              value={user.businessName ?? 'Not provided'}
            />
            <InfoRow icon={FileText} label="PAN" value={user.pan ?? 'Not provided'} />
            <InfoRow icon={FileText} label="GSTIN" value={user.gstin ?? 'Not provided'} />
            <InfoRow
              icon={MapPin}
              label="Business Address"
              value={user.businessAddress ?? 'Not provided'}
            />
            {user.kycSubmittedAt && (
              <InfoRow
                icon={Calendar}
                label="KYC Submitted"
                value={new Date(user.kycSubmittedAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              />
            )}
            {user.kycReviewedAt && (
              <InfoRow
                icon={Calendar}
                label="KYC Reviewed"
                value={new Date(user.kycReviewedAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              />
            )}
          </div>

          {/* Rejection reason */}
          {user.kycStatus === 'rejected' && user.kycRejectionReason && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-700">Rejection Reason</p>
              <p className="mt-1 text-sm text-red-600">{user.kycRejectionReason}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="rounded-xl border bg-card p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold">Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Button
              variant={user.isActive ? 'destructive' : 'default'}
              size="sm"
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate(!user.isActive)}
            >
              {statusMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : user.isActive ? (
                <ToggleLeft className="size-4" />
              ) : (
                <ToggleRight className="size-4" />
              )}
              {user.isActive ? 'Suspend User' : 'Activate User'}
            </Button>
            {user.kycStatus !== 'not_submitted' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/kyc-review/${user.id}`)}
              >
                <FileText className="size-4" />
                View KYC Details
              </Button>
            )}
          </div>
        </div>

        {/* Message History */}
        <div className="rounded-xl border bg-card p-5 lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <MessageSquare className="size-4 text-muted-foreground" />
            Message History
          </h2>

          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Status</label>
              <select
                className="h-9 rounded-md border bg-background px-3 text-sm"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as 'all' | MessageStatus);
                  setMessagesPage(1);
                }}
              >
                <option value="all">All</option>
                <option value="queued">Queued</option>
                <option value="sent">Sent</option>
                <option value="delivered">Delivered</option>
                <option value="failed">Failed</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Phone</label>
              <input
                type="text"
                placeholder="Search phone..."
                className="h-9 rounded-md border bg-background px-3 text-sm"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                onBlur={applyPhoneFilter}
                onKeyDown={(e) => e.key === 'Enter' && applyPhoneFilter()}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">From</label>
              <input
                type="date"
                className="h-9 rounded-md border bg-background px-3 text-sm"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setMessagesPage(1);
                }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">To</label>
              <input
                type="date"
                className="h-9 rounded-md border bg-background px-3 text-sm"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setMessagesPage(1);
                }}
              />
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="size-3" />
                Clear
              </Button>
            )}
          </div>

          {/* Table */}
          {messagesLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
              <MessageSquare className="size-8" />
              <p className="text-sm">No messages found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Phone Number</th>
                      <th className="pb-2 pr-4 font-medium">Status</th>
                      <th className="pb-2 pr-4 font-medium">Provider</th>
                      <th className="pb-2 pr-4 font-medium">Cost</th>
                      <th className="pb-2 pr-4 font-medium">Failure Reason</th>
                      <th className="pb-2 font-medium">Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {messages.map((msg) => (
                      <tr key={msg.id} className="border-b last:border-0">
                        <td className="py-2.5 pr-4 font-mono text-xs">{msg.phoneNumber}</td>
                        <td className="py-2.5 pr-4">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                              STATUS_BADGE[msg.status] ?? 'bg-gray-100 text-gray-600',
                            )}
                          >
                            {msg.status}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-xs">{msg.provider}</td>
                        <td className="py-2.5 pr-4 text-xs">{formatINR(Number(msg.costAmount))}</td>
                        <td className="max-w-[200px] truncate py-2.5 pr-4 text-xs text-muted-foreground">
                          {msg.failureReason ?? '-'}
                        </td>
                        <td className="py-2.5 text-xs text-muted-foreground">
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

              {/* Pagination */}
              {msgPagination && totalPages > 0 && (
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Page {msgPagination.page} of {totalPages} ({msgPagination.total} total)
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      disabled={messagesPage <= 1}
                      onClick={() => setMessagesPage((p) => p - 1)}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      disabled={messagesPage >= totalPages}
                      onClick={() => setMessagesPage((p) => p + 1)}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  isLink,
  valueClassName,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  isLink?: boolean;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {isLink ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-sm text-primary hover:underline"
          >
            {value}
          </a>
        ) : (
          <p className={cn('text-sm', valueClassName)}>{value}</p>
        )}
      </div>
    </div>
  );
}
