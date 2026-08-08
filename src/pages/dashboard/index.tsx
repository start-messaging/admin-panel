import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { TagChip } from '@/components/tags/tag-chip';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  MessageSquare,
  IndianRupee,
  CreditCard,
  Clock,
  Loader2,
  ArrowUpRight,
  TrendingUp,
  Activity,
  CalendarDays,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { getDashboardStats, getAdminDailyUsage } from '@/apis/admin.api';
import { Pagination } from '@/components/ui/pagination';
import { adminQueryKeys } from '@/hooks/admin';
import {
  numberParam,
  stringParam,
  useUrlFilters,
} from '@/hooks/useUrlFilters';
import { ROUTES } from '@/lib/constants';

/** Module-level so `useUrlFilters` can memoise on a stable identity. */
const DAILY_USAGE_SCHEMA = {
  date: stringParam(''),
  usagePage: numberParam(1),
  usageLimit: numberParam(20),
  usageSearch: stringParam(''),
} as const;

export function DashboardPage() {
  const navigate = useNavigate();

  const {
    filters: usageFilters,
    setFilters: setUsageFilters,
  } = useUrlFilters(DAILY_USAGE_SCHEMA, { pageKey: 'usagePage' });

  // Defaults to today, but an empty value must stay empty so the server can
  // apply its own IST "today" rather than the browser's notion of it.
  const selectedDate =
    usageFilters.date || new Date().toISOString().split('T')[0];

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: getDashboardStats,
  });

  const usageQuery = useQuery({
    queryKey: adminQueryKeys.dailyUsage({ ...usageFilters, date: selectedDate }),
    queryFn: () =>
      getAdminDailyUsage({
        date: selectedDate,
        page: usageFilters.usagePage,
        limit: usageFilters.usageLimit,
        search: usageFilters.usageSearch || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const dailyUsage = usageQuery.data?.data ?? [];
  const usagePagination = usageQuery.data?.pagination;
  const dailyUsageLoading = usageQuery.isLoading;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const overview = stats?.overview;
  const growth = stats?.growth;
  const performance = stats?.performance;
  const trends = stats?.trends;

  const cards = [
    {
      label: 'Total Customers',
      value: (overview?.totalUsers ?? 0).toLocaleString('en-IN'),
      description: `${growth?.newUsersToday ?? 0} new today`,
      icon: Users,
      color: 'text-blue-600',
      iconBg: 'bg-blue-100',
    },
    {
      label: 'Active Customers',
      value: (overview?.activeUsers ?? 0).toLocaleString('en-IN'),
      description: `${growth?.newUsersThisWeek ?? 0} this week`,
      icon: UserCheck,
      color: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
    },
    {
      label: 'Total Messages',
      value: (overview?.totalMessages ?? 0).toLocaleString('en-IN'),
      description: `${performance?.messagesToday ?? 0} sent today`,
      icon: MessageSquare,
      color: 'text-violet-600',
      iconBg: 'bg-violet-100',
    },
    {
      label: 'Platform Revenue',
      value: `₹${(overview?.totalRevenue ?? 0).toLocaleString('en-IN')}`,
      description: `₹${(performance?.revenueToday ?? 0).toLocaleString('en-IN')} today`,
      icon: IndianRupee,
      color: 'text-amber-600',
      iconBg: 'bg-amber-100',
    },
    {
      label: 'Payments via Razorpay',
      value: `₹${(overview?.razorpayPaymentsTotal ?? 0).toLocaleString('en-IN')}`,
      description: `₹${(overview?.razorpayPaymentsToday ?? 0).toLocaleString('en-IN')} today · ${(overview?.razorpayPaymentsCount ?? 0).toLocaleString('en-IN')} completed`,
      icon: CreditCard,
      color: 'text-sky-600',
      iconBg: 'bg-sky-100',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Overview</h1>
          <p className="text-sm text-muted-foreground">
            Platform-wide analytics and real-time monitoring
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-1 text-sm font-medium">
          <Activity className="size-4 text-emerald-600" />
          <span>Systems Operational</span>
        </div>
      </div>

      {/* Analytics cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map(({ label, value, description, icon: Icon, color, iconBg }) => (
          <div key={label} className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <div className={`flex size-9 items-center justify-center rounded-lg ${iconBg}`}>
                <Icon className={`size-5 ${color}`} />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold tracking-tight">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Performance & Trends */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Main Chart */}
        <div className="rounded-xl border bg-card p-6 lg:col-span-4">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Message Volume</h3>
              <p className="text-sm text-muted-foreground">Traffic patterns for the last 7 days</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <div className="size-2 rounded-full bg-violet-600" />
                <span>Delivered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-2 rounded-full bg-red-500" />
                <span>Failed</span>
              </div>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends?.messages}>
                <defs>
                  <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  fontSize={12}
                  tickFormatter={(val) => new Date(val).toLocaleDateString('en-IN', { weekday: 'short' })}
                  dy={10}
                />
                <YAxis axisLine={false} tickLine={false} fontSize={12} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                />
                <Area
                  type="monotone"
                  dataKey="delivered"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorDelivered)"
                />
                <Area type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance Sidebar */}
        <div className="space-y-6 lg:col-span-3">
          <div className="rounded-xl border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Platform Health
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Overall Success Rate</span>
                  <span className="text-sm font-bold text-emerald-600">
                    {performance?.successRate.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${performance?.successRate}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="rounded-lg bg-orange-50 p-3">
                  <p className="text-xs font-semibold text-orange-600">PENDING KYC</p>
                  <p className="mt-1 text-xl font-bold text-orange-900">
                    {overview?.pendingKycCount}
                  </p>
                </div>
                <div className="rounded-lg bg-red-50 p-3">
                  <p className="text-xs font-semibold text-red-600">FAILED TODAY</p>
                  <p className="mt-1 text-xl font-bold text-red-900">
                    {performance?.failedMessages}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Revenue Growth
            </h3>
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends?.revenue}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    fontSize={10}
                    tickFormatter={(val) => new Date(val).toLocaleDateString('en-IN', { day: 'numeric' })}
                  />
                  <YAxis axisLine={false} tickLine={false} fontSize={10} hide />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Bar dataKey="revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Weekly billing activity</span>
              <div className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                <TrendingUp className="size-3" />
                <span>+{((performance?.revenueToday ?? 0) / (overview?.totalRevenue ?? 1) * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border bg-card p-6">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold">User Daily Usage Breakdown</h3>
              <p className="text-sm text-muted-foreground">Detailed message consumption per user</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="search"
                placeholder="Filter customers…"
                value={usageFilters.usageSearch}
                onChange={(e) =>
                  setUsageFilters(
                    { usageSearch: e.target.value },
                    { replace: true },
                  )
                }
                className="h-9 w-full rounded-md border bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary sm:w-52"
              />
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-muted-foreground" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setUsageFilters({ date: e.target.value })}
                  className="h-9 rounded-md border bg-background px-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Customer Details</th>
                  <th className="px-4 py-3 font-medium text-right">Total Msgs</th>
                  <th className="px-4 py-3 font-medium text-right">Delivered</th>
                  <th className="px-4 py-3 font-medium text-right">Failed</th>
                  <th className="px-4 py-3 font-medium text-right">Total Spent</th>
                </tr>
              </thead>
              <tbody>
                {dailyUsageLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      <Loader2 className="mx-auto size-5 animate-spin" />
                    </td>
                  </tr>
                ) : dailyUsage.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No usage data found for this date.
                    </td>
                  </tr>
                ) : (
                  dailyUsage.map((row) => (
                    <tr 
                      key={row.user.id} 
                      className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => navigate(`/customers/${row.user.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">
                          {row.user.firstName} {row.user.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {row.user.email}
                        </div>
                        {row.user.businessName && (
                          <div className="mt-0.5 w-fit rounded bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {row.user.businessName}
                          </div>
                        )}
                        {/* Who this account is, next to what it sent — the
                            breakdown is where usage is reviewed, so the
                            labels belong here rather than a click away. */}
                        {((row.tags?.length ?? 0) > 0 ||
                          (row.derivedTags?.length ?? 0) > 0) && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {row.tags?.map((t) => (
                              <TagChip
                                key={t.id}
                                label={t.name}
                                colour={t.colour}
                                title={t.description ?? undefined}
                              />
                            ))}
                            {row.derivedTags?.map((d) => (
                              <TagChip
                                key={d.key}
                                label={d.label}
                                colour={d.colour}
                                derived
                                title="Calculated automatically"
                              />
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">{row.totalMessages.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-emerald-600 font-medium">{row.deliveredCount.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-red-600 font-medium">{row.failedCount.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold">₹{row.totalSpent.toLocaleString('en-IN')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            className="mt-4"
            pagination={usagePagination}
            onPageChange={(usagePage) =>
              setUsageFilters({ usagePage }, { keepPage: true })
            }
            onLimitChange={(usageLimit) => setUsageFilters({ usageLimit })}
            isLoading={usageQuery.isPlaceholderData}
            itemLabel="customers"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to={ROUTES.KYC_REVIEW}
          className="group flex flex-col justify-between rounded-xl border bg-card p-5 transition-all hover:border-orange-200 hover:bg-orange-50/50"
        >
          <div className="flex items-start justify-between">
            <div className="flex size-10 items-center justify-center rounded-lg bg-orange-100 ring-4 ring-orange-50">
              <Clock className="size-5 text-orange-600" />
            </div>
            <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
          <div className="mt-8">
            <h4 className="font-semibold">KYC Queue</h4>
            <p className="text-xs text-muted-foreground">
              {overview?.pendingKycCount} submissions awaiting approval
            </p>
          </div>
        </Link>

        <Link
          to={ROUTES.CUSTOMERS}
          className="group flex flex-col justify-between rounded-xl border bg-card p-5 transition-all hover:border-blue-200 hover:bg-blue-50/50"
        >
          <div className="flex items-start justify-between">
            <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100 ring-4 ring-blue-50">
              <Users className="size-5 text-blue-600" />
            </div>
            <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
          <div className="mt-8">
            <h4 className="font-semibold">User Directory</h4>
            <p className="text-xs text-muted-foreground">Manage and track all platform customers</p>
          </div>
        </Link>

        <div className="flex flex-col justify-between rounded-xl border bg-card p-5">
          <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 ring-4 ring-emerald-50">
            <TrendingUp className="size-5 text-emerald-600" />
          </div>
          <div className="mt-8">
            <h4 className="font-semibold">Active Monitoring</h4>
            <div className="mt-1 flex items-center gap-2">
              <div className="size-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-xs text-emerald-600 font-medium">Real-time stats active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
