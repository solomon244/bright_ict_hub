import type { ReactNode } from 'react';
import DashboardSidebar from '../components/navigation/DashboardSidebar';
import Navbar from '../components/navigation/Navbar';

interface DashboardLayoutProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

const DashboardLayout = ({ title, subtitle, actions, children }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex gap-6">
          <DashboardSidebar />
          <section className="flex-1 space-y-6">
            <header className="glass-panel flex flex-col items-start justify-between gap-4 rounded-3xl border border-white/40 bg-white/80 p-6 backdrop-blur-3xl md:flex-row md:items-center">
              <div>
                <h1 className="text-2xl font-display font-semibold text-stone-900">{title}</h1>
                {subtitle && <p className="text-sm text-stone-500">{subtitle}</p>}
              </div>
              {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
            </header>
            {children}
          </section>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;


