'use client';

import { useState, useEffect, Component, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { LogOut, Menu, AlertTriangle } from 'lucide-react';
import { getAdminGroups } from '@/lib/api';

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="mx-auto w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
            <h2 className="font-heading text-xl font-bold text-text mb-2">
              Something went wrong
            </h2>
            <p className="text-text/70 mb-4">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
              className="cursor-pointer px-6 py-2 bg-primary hover:bg-primary/90 text-background font-semibold rounded-lg transition-all duration-200"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token && pathname !== '/admin/login' && pathname !== '/admin/register') {
      router.push('/admin/login');
    } else if (token) {
      setIsAuthenticated(true);

      // Fetch groups if not cached
      const cachedGroups = localStorage.getItem('admin_groups');
      if (!cachedGroups) {
        getAdminGroups()
          .then(data => {
            if (data.groups && data.groups.length > 0) {
              localStorage.setItem('admin_groups', JSON.stringify(data.groups));
              if (!localStorage.getItem('admin_active_group')) {
                localStorage.setItem('admin_active_group', data.groups[0].id);
              }
            }
          })
          .catch(() => { /* ignore - user may need to re-login */ });
      }
    }
  }, [pathname, router]);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_groups');
    localStorage.removeItem('admin_active_group');
    localStorage.removeItem('admin_group_id');
    router.push('/admin/login');
  };

  if (pathname === '/admin/login' || pathname === '/admin/register') {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-text/70">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile top header */}
      <header className="md:hidden bg-background/80 border-b border-text/10 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation menu"
          className="cursor-pointer p-2 text-text/70 hover:text-text transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="font-heading text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Alpha Groups
        </h1>
        <div className="w-9" />
      </header>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/60"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar: mobile = fixed overlay, desktop = static in flex */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-200 md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop header */}
        <header className="hidden md:block bg-background/80 border-b border-text/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="font-heading text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <button
              onClick={handleLogout}
              className="cursor-pointer flex items-center px-4 py-2 text-text/70 hover:text-text border border-text/20 hover:border-text/40 rounded-lg transition-all duration-200"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
