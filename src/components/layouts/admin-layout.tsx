import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LogOut,
  LayoutDashboard,
  FileCheck,
  FileText,
  Users,
  Menu,
  X,
  MessageSquare,
  Handshake,
  Banknote,
  Settings,
  Wallet,
  Target,
  MailX,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ROUTES } from '@/lib/constants';
import { NAV_HELP } from '@/lib/help-copy';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: ROUTES.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard, help: NAV_HELP.dashboard },
  { to: ROUTES.CUSTOMERS, label: 'Customers', icon: Users, help: NAV_HELP.customers },
  { to: ROUTES.MESSAGES, label: 'Number Lookup', icon: MessageSquare, help: NAV_HELP.messages },
  { to: ROUTES.TOPUP, label: 'Manual Top-up', icon: Wallet, help: NAV_HELP.topup },
  { to: ROUTES.KYC_REVIEW, label: 'KYC Reviews', icon: FileCheck, help: NAV_HELP.kyc },
  { to: ROUTES.TEMPLATES, label: 'Templates', icon: FileText, help: NAV_HELP.templates },
] as const;

const AFFILIATE_NAV_ITEMS = [
  { to: ROUTES.AFFILIATE_PARTNERS, label: 'Partners', icon: Handshake, help: NAV_HELP.affiliatePartners },
  { to: ROUTES.AFFILIATE_PAYOUTS, label: 'Payouts', icon: Banknote, help: NAV_HELP.affiliatePayouts },
  { to: ROUTES.AFFILIATE_SETTINGS, label: 'Programme', icon: Settings, help: NAV_HELP.affiliateSettings },
] as const;

const GROWTH_NAV_ITEMS = [
  { to: ROUTES.LEADS, label: 'Leads', icon: Target, help: NAV_HELP.leads },
  { to: ROUTES.LEADS_PIPELINE, label: 'Pipeline', icon: Workflow, help: NAV_HELP.pipeline },
  { to: ROUTES.LEAD_SUPPRESSIONS, label: 'Suppressions', icon: MailX, help: NAV_HELP.suppressions },
] as const;

/**
 * One nav entry, wrapped in a tooltip that says what the screen is for — a
 * new admin can read the sidebar instead of clicking through it. The trigger
 * IS the NavLink (base-ui merges its hover/focus handlers onto it), so
 * keyboard navigation and the active-state styling behave exactly as before.
 */
function SidebarNavItem({
  to,
  label,
  icon: Icon,
  help,
  end = false,
  forceInactive = false,
  onNavigate,
}: {
  to: string;
  label: string;
  icon: LucideIcon;
  help: string;
  end?: boolean;
  /** For nested URLs that are their own view (see the Growth group). */
  forceInactive?: boolean;
  onNavigate: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={(props) => (
          <NavLink
            {...props}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive && !forceInactive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                props.className,
              )
            }
          >
            <Icon className="size-4" />
            {label}
          </NavLink>
        )}
      />
      <TooltipContent
        side="right"
        sideOffset={10}
        className="max-w-56 text-xs leading-relaxed"
      >
        {help}
      </TooltipContent>
    </Tooltip>
  );
}

export function AdminLayout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <SidebarNavItem
              key={item.to}
              {...item}
              end={item.to === ROUTES.DASHBOARD}
              onNavigate={() => setSidebarOpen(false)}
            />
          ))}

          {/* Grouped separately: the affiliate programme is a distinct
              surface with its own money flow, and mixing it into the main
              list makes "Partners" read like another customer segment. */}
          <p className="px-3 pb-1 pt-5 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/40">
            Affiliate
          </p>
          {AFFILIATE_NAV_ITEMS.map((item) => (
            <SidebarNavItem
              key={item.to}
              {...item}
              onNavigate={() => setSidebarOpen(false)}
            />
          ))}

          {/* Grouped separately: acquisition tooling (cold outreach to newly
              registered domains) is a different job from operating existing
              customers, and "Leads" sitting next to "Customers" would read
              like another account list. */}
          <p className="px-3 pb-1 pt-5 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/40">
            Growth
          </p>
          {GROWTH_NAV_ITEMS.map((item) => (
            <SidebarNavItem
              key={item.to}
              {...item}
              // "/leads/suppressions" and "/leads/pipeline" nest under
              // "/leads" in the URL but are their own views; without this two
              // items light up at once.
              forceInactive={
                item.to === ROUTES.LEADS &&
                (pathname.startsWith(ROUTES.LEAD_SUPPRESSIONS) ||
                  pathname.startsWith(ROUTES.LEADS_PIPELINE))
              }
              onNavigate={() => setSidebarOpen(false)}
            />
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
