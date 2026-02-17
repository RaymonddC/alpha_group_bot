'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Users } from 'lucide-react';

interface GroupInfo {
  id: string;
  name: string;
  member_count: number;
}

interface GroupSelectorProps {
  groups: GroupInfo[];
  activeGroupId: string;
  onGroupChange: (groupId: string) => void;
}

export default function GroupSelector({ groups, activeGroupId, onGroupChange }: GroupSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const activeGroup = groups.find(g => g.id === activeGroupId) || groups[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (groups.length === 0) return null;

  return (
    <div ref={ref} className="relative mb-6">
      <button
        onClick={() => setOpen(!open)}
        className="cursor-pointer w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-text/10 hover:border-primary/30 bg-background/40 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <div className="flex items-center min-w-0">
          <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mr-2.5" />
          <span className="text-sm font-medium text-text truncate">{activeGroup?.name}</span>
        </div>
        <div className="flex items-center flex-shrink-0 ml-2">
          <span className="text-xs text-text/50 mr-2">{activeGroup?.member_count}</span>
          <ChevronDown
            className={`h-4 w-4 text-text/50 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-text/10 bg-background shadow-lg overflow-hidden animate-in fade-in duration-150">
          {groups.map(group => {
            const isActive = group.id === activeGroupId;
            return (
              <button
                key={group.id}
                onClick={() => {
                  onGroupChange(group.id);
                  setOpen(false);
                }}
                className={`cursor-pointer w-full flex items-center justify-between px-3 py-2.5 text-left transition-all duration-200 ${
                  isActive
                    ? 'bg-primary/10 border-l-2 border-l-primary'
                    : 'hover:bg-text/5 border-l-2 border-l-transparent'
                }`}
              >
                <span className={`text-sm truncate ${isActive ? 'text-primary font-medium' : 'text-text/80'}`}>
                  {group.name}
                </span>
                <div className="flex items-center flex-shrink-0 ml-2">
                  <Users className="h-3 w-3 text-text/40 mr-1" />
                  <span className="text-xs text-text/50">{group.member_count}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
