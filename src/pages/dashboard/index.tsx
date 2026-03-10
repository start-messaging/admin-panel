import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  MessageSquare,
  IndianRupee,
  Clock,
  Loader2,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { getDashboardStats } from '@/apis/admin.api';
import { ROUTES } from '@/lib/constants';

export function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: getDashboardStats,
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const cards = [
    {
      label: 'Total Users',
      value: (stats?.totalUsers ?? 0).toLocaleString('en-IN'),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
    },
    {
      label: 'Active Users',
      value: (stats?.activeUsers ?? 0).toLocaleString('en-IN'),
      icon: UserCheck,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      iconBg: 'bg-emerald-100',
    },
    {
      label: 'Messages Sent',
      value: (stats?.totalMessages ?? 0).toLocaleString('en-IN'),
      icon: MessageSquare,
      color: 'text-violet-600',
      bgColor: 'bg-violet-50',
      iconBg: 'bg-violet-100',
    },
    {
      label: 'Total Revenue',
      value: `₹${(stats?.totalRevenue ?? 0).toLocaleString('en-IN')}`,
      icon: IndianRupee,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      iconBg: 'bg-amber-100',
    },
  ];

  const pendingKyc = stats?.pendingKycCount ?? 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform overview and key metrics
        </p>
      </div>

      {/* Analytics cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, color, iconBg }) => (
          <div
            key={label}
            className="rounded-xl border bg-card p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <div
                className={`flex size-10 items-center justify-center rounded-lg ${iconBg}`}
              >
                <Icon className={`size-5 ${color}`} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Pending KYC */}
        <Link
          to={ROUTES.KYC_REVIEW}
          className="group rounded-xl border bg-card p-5 transition-colors hover:bg-muted/50"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-orange-100">
                <Clock className="size-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending KYC</p>
                <p className="text-2xl font-bold">{pendingKyc}</p>
              </div>
            </div>
            <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
          {pendingKyc > 0 && (
            <p className="mt-3 text-xs text-orange-600">
              {pendingKyc} submission{pendingKyc !== 1 ? 's' : ''} awaiting review
            </p>
          )}
        </Link>

        {/* View Customers */}
        <Link
          to={ROUTES.CUSTOMERS}
          className="group rounded-xl border bg-card p-5 transition-colors hover:bg-muted/50"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100">
                <Users className="size-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Customers</p>
                <p className="text-sm text-muted-foreground">Manage all users</p>
              </div>
            </div>
            <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </Link>

        {/* Platform health */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100">
              <TrendingUp className="size-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Platform Health</p>
              <p className="text-sm font-medium text-emerald-600">All systems operational</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
