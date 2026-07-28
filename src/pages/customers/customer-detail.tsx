import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  X,
  History,
  Activity,
  PhoneCall,
  type LucideIcon,
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { enumParam, useUrlFilters } from '@/hooks/useUrlFilters';
import { ADMIN_MESSAGE_STATUS_OPTIONS } from '@/hooks/admin/useAdminCustomerMessages';
import { getApiErrorMessage } from '@/lib/api-error';
import { isoToDatetimeLocalValue } from '@/lib/datetime';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import {
  useAdminUserDetail,
  useAdminCustomerOverview,
  useAdminCustomerMessages,
  useAdminCustomerTransactions,
  useAdminCustomerApiKeys,
  useUpdateAdminUser,
} from '@/hooks/admin';
import type { KycStatus, User } from '@/types';

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

const TRANSACTION_BADGE: Record<string, string> = {
  credit: 'bg-green-100 text-green-700',
  debit: 'bg-red-100 text-red-700',
  refund: 'bg-blue-100 text-blue-700',
};

function formatINR(amount: number | string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(amount));
}

const TAB_OPTIONS = [
  'overview',
  'messages',
  'transactions',
  'api-keys',
] as const;

type TabType = (typeof TAB_OPTIONS)[number];

/** Module-level so `useUrlFilters` can memoise on a stable identity. */
const TAB_SCHEMA = {
  tab: enumParam(TAB_OPTIONS, 'overview'),
} as const;

function CustomerCallTrackingCard({ userId, user }: { userId: string; user: User }) {
  const [callNotesDraft, setCallNotesDraft] = useState(user.adminCallNotes ?? '');
  const [lastCalledDraft, setLastCalledDraft] = useState(
    isoToDatetimeLocalValue(user.adminLastCalledAt),
  );
  const updateCallTracking = useUpdateAdminUser();

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-2">
      <h2 className="mb-4 flex items-center gap-2 font-semibold">
        <PhoneCall className="size-4 text-muted-foreground" />
        Call tracking
      </h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Visible only in the admin panel. Customers do not see these fields.
      </p>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Last called
          </label>
          <input
            type="datetime-local"
            className="h-9 w-full max-w-xs rounded-md border bg-background px-3 text-sm"
            value={lastCalledDraft}
            onChange={(e) => setLastCalledDraft(e.target.value)}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setLastCalledDraft(isoToDatetimeLocalValue(new Date().toISOString()))}
            >
              Set to now
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setLastCalledDraft('')}>
              Clear
            </Button>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Notes</label>
          <textarea
            className="min-h-[100px] w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Call outcome, follow-up, etc."
            value={callNotesDraft}
            onChange={(e) => setCallNotesDraft(e.target.value)}
          />
        </div>
        <Button
          size="sm"
          className="gap-2"
          disabled={updateCallTracking.isPending}
          onClick={() => {
            updateCallTracking.mutate(
              {
                userId,
                payload: {
                  adminCallNotes: callNotesDraft.trim() === '' ? null : callNotesDraft,
                  adminLastCalledAt:
                    lastCalledDraft.trim() === '' ? null : new Date(lastCalledDraft).toISOString(),
                },
              },
              {
                onSuccess: (data) => {
                  toast.success('Call tracking saved');
                  setCallNotesDraft(data.adminCallNotes ?? '');
                  setLastCalledDraft(isoToDatetimeLocalValue(data.adminLastCalledAt));
                },
                onError: (e) => toast.error(getApiErrorMessage(e)),
              },
            );
          }}
        >
          {updateCallTracking.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            'Save call tracking'
          )}
        </Button>
      </div>
    </div>
  );
}

