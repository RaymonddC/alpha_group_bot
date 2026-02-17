'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { LogOut } from 'lucide-react';
import { getAdminGroups } from '@/lib/api';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-background/80 border-b border-text/10 px-6 py-4">
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
          {children}
        </main>
      </div>
    </div>
  );
}
