import { Outlet, Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';

export function AuthLayout() {
  return (
    <div className="flex min-h-screen">
      {/* Left Side: Branding & Info */}
      <div className="hidden w-1/2 flex-col justify-between bg-blue-950 p-12 lg:flex relative overflow-hidden">
        {/*
          Gradient only. This carried an <img> pointing at an illustration that
          is not in the repo, behind an onError that hid it — so it never
          rendered, and every sign-in load spent a request fetching the SPA
          shell that the 404 handler returns in its place. Drop in a real asset
          here if one is ever produced.
        */}
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-950 via-blue-950/80 to-transparent" />
        </div>

        <div className="relative z-10 flex items-center gap-2 text-xl font-bold text-white">
          <ShieldCheck className="h-8 w-8 text-primary" stroke='white' />
          <span>StartMessaging Admin</span>
        </div>

        <div className="relative z-10 space-y-6">
          <h2 className="text-4xl font-bold leading-tight text-white">
            Administrative Control <br />
            & Platform Governance.
          </h2>
          
          <ul className="space-y-4">
            {[
              'Comprehensive user and affiliate management',
              'KYC review & approval workflows',
              'Real-time transaction monitoring',
              'System-wide metrics and performance logs',
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-zinc-400">
                <CheckCircle2 className="h-5 w-5 text-primary" stroke='white' />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-sm text-zinc-500">
          <span>© 2026 StartMessaging Inc.</span>
          <Link to="#" className="hover:text-zinc-300">Privacy Policy</Link>
          <Link to="#" className="hover:text-zinc-300">Terms of Service</Link>
        </div>
      </div>

      {/* Right Side: Auth Form */}
      <div className="flex w-full items-center justify-center px-6 lg:w-1/2 bg-background">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="flex items-center gap-2 text-xl font-bold">
              <ShieldCheck className="h-7 w-7 text-primary" stroke='blue' />
              <span className='text-blue-950 dark:text-white'>StartMessaging Admin</span>
            </div>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
