'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, Settings, BarChart3, ClipboardList, X } from 'lucide-react';
import GroupSelector from './GroupSelector';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Members', href: '/admin/members', icon: Users },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Activity Log', href: '/admin/activity', icon: ClipboardList },
];

interface GroupInfo {
  id: string;
  name: string;
  member_count: number;
}

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [activeGroupId, setActiveGroupId] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('admin_groups');
    if (stored) {
      try {
        setGroups(JSON.parse(stored));
      } catch { /* ignore */ }
    }
    const activeId = localStorage.getItem('admin_active_group') || localStorage.getItem('admin_group_id') || '';
    setActiveGroupId(activeId);
  }, []);

  function handleGroupChange(groupId: string) {
    setActiveGroupId(groupId);
    localStorage.setItem('admin_active_group', groupId);
    // Refetch data for new group via Next.js router
    router.refresh();
  }

  return (
    <div className="w-64 h-full bg-background/60 border-r border-text/10 p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Alpha Groups
          </h2>
          <p className="text-text/50 text-sm mt-1">Admin Panel</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden cursor-pointer p-1 text-text/50 hover:text-text transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {groups.length > 1 && (
        <GroupSelector
          groups={groups}
          activeGroupId={activeGroupId}
          onGroupChange={handleGroupChange}
        />
      )}

      {groups.length === 1 && (
        <div className="mb-6 px-3 py-2 rounded-lg border border-text/10 bg-background/40">
          <div className="flex items-center">
            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mr-2.5" />
            <span className="text-sm font-medium text-text truncate">{groups[0].name}</span>
          </div>
        </div>
      )}

      <nav className="space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => onClose?.()}
              className={`cursor-pointer flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-text/70 hover:bg-text/5 hover:text-text border border-transparent'
              }`}
            >
              <Icon className="h-5 w-5 mr-3" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