export function CustomerDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  // The open tab lives in the URL too, so a link to a customer can point at
  // their transactions rather than always dropping the reader on Overview.
  const { filters: tabFilters, setFilters: setTabFilters } = useUrlFilters(
    TAB_SCHEMA,
  );
  const activeTab = tabFilters.tab;
  const setActiveTab = (tab: TabType) => setTabFilters({ tab });

  const { data: user, isLoading } = useAdminUserDetail(userId);

  const { data: overview } = useAdminCustomerOverview(userId);

  const messagesQuery = useAdminCustomerMessages({
    userId,
    enabled: activeTab === 'messages',
  });
  const { data: messagesData, isLoading: messagesLoading } = messagesQuery;

  const transactionsQuery = useAdminCustomerTransactions({
    userId,
    enabled: activeTab === 'transactions',
  });
  const { data: transactionsData, isLoading: transactionsLoading } =
    transactionsQuery;

  const apiKeysQuery = useAdminCustomerApiKeys({
    userId,
    enabled: activeTab === 'api-keys',
  });
  const { data: apiKeysData, isLoading: apiKeysLoading } = apiKeysQuery;

  const updateUserStatus = useUpdateAdminUser();

  const statusFilter = messagesQuery.filters.msgStatus;
  const startDate = messagesQuery.filters.msgFrom;
  const endDate = messagesQuery.filters.msgTo;
  const hasFilters = messagesQuery.hasActiveFilters;

  // Uncontrolled until submitted, so a partial phone number does not fire a
  // trigram search per keystroke.
  const [phoneInput, setPhoneInput] = useState(messagesQuery.filters.msgPhone);

  function clearFilters() {
    setPhoneInput('');
    messagesQuery.resetFilters();
  }

  function applyPhoneFilter() {
    messagesQuery.setPhone(phoneInput.trim());
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

  const transactions = transactionsData?.data ?? [];
  const txPagination = transactionsData?.pagination;

  const apiKeys = apiKeysData?.data ?? [];
  const apiKeysPagination = apiKeysData?.pagination;

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

      {/* Overview Stats */}
      {overview && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
          <StatCard icon={Key} label="API Keys" value={overview.apiKeyCount.toString()} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border bg-muted/50 p-1">
        {(
          [
            { id: 'overview', label: 'Overview', icon: UserIcon },
            { id: 'messages', label: 'Messages', icon: MessageSquare },
            { id: 'transactions', label: 'Transactions', icon: History },
            { id: 'api-keys', label: 'API Keys', icon: Key },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <tab.icon className="size-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Profile Information */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 font-semibold">
              <UserIcon className="size-4 text-muted-foreground" />
              Profile Information
            </h2>
            <div className="space-y-3">
              <InfoRow icon={Mail} label="Email" value={user.email} />
              <InfoRow
                icon={Phone}
                label="Mobile"
                value={user.mobileNumber ?? 'Not provided'}
              />
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

          {/* Activity / Last Login */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 font-semibold">
              <Activity className="size-4 text-muted-foreground" />
              Activity & Security
            </h2>
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/30 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                    <Clock className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Last Login</p>
                    <p className="text-sm font-medium">
                      {user.lastLoginAt 
                        ? new Date(user.lastLoginAt).toLocaleString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })
                        : 'Never'
                      }
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="rounded-lg bg-muted/30 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                    <Globe className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Last Login IP</p>
                    <p className="text-sm font-mono">{user.lastLoginIp ?? 'No IP tracked'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Account Details */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
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
                valueClassName={user.hasCompletedOnboarding ? 'text-green-600' : 'text-amber-600'}
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
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 font-semibold">
              <Building2 className="size-4 text-muted-foreground" />
              Business & KYC Details
            </h2>
            <div className="space-y-3">
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
            </div>
          </div>

          <CustomerCallTrackingCard key={user.id} userId={user.id} user={user} />

          {/* Actions */}
          <div className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-2">
            <h2 className="mb-4 font-semibold">Management Actions</h2>
            <div className="flex flex-wrap gap-3">
              <Button
                variant={user.isActive ? 'destructive' : 'default'}
                size="sm"
                className="gap-2"
                disabled={updateUserStatus.isPending}
                onClick={() => {
                  if (!userId) return;
                  updateUserStatus.mutate(
                    { userId, payload: { isActive: !user.isActive } },
                    {
                      onSuccess: (data) => {
                        toast.success(
                          data.isActive
                            ? 'User activated successfully'
                            : 'User suspended successfully',
                        );
                      },
                      onError: (e) => toast.error(getApiErrorMessage(e)),
                    },
                  );
                }}
              >
                {updateUserStatus.isPending ? (
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
                  className="gap-2"
                  onClick={() => navigate(`/kyc-review/${user.id}`)}
                >
                  <FileText className="size-4" />
                  View KYC Details
                </Button>
              )}
            </div>
          </div>

          {user.kycStatus === 'rejected' && user.kycRejectionReason && (
            <div className="rounded-xl border border-red-100 bg-red-50/50 p-5 shadow-sm lg:col-span-2">
              <div className="flex items-center gap-2 text-red-700">
                <XCircle className="size-4" />
                <h3 className="text-sm font-semibold">KYC Rejection Reason</h3>
              </div>
              <p className="mt-2 text-sm text-red-600 leading-relaxed italic">
                "{user.kycRejectionReason}"
              </p>
            </div>
          )}

          {/* Message Trends Graph */}
          {overview?.messagesTrend && overview.messagesTrend.length > 0 && (
            <div className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-2">
              <h2 className="mb-4 flex items-center gap-2 font-semibold">
                <Activity className="size-4 text-muted-foreground" />
                Message Trends (Last 7 Days)
              </h2>
              <div className="h-[250px] w-full pr-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={overview.messagesTrend}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10 }}
                      minTickGap={30}
                      tickFormatter={(val) => new Date(val).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        borderColor: 'hsl(var(--border))',
                        fontSize: '12px',
                        borderRadius: '8px'
                      }}
                      labelFormatter={(val) => new Date(val).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}
                    />
                    <Area
                      type="monotone"
                      name="Total Messages"
                      dataKey="total"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorTotal)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <MessageSquare className="size-4 text-muted-foreground" />
            Message History
          </h2>

          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Status</label>
              <select
                className="h-9 w-32 rounded-md border bg-background px-3 text-xs"
                value={statusFilter}
                onChange={(e) =>
                  messagesQuery.setStatus(
                    e.target.value as (typeof ADMIN_MESSAGE_STATUS_OPTIONS)[number],
                  )
                }
              >
                <option value="all">All Status</option>
                <option value="queued">Queued</option>
                <option value="sent">Sent</option>
                <option value="delivered">Delivered</option>
                <option value="failed">Failed</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Phone</label>
              <input
                type="text"
                placeholder="Ex: +91..."
                className="h-9 w-40 rounded-md border bg-background px-3 text-xs"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                onBlur={applyPhoneFilter}
                onKeyDown={(e) => e.key === 'Enter' && applyPhoneFilter()}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">From Date</label>
              <input
                type="date"
                className="h-9 rounded-md border bg-background px-3 text-xs"
                value={startDate}
                onChange={(e) =>
                  messagesQuery.setDateRange(e.target.value, endDate)
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">To Date</label>
              <input
                type="date"
                className="h-9 rounded-md border bg-background px-3 text-xs"
                value={endDate}
                onChange={(e) =>
                  messagesQuery.setDateRange(startDate, e.target.value)
                }
              />
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-9">
                <X className="mr-2 size-3" />
                Clear Filters
              </Button>
            )}
          </div>

          {messagesLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
              <MessageSquare className="size-8 opacity-20" />
              <p className="text-sm font-medium">No messages found</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                      <th className="px-4 py-2.5 font-semibold">Recipient</th>
                      <th className="px-4 py-2.5 font-semibold">Status</th>
                      <th className="px-4 py-2.5 font-semibold">Provider</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Cost</th>
                      <th className="min-w-[200px] px-4 py-2.5 font-semibold">
                        Failure / status detail
                      </th>
                      <th className="px-4 py-2.5 font-semibold">Sent At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {messages.map((msg) => (
                      <tr key={msg.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-[11px]">{msg.phoneNumber}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2 py-0.5 font-bold uppercase text-[9px]',
                              STATUS_BADGE[msg.status] ?? 'bg-gray-100 text-gray-600',
                            )}
                          >
                            {msg.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{msg.provider}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatINR(msg.costAmount)}</td>
                        <td className="max-w-md px-4 py-3 align-top text-muted-foreground">
                          <p className="whitespace-pre-wrap break-words text-[11px] leading-snug">
                            {msg.failureReason ??
                              msg.providerStatusDescription ??
                              '—'}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 tabular-nums text-muted-foreground">
                          {new Date(msg.createdAt).toLocaleDateString('en-IN')} {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                className="mt-2 border-t pt-3"
                pagination={msgPagination}
                onPageChange={messagesQuery.setPage}
                onLimitChange={messagesQuery.setLimit}
                isLoading={messagesQuery.isPlaceholderData}
                itemLabel="messages"
              />
            </div>
          )}
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <History className="size-4 text-muted-foreground" />
            Wallet Transaction Log
          </h2>

          {transactionsLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
              <History className="size-8 opacity-20" />
              <p className="text-sm font-medium">No transactions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                      <th className="px-4 py-2.5 font-semibold">Description</th>
                      <th className="px-4 py-2.5 font-semibold">Type</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Amount</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Balance After</th>
                      <th className="px-4 py-2.5 font-semibold text-center">Ref</th>
                      <th className="px-4 py-2.5 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{tx.description}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2 py-0.5 font-bold uppercase text-[9px]',
                              TRANSACTION_BADGE[tx.type] ?? 'bg-gray-100 text-gray-600',
                            )}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td className={cn(
                          'px-4 py-3 text-right font-bold tabular-nums',
                          tx.type === 'credit' ? 'text-green-600' : 'text-red-600'
                        )}>
                          {tx.type === 'credit' ? '+' : '-'}{formatINR(tx.amount)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium tabular-nums text-muted-foreground">
                          {formatINR(tx.balanceAfter)}
                        </td>
                        <td className="px-4 py-3 text-center">
                           <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground capitalize">
                             {tx.referenceType ?? 'sys'}
                           </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 tabular-nums text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleDateString('en-IN')} {new Date(tx.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <Pagination
                className="mt-2 border-t pt-3"
                pagination={txPagination}
                onPageChange={transactionsQuery.setPage}
                onLimitChange={transactionsQuery.setLimit}
                isLoading={transactionsQuery.isPlaceholderData}
                itemLabel="transactions"
              />
            </div>
          )}
        </div>
      )}

      {activeTab === 'api-keys' && (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <Key className="size-4 text-muted-foreground" />
            API Key Activity
          </h2>

          {apiKeysLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
              <Key className="size-8 opacity-20" />
              <p className="text-sm font-medium">No active API keys found</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {apiKeys.map((key) => (
                <div key={key.id} className="group relative overflow-hidden rounded-xl border bg-card p-4 transition-all hover:bg-muted/10 hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold flex items-center gap-2">
                        {key.label || 'Unnamed Key'}
                        <span className={cn(
                          "size-2 rounded-full",
                          key.isActive ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-400"
                        )} />
                      </h3>
                      <p className="font-mono text-[11px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded w-fit">
                        {key.keyPrefix}••••••••••••
                      </p>
                    </div>
                    <div className="text-right text-[10px] text-muted-foreground">
                      <p>Created: {new Date(key.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-muted/40 p-2 text-center">
                      <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-tight">Last Used</p>
                      <p className="mt-0.5 text-[11px] font-medium">
                        {key.lastUsedAt 
                          ? new Date(key.lastUsedAt).toLocaleDateString('en-IN', { 
                              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                            })
                          : 'Never'
                        }
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-2 text-center">
                      <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-tight">IP Restrictions</p>
                      <p className="mt-0.5 text-[11px] font-medium">
                        {key.allowedIps && key.allowedIps.length > 0
                          ? `${key.allowedIps.length} IPs Restricted`
                          : 'Publicly Accessible'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Pagination
            className="mt-4 border-t pt-3"
            pagination={apiKeysPagination}
            onPageChange={apiKeysQuery.setPage}
            onLimitChange={apiKeysQuery.setLimit}
            isLoading={apiKeysQuery.isPlaceholderData}
            itemLabel="API keys"
          />
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-3.5" />
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
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
  icon: LucideIcon;
  label: string;
  value: string;
  isLink?: boolean;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-tight">{label}</p>
        {isLink ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-sm text-primary hover:underline font-medium"
          >
            {value}
          </a>
        ) : (
          <p className={cn('text-sm font-medium', valueClassName)}>{value}</p>
        )}
      </div>
    </div>
  );
}

