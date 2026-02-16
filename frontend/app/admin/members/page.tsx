'use client';

import { useState } from 'react';
import MemberTable from '@/components/MemberTable';
import { Search } from 'lucide-react';

export default function MembersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('all');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-3xl font-bold mb-2">Member Management</h2>
        <p className="text-text/70">View and manage all community members</p>
      </div>

      {/* Filters */}
      <div className="bg-background/80 rounded-xl p-4 border border-text/10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text/40" />
            <input
              type="text"
              placeholder="Search by username or wallet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-text/20 rounded-lg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-text"
            />
          </div>

          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="px-4 py-2 bg-background border border-text/20 rounded-lg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200 cursor-pointer text-text"
          >
            <option value="all">All Tiers</option>
            <option value="bronze">Bronze</option>
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
          </select>
        </div>
      </div>

      {/* Member Table */}
      <MemberTable searchQuery={searchQuery} tierFilter={tierFilter} />
    </div>
  );
}
