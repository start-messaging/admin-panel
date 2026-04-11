import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LogOut,
  LayoutDashboard,
  FileCheck,
  FileText,
  Users,
  Menu,
  X,
  MessageSquare,
  Wallet,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getSmsWallet } from '@/apis/admin.api';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: ROUTES.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { to: ROUTES.CUSTOMERS, label: 'Customers', icon: Users },
  { to: ROUTES.KYC_REVIEW, label: 'KYC Reviews', icon: FileCheck },
  { to: ROUTES.TEMPLATES, label: 'Templates', icon: FileText },
] as const;

export function AdminLayout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: smsWallet } = useQuery({
    queryKey: ['admin', 'sms-wallet'],
    queryFn: getSmsWallet,
    refetchInterval: 5 * 60 * 1000,
  });

  const formattedBalance = smsWallet
    ? `₹${Number(smsWallet.balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—';

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col overflow-y-auto border-r bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Brand */}
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <MessageSquare className="size-4" />
            </div>
            <span className="text-sm font-semibold">StartMessaging</span>
          </div>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="size-5" />
          </button>
        </div>

        {/* SMS Wallet balance */}
        <div className="border-b border-sidebar-border px-3 py-3">
          <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/60 px-3 py-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100">
              <Wallet className="size-4 text-emerald-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/50">
                SMS Balance
              </p>
              <p className="text-sm font-bold">{formattedBalance}</p>
            </div>
            {smsWallet && (
              <span className="text-[10px] text-sidebar-foreground/50">
                {smsWallet.smsCount} left
              </span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === ROUTES.DASHBOARD}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                )
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-sidebar-border p-3">
          <div className="mb-2 flex items-center gap-3 px-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/60">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 px-3 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            onClick={() => {
              if (window.confirm('Are you sure you want to sign out?')) {
                logout();
              }
            }}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main content — min-w-0 so wide tables scroll inside the viewport instead of clipping (flex default min-width: auto) */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex h-14 items-center border-b px-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="size-5" />
          </button>
          <span className="ml-3 text-sm font-semibold">StartMessaging</span>
          {smsWallet && (
            <span className="ml-auto text-sm font-semibold text-emerald-600">
              {formattedBalance}
            </span>
          )}
        </header>

        <main className="min-h-0 min-w-0 flex-1 overflow-auto p-4 sm:p-6">
          <div className="mx-auto w-full min-w-0 max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
